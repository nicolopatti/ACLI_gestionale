"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { iscrizioneSchema } from "@/lib/validations/iscrizione";
import {
  createIscrizione,
  deleteIscrizione,
  getIscrizione,
  updateIscrizione,
} from "@/lib/db/iscrizioni";
import {
  createMesi,
  deleteMesiByIscrizione,
  deleteRateByTipoRiga,
  deleteRateBySessioneEIscrizione,
  hasAnyRataPagata,
  hasRataPagataForSessione,
  listMesiByIscrizione,
} from "@/lib/db/mesi";
import { getAttivita } from "@/lib/db/attivita";
import { listSessioni } from "@/lib/db/sessioni";
import { getModalita } from "@/lib/db/modalita-iscrizione";
import { getScontiByIds } from "@/lib/db/sconti-attivita";
import { logAudit } from "@/lib/db/audit-log";
import type { FasciaOraria, GiornoSettimana } from "@/lib/config";
import { BusinessError, userErrorMessage } from "@/lib/errors";
import type {
  Attivita,
  ModalitaIscrizione,
  ScontoAttivita,
  Sessione,
} from "@/lib/db/types";

// Iscrizioni (CRUD + gestione rate): admin + coordinatore_educativo. L'account
// operativo dell'associazione e' un coordinatore e gestisce le iscrizioni
// end-to-end (pagamenti inclusi, vedi mesi.ts). Coerente con /spese-edu.
async function requireEduOrAdmin() {
  const session = await auth();
  const ruolo = session?.user?.ruolo;
  if (ruolo !== "admin" && ruolo !== "coordinatore_educativo") {
    throw new BusinessError("Non autorizzato");
  }
  return session!;
}

function parseIscrizioneForm(formData: FormData) {
  return {
    bambinoId: formData.get("bambinoId"),
    attivitaId: formData.get("attivitaId"),
    modalitaId: formData.get("modalitaId"),
    dataIscrizione: formData.get("dataIscrizione"),
    sessioniSelteIds: formData.getAll("sessioniSelteIds").map(String),
    giorniSettimana: formData.getAll("giorniSettimana") as GiornoSettimana[],
    fasceOrarie: formData.getAll("fasceOrarie") as FasciaOraria[],
    applicaQuotaIscrizione:
      formData.get("applicaQuotaIscrizione") === "on" ||
      formData.get("applicaQuotaIscrizione") === "true",
    scontiIds: formData.getAll("scontiIds").map(String),
    note: formData.get("note"),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type RataDaCreare = Parameters<typeof createMesi>[0][number];

/**
 * Calcola la lista di rate (sessione + pacchetto + quota_iscrizione + sconti)
 * per una iscrizione, in base a:
 *  - policy della modalita (flat vs per_sessione)
 *  - se applicare la quota iscrizione (e se l'attivita ne ha una)
 *  - sconti selezionati (con calcolo per percentuale o valore fisso)
 *
 * Convenzioni rate:
 *  - tipo_riga="sessione": una per ciascuna sessione scelta, importo=modalita.importo
 *  - tipo_riga="pacchetto": una sola, sessione_id=NULL, importo=modalita.importo
 *  - tipo_riga="quota_iscrizione": una sola, sessione_id=NULL, importo=attivita.quotaIscrizione
 *  - tipo_riga="sconto": una per ciascun sconto applicato, importo NEGATIVO
 *
 * La base imponibile per gli sconti percentuali e': subtotale modalita +
 * quota iscrizione (se applicata). NON include altri sconti.
 */
function costruisciRate(
  iscrizioneId: string,
  attivita: Attivita,
  modalita: ModalitaIscrizione,
  sessioniScelte: Sessione[],
  applicaQuota: boolean,
  scontiApplicati: ScontoAttivita[],
): RataDaCreare[] {
  const rate: RataDaCreare[] = [];

  // 1. Prezzo modalita.
  let subtotaleModalita: number;
  if (modalita.tipoPrezzo === "flat") {
    subtotaleModalita = modalita.importo;
    rate.push({
      iscrizioneId,
      importoDovuto: modalita.importo,
      tipoRiga: "pacchetto",
      descrizioneRiga: `Pacchetto: ${modalita.nome}`,
    });
  } else {
    // per_sessione: una rata per ogni sessione scelta.
    subtotaleModalita = round2(modalita.importo * sessioniScelte.length);
    for (const s of sessioniScelte) {
      rate.push({
        iscrizioneId,
        sessioneId: s.recordId,
        tipoUnita: s.tipoUnita,
        chiavePeriodo: s.chiave,
        importoDovuto: modalita.importo,
        tipoRiga: "sessione",
        meseAnno: s.tipoUnita === "mese" ? s.chiave : undefined,
      });
    }
  }

  // 2. Quota iscrizione (se applicata e configurata sull'attivita).
  const quotaApplicata =
    applicaQuota && attivita.quotaIscrizione != null
      ? attivita.quotaIscrizione
      : 0;
  if (quotaApplicata > 0) {
    rate.push({
      iscrizioneId,
      importoDovuto: quotaApplicata,
      tipoRiga: "quota_iscrizione",
      descrizioneRiga: "Quota iscrizione",
    });
  }

  // 3. Sconti applicati come righe negative.
  // Base imponibile per le percentuali = subtotaleModalita + quotaApplicata.
  const imponibileSconto = subtotaleModalita + quotaApplicata;
  for (const sc of scontiApplicati) {
    let importoSconto: number;
    if (sc.tipo === "percentuale") {
      importoSconto = round2((imponibileSconto * sc.valore) / 100);
    } else {
      importoSconto = round2(sc.valore);
    }
    if (importoSconto <= 0) continue;
    rate.push({
      iscrizioneId,
      importoDovuto: -importoSconto,
      tipoRiga: "sconto",
      descrizioneRiga: `Sconto: ${sc.nome}`,
    });
  }

  return rate;
}

export async function createIscrizioneAction(_prev: unknown, formData: FormData) {
  let actor;
  try {
    actor = await requireEduOrAdmin();
  } catch (e) {
    console.error("[createIscrizioneAction]", e);
    return { error: userErrorMessage(e, "Non autorizzato") };
  }

  const parsed = iscrizioneSchema.safeParse(parseIscrizioneForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;

  const [attivita, modalita] = await Promise.all([
    getAttivita(d.attivitaId),
    getModalita(d.modalitaId),
  ]);
  if (!attivita) return { error: "Attività non trovata" };
  if (!modalita || modalita.attivitaId !== d.attivitaId) {
    return { error: "Modalità di iscrizione non valida per questa attività" };
  }

  if (attivita.tipo === "doposcuola") {
    if (d.giorniSettimana.length === 0) {
      return { error: "Seleziona almeno un giorno settimana per il doposcuola" };
    }
    if (d.fasceOrarie.length === 0) {
      return { error: "Seleziona almeno una fascia oraria per il doposcuola" };
    }
  }

  const sessioni = await listSessioni({ recordIds: d.sessioniSelteIds });
  if (sessioni.length !== d.sessioniSelteIds.length) {
    return { error: "Una o più sessioni non sono valide" };
  }

  // Sconti: tutti gli id devono esistere, appartenere alla stessa attivita
  // e essere ancora attivi.
  const scontiApplicati = d.scontiIds.length > 0
    ? await getScontiByIds(d.scontiIds)
    : [];
  if (scontiApplicati.length !== d.scontiIds.length) {
    return { error: "Uno o più sconti non sono validi" };
  }
  for (const sc of scontiApplicati) {
    if (sc.attivitaId !== d.attivitaId || !sc.attivo) {
      return { error: `Sconto "${sc.nome}" non disponibile per questa attività` };
    }
  }

  // Se l'attivita non ha quotaIscrizione configurata, il flag e' ignorato.
  const applicaQuota = d.applicaQuotaIscrizione && attivita.quotaIscrizione != null;

  let iscrId: string;
  try {
    const iscr = await createIscrizione({
      bambinoId: d.bambinoId,
      attivitaId: d.attivitaId,
      modalitaId: d.modalitaId,
      dataIscrizione: d.dataIscrizione || undefined,
      giorniSettimana: attivita.tipo === "doposcuola" ? d.giorniSettimana : [],
      fasceOrarie: attivita.tipo === "doposcuola" ? d.fasceOrarie : [],
      sessioniSelteIds: d.sessioniSelteIds,
      scontiIds: d.scontiIds,
      note: d.note || undefined,
    });
    iscrId = iscr.recordId;

    const rate = costruisciRate(
      iscrId,
      attivita,
      modalita,
      sessioni,
      applicaQuota,
      scontiApplicati,
    );
    if (rate.length > 0) await createMesi(rate);

    await logAudit({
      userId: actor.user?.recordId,
      userEmail: actor.user?.email,
      action: "iscrizione.create",
      entityType: "iscrizione",
      entityId: iscrId,
      diff: {
        bambinoId: d.bambinoId,
        attivitaId: d.attivitaId,
        modalitaId: d.modalitaId,
        tipoPrezzo: modalita.tipoPrezzo,
        sessioniCount: sessioni.length,
        quotaApplicata: applicaQuota ? attivita.quotaIscrizione ?? 0 : 0,
        scontiIds: d.scontiIds,
      },
    });
  } catch (e) {
    console.error("[createIscrizioneAction]", e);
    return { error: userErrorMessage(e, "Errore durante il salvataggio") };
  }

  revalidatePath("/iscrizioni");
  revalidatePath(`/iscrizioni/attivita/${d.attivitaId}`);
  revalidatePath(`/bambini/${d.bambinoId}`);
  revalidatePath(`/attivita/${d.attivitaId}`);
  redirect(`/iscrizioni/${iscrId}`);
}

export async function updateIscrizioneAction(
  recordId: string,
  _prev: unknown,
  formData: FormData,
) {
  let actor;
  try {
    actor = await requireEduOrAdmin();
  } catch (e) {
    console.error("[updateIscrizioneAction]", e);
    return { error: userErrorMessage(e, "Non autorizzato") };
  }
  const parsed = iscrizioneSchema.safeParse(parseIscrizioneForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }
  const d = parsed.data;

  const existing = await getIscrizione(recordId);
  if (!existing) return { error: "Iscrizione non trovata" };

  const [attivita, modalita, existingModalita] = await Promise.all([
    getAttivita(d.attivitaId),
    getModalita(d.modalitaId),
    getModalita(existing.modalitaId),
  ]);
  if (!attivita) return { error: "Attività non trovata" };
  if (!modalita || modalita.attivitaId !== d.attivitaId) {
    return { error: "Modalità di iscrizione non valida per questa attività" };
  }

  if (attivita.tipo === "doposcuola") {
    if (d.giorniSettimana.length === 0) {
      return { error: "Seleziona almeno un giorno settimana per il doposcuola" };
    }
    if (d.fasceOrarie.length === 0) {
      return { error: "Seleziona almeno una fascia oraria per il doposcuola" };
    }
  }

  // Sconti: validazione come in create.
  const scontiApplicati = d.scontiIds.length > 0
    ? await getScontiByIds(d.scontiIds)
    : [];
  if (scontiApplicati.length !== d.scontiIds.length) {
    return { error: "Uno o più sconti non sono validi" };
  }
  for (const sc of scontiApplicati) {
    if (sc.attivitaId !== d.attivitaId || !sc.attivo) {
      return { error: `Sconto "${sc.nome}" non disponibile per questa attività` };
    }
  }

  const applicaQuota = d.applicaQuotaIscrizione && attivita.quotaIscrizione != null;

  // Calcolo di che tipo di update e' necessario:
  // - cambioAttivita o cambioModalita o cambioTipoPrezzo => wipe-and-recreate.
  // - altrimenti diff incrementale (sessioni, quota, sconti).
  const cambioAttivita = existing.attivitaId !== d.attivitaId;
  const cambioModalita = existing.modalitaId !== d.modalitaId;
  const cambioTipoPrezzo =
    !!existingModalita && existingModalita.tipoPrezzo !== modalita.tipoPrezzo;
  const wipeAndRecreate = cambioAttivita || cambioModalita || cambioTipoPrezzo;

  try {
    if (wipeAndRecreate) {
      // Wipe-and-recreate: serve a coprire il caso "ho scelto la modalita
      // sbagliata, voglio rifare l'iscrizione". Bloccato se c'e' qualunque
      // rata gia' pagata: l'admin deve prima annullare il pagamento.
      if (await hasAnyRataPagata(recordId)) {
        return {
          error:
            "Impossibile modificare: rata già pagata o parziale. Annulla prima il pagamento.",
        };
      }
      const sessioni = await listSessioni({ recordIds: d.sessioniSelteIds });
      if (sessioni.length !== d.sessioniSelteIds.length) {
        return { error: "Una o più sessioni non sono valide" };
      }

      await updateIscrizione(recordId, {
        bambinoId: d.bambinoId,
        attivitaId: d.attivitaId,
        modalitaId: d.modalitaId,
        dataIscrizione: d.dataIscrizione || undefined,
        giorniSettimana: attivita.tipo === "doposcuola" ? d.giorniSettimana : [],
        fasceOrarie: attivita.tipo === "doposcuola" ? d.fasceOrarie : [],
        sessioniSelteIds: d.sessioniSelteIds,
        scontiIds: d.scontiIds,
        note: d.note || undefined,
      });

      await deleteMesiByIscrizione(recordId);
      const rate = costruisciRate(
        recordId,
        attivita,
        modalita,
        sessioni,
        applicaQuota,
        scontiApplicati,
      );
      if (rate.length > 0) await createMesi(rate);
    } else {
      // Diff incrementale: stessa attivita, stessa modalita, stessa policy.
      const previousSessioni = new Set(existing.sessioniSelteIds);
      const nextSessioni = new Set(d.sessioniSelteIds);
      const removedSessioni = [...previousSessioni].filter(
        (id) => !nextSessioni.has(id),
      );
      const addedSessioni = [...nextSessioni].filter(
        (id) => !previousSessioni.has(id),
      );

      // Blocco: non rimuovere una sessione con rata gia' pagata (solo policy
      // per_sessione produce rate sessione, ma il check copre tutto).
      for (const sessioneId of removedSessioni) {
        if (await hasRataPagataForSessione(recordId, sessioneId)) {
          return {
            error:
              "Impossibile rimuovere: rata già pagata o parziale. Annulla prima il pagamento.",
          };
        }
      }

      // Verifico la quota: se sto togliendo la quota e la riga e' pagata,
      // blocco. Per coerenza con le sessioni.
      const aveva_quota = existing.scontiIds; // placeholder, vedi sotto
      void aveva_quota;

      await updateIscrizione(recordId, {
        bambinoId: d.bambinoId,
        attivitaId: d.attivitaId,
        modalitaId: d.modalitaId,
        dataIscrizione: d.dataIscrizione || undefined,
        giorniSettimana: attivita.tipo === "doposcuola" ? d.giorniSettimana : [],
        fasceOrarie: attivita.tipo === "doposcuola" ? d.fasceOrarie : [],
        sessioniSelteIds: d.sessioniSelteIds,
        scontiIds: d.scontiIds,
        note: d.note || undefined,
      });

      // Sessioni rimosse -> cancello le rate (solo se modalita per_sessione le
      // aveva materializzate; per le flat non ci sono rate per-sessione,
      // delete e' no-op).
      for (const sessioneId of removedSessioni) {
        await deleteRateBySessioneEIscrizione(recordId, sessioneId);
      }

      // Sessioni aggiunte -> nuove rate solo se policy per_sessione.
      if (addedSessioni.length > 0 && modalita.tipoPrezzo === "per_sessione") {
        const sessioniAggiunte = await listSessioni({ recordIds: addedSessioni });
        await createMesi(
          sessioniAggiunte.map((s) => ({
            iscrizioneId: recordId,
            sessioneId: s.recordId,
            tipoUnita: s.tipoUnita,
            chiavePeriodo: s.chiave,
            importoDovuto: modalita.importo,
            tipoRiga: "sessione",
            meseAnno: s.tipoUnita === "mese" ? s.chiave : undefined,
          })),
        );
      }

      // Quota iscrizione: ricalcolo. Se la riga esisteva (puo' essere stata
      // pagata!) e l'utente la deseleziona, blocchiamo.
      const rateAttuali = await listMesiByIscrizione(recordId);
      const rigaQuotaEsistente = rateAttuali.find(
        (r) => r.tipoRiga === "quota_iscrizione",
      );
      const deveAvereQuota =
        applicaQuota && (attivita.quotaIscrizione ?? 0) > 0;
      if (rigaQuotaEsistente && !deveAvereQuota) {
        if (
          rigaQuotaEsistente.statoPagamento === "pagato" ||
          rigaQuotaEsistente.statoPagamento === "parziale"
        ) {
          return {
            error:
              "Impossibile rimuovere la quota iscrizione: la rata è già pagata. Annulla prima il pagamento.",
          };
        }
        await deleteRateByTipoRiga(recordId, "quota_iscrizione");
      } else if (!rigaQuotaEsistente && deveAvereQuota) {
        await createMesi([
          {
            iscrizioneId: recordId,
            importoDovuto: attivita.quotaIscrizione ?? 0,
            tipoRiga: "quota_iscrizione",
            descrizioneRiga: "Quota iscrizione",
          },
        ]);
      } else if (
        rigaQuotaEsistente &&
        deveAvereQuota &&
        rigaQuotaEsistente.importoDovuto !== (attivita.quotaIscrizione ?? 0) &&
        rigaQuotaEsistente.statoPagamento === "non_pagato"
      ) {
        // Quota cambiata sull'attivita e la rata non e' pagata: aggiorno.
        await deleteRateByTipoRiga(recordId, "quota_iscrizione");
        await createMesi([
          {
            iscrizioneId: recordId,
            importoDovuto: attivita.quotaIscrizione ?? 0,
            tipoRiga: "quota_iscrizione",
            descrizioneRiga: "Quota iscrizione",
          },
        ]);
      }

      // Sconti: sempre wipe-and-recreate (le righe sconto non sono mai pagate).
      // Ricalcolo l'imponibile col valore corrente di subtotale modalita.
      const subtotaleModalita =
        modalita.tipoPrezzo === "flat"
          ? modalita.importo
          : round2(modalita.importo * d.sessioniSelteIds.length);
      const quotaCurrent = deveAvereQuota ? attivita.quotaIscrizione ?? 0 : 0;
      const imponibile = subtotaleModalita + quotaCurrent;

      await deleteRateByTipoRiga(recordId, "sconto");
      const righeSconto: RataDaCreare[] = [];
      for (const sc of scontiApplicati) {
        const importoSconto =
          sc.tipo === "percentuale"
            ? round2((imponibile * sc.valore) / 100)
            : round2(sc.valore);
        if (importoSconto <= 0) continue;
        righeSconto.push({
          iscrizioneId: recordId,
          importoDovuto: -importoSconto,
          tipoRiga: "sconto",
          descrizioneRiga: `Sconto: ${sc.nome}`,
        });
      }
      if (righeSconto.length > 0) await createMesi(righeSconto);
    }

    await logAudit({
      userId: actor.user?.recordId,
      userEmail: actor.user?.email,
      action: "iscrizione.update",
      entityType: "iscrizione",
      entityId: recordId,
      diff: {
        wipeAndRecreate,
        tipoPrezzo: modalita.tipoPrezzo,
        sessioniCount: d.sessioniSelteIds.length,
        quotaApplicata: applicaQuota ? attivita.quotaIscrizione ?? 0 : 0,
        scontiIds: d.scontiIds,
      },
    });
  } catch (e) {
    console.error("[updateIscrizioneAction]", e);
    return { error: userErrorMessage(e, "Errore durante il salvataggio") };
  }

  revalidatePath("/iscrizioni");
  revalidatePath(`/iscrizioni/${recordId}`);
  revalidatePath(`/iscrizioni/attivita/${d.attivitaId}`);
  return { ok: true };
}

/**
 * Conta i record che verranno cascadeati cancellando questa iscrizione.
 * Usato dal dialog di conferma per mostrare l'impatto all'utente.
 */
export async function getDeleteIscrizioneImpactAction(
  recordId: string,
): Promise<{ rate: number }> {
  await requireEduOrAdmin();
  const rate = await listMesiByIscrizione(recordId);
  return { rate: rate.length };
}

export async function deleteIscrizioneAction(
  recordId: string,
  options?: { redirectTo?: string },
) {
  let actor;
  try {
    actor = await requireEduOrAdmin();
  } catch (e) {
    console.error("[deleteIscrizioneAction]", e);
    return { error: userErrorMessage(e, "Non autorizzato") };
  }
  // Recupera attivitaId prima della cancellazione per poter rivalidare la
  // lista per-attivita (la chiamata da `/iscrizioni/attivita/[id]` resta
  // altrimenti su una vista stale).
  const iscr = await getIscrizione(recordId);
  const attivitaId = iscr?.attivitaId;
  try {
    // Cascade: prima cancella tutte le rate, poi l'iscrizione, così la
    // tabella Rate non resta con record orfani che falsificano report e saldi.
    await deleteMesiByIscrizione(recordId);
    await deleteIscrizione(recordId);
    await logAudit({
      userId: actor.user?.recordId,
      userEmail: actor.user?.email,
      action: "iscrizione.delete",
      entityType: "iscrizione",
      entityId: recordId,
    });
  } catch (e) {
    console.error("[deleteIscrizioneAction]", e);
    return { error: userErrorMessage(e, "Errore durante l'eliminazione") };
  }
  revalidatePath("/iscrizioni");
  if (attivitaId) revalidatePath(`/iscrizioni/attivita/${attivitaId}`);
  const target = options?.redirectTo ?? "/iscrizioni";
  redirect(target);
}
