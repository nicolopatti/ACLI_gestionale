"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  createBambinoAction,
  updateBambinoAction,
} from "@/lib/actions/bambini";
import { CONTATTO_RUOLI, type RuoloContatto } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Bambino, ContattoAggiuntivo } from "@/lib/airtable/types";

interface Props {
  bambino?: Bambino;
  bambini: Bambino[];
  contatti?: ContattoAggiuntivo[];
}

interface ContattoRow {
  recordId?: string;
  ruolo: RuoloContatto;
  nome: string;
  cognome: string;
  telefono: string;
  note: string;
}

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

function emptyContatto(): ContattoRow {
  return { ruolo: "altro", nome: "", cognome: "", telefono: "", note: "" };
}

export function BambinoForm({ bambino, bambini, contatti }: Props) {
  const action = bambino
    ? updateBambinoAction.bind(null, bambino.recordId)
    : createBambinoAction;
  const [state, formAction, pending] = useActionState<
    { error?: string; ok?: boolean } | undefined,
    FormData
  >(action, undefined);

  const altriBambini = useMemo(
    () => bambini.filter((b) => b.recordId !== bambino?.recordId),
    [bambini, bambino?.recordId],
  );
  const bambinoById = useMemo(
    () => new Map(altriBambini.map((b) => [b.recordId, b] as const)),
    [altriBambini],
  );

  const [genitore, setGenitore] = useState({
    nome: bambino?.nomeGenitore ?? "",
    cognome: bambino?.cognomeGenitore ?? "",
    telefono: bambino?.telefonoGenitore ?? "",
    email: bambino?.emailGenitore ?? "",
    cf: bambino?.cfGenitore ?? "",
  });
  const [fratelloDiId, setFratelloDiId] = useState(bambino?.fratelloDiId ?? "");
  const [contattiRows, setContattiRows] = useState<ContattoRow[]>(() =>
    (contatti ?? []).map((c) => ({
      recordId: c.recordId,
      ruolo: c.ruolo,
      nome: c.nome,
      cognome: c.cognome,
      telefono: c.telefono ?? "",
      note: c.note ?? "",
    })),
  );

  const onFratelloChange = (id: string) => {
    setFratelloDiId(id);
    if (!id) return;
    const sib = bambinoById.get(id);
    if (!sib) return;
    setGenitore({
      nome: sib.nomeGenitore || "",
      cognome: sib.cognomeGenitore || "",
      telefono: sib.telefonoGenitore || "",
      email: sib.emailGenitore || "",
      cf: sib.cfGenitore || "",
    });
  };

  const updateContatto = (idx: number, patch: Partial<ContattoRow>) => {
    setContattiRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addContatto = () => setContattiRows((prev) => [...prev, emptyContatto()]);
  const removeContatto = (idx: number) =>
    setContattiRows((prev) => prev.filter((_, i) => i !== idx));

  return (
    <form action={formAction} className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
          Bambino
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required defaultValue={bambino?.nome ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cognome">Cognome</Label>
            <Input id="cognome" name="cognome" required defaultValue={bambino?.cognome ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataNascita">Data di nascita</Label>
            <Input
              id="dataNascita"
              name="dataNascita"
              type="date"
              defaultValue={bambino?.dataNascita ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scuola">Scuola</Label>
            <Input id="scuola" name="scuola" defaultValue={bambino?.scuola ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="classe">Classe</Label>
            <Input id="classe" name="classe" defaultValue={bambino?.classe ?? ""} />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox
              id="attivo"
              name="attivo"
              defaultChecked={bambino?.attivo ?? true}
              value="true"
            />
            <Label htmlFor="attivo" className="cursor-pointer">
              Iscritto attualmente
            </Label>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Genitore
          </h2>
          {altriBambini.length > 0 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="fratelloDiId" className="text-xs text-[var(--muted-foreground)]">
                Fratello/sorella di
              </Label>
              <select
                id="fratelloDiId"
                name="fratelloDiId"
                value={fratelloDiId}
                onChange={(e) => onFratelloChange(e.target.value)}
                className={SELECT_CLASS + " max-w-xs"}
              >
                <option value="">— Nessuno —</option>
                {altriBambini.map((b) => (
                  <option key={b.recordId} value={b.recordId}>
                    {b.cognome} {b.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nomeGenitore">Nome genitore</Label>
            <Input
              id="nomeGenitore"
              name="nomeGenitore"
              required
              value={genitore.nome}
              onChange={(e) => setGenitore({ ...genitore, nome: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cognomeGenitore">Cognome genitore</Label>
            <Input
              id="cognomeGenitore"
              name="cognomeGenitore"
              required
              value={genitore.cognome}
              onChange={(e) => setGenitore({ ...genitore, cognome: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefonoGenitore">Telefono</Label>
            <Input
              id="telefonoGenitore"
              name="telefonoGenitore"
              type="tel"
              value={genitore.telefono}
              onChange={(e) => setGenitore({ ...genitore, telefono: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailGenitore">Email</Label>
            <Input
              id="emailGenitore"
              name="emailGenitore"
              type="email"
              value={genitore.email}
              onChange={(e) => setGenitore({ ...genitore, email: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cfGenitore">Codice fiscale</Label>
            <Input
              id="cfGenitore"
              name="cfGenitore"
              value={genitore.cf}
              onChange={(e) => setGenitore({ ...genitore, cf: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            Contatti aggiuntivi
          </h2>
          <Button type="button" size="sm" variant="outline" onClick={addContatto}>
            <Plus className="h-4 w-4" /> Aggiungi
          </Button>
        </div>
        {contattiRows.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Nessun contatto aggiuntivo. Usa “Aggiungi” per inserire nonni, zii, ecc.
          </p>
        ) : (
          <div className="space-y-3">
            {contattiRows.map((c, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-md border border-[var(--border)] p-3 md:grid-cols-12"
              >
                <input
                  type="hidden"
                  name={`contatti.${idx}.recordId`}
                  value={c.recordId ?? ""}
                />
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs">Ruolo</Label>
                  <select
                    name={`contatti.${idx}.ruolo`}
                    value={c.ruolo}
                    onChange={(e) =>
                      updateContatto(idx, { ruolo: e.target.value as RuoloContatto })
                    }
                    className={SELECT_CLASS}
                  >
                    {CONTATTO_RUOLI.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    name={`contatti.${idx}.nome`}
                    value={c.nome}
                    onChange={(e) => updateContatto(idx, { nome: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label className="text-xs">Cognome</Label>
                  <Input
                    name={`contatti.${idx}.cognome`}
                    value={c.cognome}
                    onChange={(e) => updateContatto(idx, { cognome: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label className="text-xs">Telefono</Label>
                  <Input
                    name={`contatti.${idx}.telefono`}
                    type="tel"
                    value={c.telefono}
                    onChange={(e) => updateContatto(idx, { telefono: e.target.value })}
                  />
                </div>
                <div className="md:col-span-1 flex items-end justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeContatto(idx)}
                    aria-label="Rimuovi contatto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="md:col-span-12 space-y-1">
                  <Label className="text-xs">Note</Label>
                  <Input
                    name={`contatti.${idx}.note`}
                    value={c.note}
                    onChange={(e) => updateContatto(idx, { note: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="space-y-2">
        <Label htmlFor="note">Note bambino</Label>
        <Textarea id="note" name="note" rows={3} defaultValue={bambino?.note ?? ""} />
      </div>

      {state?.error ? (
        <p className="text-sm text-[var(--destructive)]">{state.error}</p>
      ) : null}
      {state?.ok ? <p className="text-sm text-emerald-700">Salvato.</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {bambino ? "Aggiorna" : "Crea bambino"}
      </Button>
    </form>
  );
}
