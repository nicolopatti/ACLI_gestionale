/* global React, ACLI_DATA, Ico, Btn, Badge, StatePill, Card, CardHead, Avatar, fmtEur */
const { useState: useStateEdu, useMemo: useMemoEdu } = React;

// ============ EDU HOME ============
function PageEduHome({ go }) {
  const D = ACLI_DATA;
  const morosi = D.iscrizioni.filter((i) => i.stato === "in_ritardo");
  const morositaTot = morosi.reduce((a, i) => a + (i.mesi.tot - i.mesi.pagati) * i.importo, 0);
  const scoperti = D.disponibilita.filter((d) => d.copertura === "scoperto").length;

  // ---- live state per inline edit dalla dashboard ----
  const [pres, setPres] = useStateEdu(() =>
    D.presenzeOggi.map((p) => ({
      ...p,
      fascia: (p.iscrizione.match(/\d{1,2}[–-]\d{1,2}/) || [""])[0],
      stato: p.stato === "presente" ? "presente" : p.stato === "assente" ? "assente" : "",
      nota: "",
    }))
  );
  const educOggi = useMemoEdu(
    () =>
      D.educatori.slice(0, 3).map((e, i) => ({
        id: e.id,
        nome: `${e.nome} ${e.cognome}`,
        fascia: i === 0 ? "14–18" : i === 1 ? "14–16" : "15–17",
        stato: i < 2 ? "presente" : "",
        nota: "",
      })),
    []
  );
  const [eduPres, setEduPres] = useStateEdu(educOggi);
  const [note, setNote] = useStateEdu([
    { id: "n1", da: "Mamma di Sofia Romano", quando: "oggi", testo: "Sofia esce alle 17:00, viene a prenderla la zia Anna.", urgenza: "oggi" },
    { id: "n2", da: "Papà di Luca Conti", quando: "oggi", testo: "Luca ha la merenda nello zaino, evitare arachidi.", urgenza: "oggi" },
    { id: "n3", da: "Mamma di Caterina De Luca", quando: "ven 15", testo: "Venerdì assente per visita medica.", urgenza: "futuro" },
  ]);
  const [draft, setDraft] = useStateEdu({ bambino: "", testo: "", quando: "oggi" });
  const [draftOpen, setDraftOpen] = useStateEdu(false);

  const presN = pres.filter((p) => p.stato === "presente").length;
  const eduN = eduPres.filter((e) => e.stato === "presente").length;

  const setStato = (i, s) => setPres((arr) => arr.map((p, k) => (k === i ? { ...p, stato: p.stato === s ? "" : s } : p)));
  const setNota = (i, n) => setPres((arr) => arr.map((p, k) => (k === i ? { ...p, nota: n } : p)));
  const setEduStato = (i, s) => setEduPres((arr) => arr.map((p, k) => (k === i ? { ...p, stato: p.stato === s ? "" : s } : p)));
  const setEduNota = (i, n) => setEduPres((arr) => arr.map((p, k) => (k === i ? { ...p, nota: n } : p)));
  const addNote = () => {
    if (!draft.testo.trim()) return;
    setNote((arr) => [{ id: "n" + Date.now(), da: draft.bambino || "Genitore", quando: draft.quando, testo: draft.testo, urgenza: draft.quando === "oggi" ? "oggi" : "futuro" }, ...arr]);
    setDraft({ bambino: "", testo: "", quando: "oggi" });
    setDraftOpen(false);
  };

  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Cruscotto educativo</h1>
          <p>Giovedì 14 maggio · doposcuola 14:00–18:00 · gestione operativa della giornata</p>
        </div>
        <div className="actions">
          <span className="row" style={{ gap: 8, fontSize: 12, color: "var(--muted)" }}>
            <span style={{ width: 6, height: 6, borderRadius: 6, background: morositaTot > 0 ? "var(--accent)" : "var(--success)" }} />
            Morosità: <b style={{ color: "var(--ink-2)", fontWeight: 500 }}>{fmtEur(morositaTot)}</b>
            <span style={{ color: "var(--muted-2)" }}>· {morosi.length} famiglie</span>
            <Btn variant="ghost" size="sm" iconRight="chevron" onClick={() => go("iscrizioni")}>Vedi</Btn>
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "start" }}>
        {/* ===== COLONNA OPERATIVA ===== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* PRESENZE BAMBINI */}
          <Card className="flush">
            <CardHead
              title="Presenze bambini · oggi"
              sub={`${presN}/${pres.length} segnati presenti · doposcuola gio 14 mag`}
              right={<Btn variant="ghost" size="sm" iconRight="chevron" onClick={() => go("presenze")}>Pagina completa</Btn>}
            />
            <div style={{ padding: "4px 0" }}>
              {pres.map((p, i) => (
                <PresRow
                  key={i}
                  nome={p.bambino}
                  fascia={p.fascia}
                  stato={p.stato}
                  nota={p.nota}
                  onStato={(s) => setStato(i, s)}
                  onNota={(n) => setNota(i, n)}
                />
              ))}
            </div>
          </Card>

          {/* PRESENZE EDUCATORI */}
          <Card className="flush">
            <CardHead
              title="Presenze educatori · oggi"
              sub={`${eduN}/${eduPres.length} in turno · pomeriggio`}
              right={<Btn variant="ghost" size="sm" iconRight="chevron" onClick={() => go("turni")}>Turni settimana</Btn>}
            />
            <div style={{ padding: "4px 0" }}>
              {eduPres.map((p, i) => (
                <PresRow
                  key={p.id}
                  nome={p.nome}
                  fascia={p.fascia}
                  stato={p.stato}
                  nota={p.nota}
                  onStato={(s) => setEduStato(i, s)}
                  onNota={(n) => setEduNota(i, n)}
                />
              ))}
            </div>
          </Card>

        </div>

        {/* ===== COLONNA RIEPILOGO ===== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 84 }}>
          <Card className="flush">
            <CardHead
              title="Note dai genitori"
              sub="Comunicazioni del giorno e nei prossimi"
              right={
                draftOpen
                  ? <Btn variant="ghost" size="sm" onClick={() => setDraftOpen(false)}>Annulla</Btn>
                  : <Btn size="sm" icon="plus" onClick={() => setDraftOpen(true)}>Aggiungi</Btn>
              }
            />
            {draftOpen && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  placeholder="Da chi (es. Mamma di Luca)"
                  value={draft.bambino}
                  onChange={(e) => setDraft({ ...draft, bambino: e.target.value })}
                  style={inlineInput}
                />
                <select
                  value={draft.quando}
                  onChange={(e) => setDraft({ ...draft, quando: e.target.value })}
                  style={inlineInput}
                >
                  <option value="oggi">Per oggi</option>
                  <option value="domani">Per domani</option>
                  <option value="settimana">Questa settimana</option>
                  <option value="ven 15">Venerdì 15</option>
                </select>
                <textarea
                  placeholder="Testo (es. esce alle 17:00, lo prende la zia)"
                  value={draft.testo}
                  onChange={(e) => setDraft({ ...draft, testo: e.target.value })}
                  rows={2}
                  style={{ ...inlineInput, resize: "vertical", minHeight: 60, fontFamily: "inherit" }}
                />
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <Btn size="sm" icon="check" onClick={addNote}>Salva</Btn>
                </div>
              </div>
            )}
            <div style={{ padding: "4px 0" }}>
              {note.map((n) => (
                <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                  <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
                      padding: "2px 6px", borderRadius: 4,
                      background: n.urgenza === "oggi" ? "var(--warning-soft)" : "var(--surface-2)",
                      color: n.urgenza === "oggi" ? "var(--warning-soft-ink)" : "var(--muted)",
                    }}>{n.quando}</span>
                    <span style={{ fontSize: 11.5, color: "var(--muted)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.da}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>{n.testo}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              <MiniStat label="Bambini presenti" value={`${presN}/${pres.length}`} hint="Doposcuola oggi" tone="green" />
              <MiniStat label="Educatori in turno" value={`${eduN}/${eduPres.length}`} hint="Pomeriggio" />
              <MiniStat label="Turni scoperti" value={scoperti} hint="Prossime 4 settimane" tone={scoperti > 0 ? "warn" : "green"} divTop />
              <MiniStat label="Note del giorno" value={note.filter((n) => n.urgenza === "oggi").length} hint={`${note.length} totali`} divTop divLeft />
            </div>
          </Card>

          <Card className="flush">
            <CardHead title="Turni della settimana" sub="11–16 maggio" right={<Btn variant="ghost" size="sm" iconRight="chevron" onClick={() => go("turni")}>Apri</Btn>} />
            <div style={{ padding: 14 }}>
              <TurniMini turni={ACLI_DATA.turni} compact />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function nowHm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const inlineInput = {
  height: 34, padding: "0 10px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface)",
  fontSize: 13, color: "var(--ink)", outline: "none", flex: 1, fontFamily: "inherit",
};

function PresRow({ nome, fascia, stato, nota, onStato, onNota }) {
  return (
    <div className="row" style={{ gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
      <div style={{
        width: 8, height: 8, borderRadius: 8,
        background: stato === "presente" ? "var(--success)" : stato === "assente" ? "var(--danger)" : "var(--muted-2)",
        flex: "none",
      }} />
      <div className="row" style={{ gap: 8, flex: "1 1 0", minWidth: 90, alignItems: "baseline", overflow: "hidden" }}>
        <span className="name" style={{ fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flex: "1 1 auto" }}>{nome}</span>
        {fascia && <span className="muted" style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", flex: "none" }}>{fascia}</span>}
      </div>
      <div className="seg seg-sm" style={{ flex: "none" }}>
        <button className={stato === "presente" ? "on" : ""} onClick={() => onStato("presente")}>Presente</button>
        <button className={stato === "assente" ? "on" : ""} onClick={() => onStato("assente")}>Assente</button>
      </div>
      <input
        placeholder="Note…"
        value={nota || ""}
        onChange={(e) => onNota(e.target.value)}
        style={{
          flex: "0 1 140px", minWidth: 90, height: 30, padding: "0 10px",
          border: "1px solid var(--border)", borderRadius: 8,
          background: "var(--surface)", fontSize: 12.5, color: "var(--ink)",
          fontFamily: "inherit", outline: "none",
        }}
      />
    </div>
  );
}

function MiniStat({ label, value, hint, tone, divTop, divLeft }) {
  const accent = tone === "green" ? "var(--success-soft-ink)" : tone === "warn" ? "var(--warning-soft-ink)" : tone === "red" ? "var(--danger-soft-ink)" : "var(--ink)";
  return (
    <div style={{
      padding: "14px 16px",
      borderTop: divTop ? "1px solid var(--border)" : "none",
      borderLeft: divLeft ? "1px solid var(--border)" : "none",
    }}>
      <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: accent, lineHeight: 1 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{hint}</div>
    </div>
  );
}

function TurniMini({ turni, compact }) {
  const px = compact ? "6px 4px" : "8px 10px";
  const fs = compact ? 10 : 11.5;
  const minH = compact ? 38 : 56;
  const slotCol = compact ? 64 : 120;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `${slotCol}px repeat(6, 1fr)`, gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ background: "var(--surface-2)" }} />
      {turni.days.map((d) => (
        <div key={d} style={{ background: "var(--surface-2)", padding: compact ? "4px 2px" : "8px 10px", fontSize: compact ? 10 : 12, color: "var(--muted)", textAlign: "center" }}>{compact ? d.split(" ")[0].slice(0, 3) : d}</div>
      ))}
      {turni.slots.map((s, si) => (
        <React.Fragment key={s}>
          <div style={{ background: "var(--surface)", padding: compact ? "6px 6px" : "10px", fontSize: compact ? 10 : 12, color: "var(--muted)", fontFamily: "var(--font-mono)", display: "flex", alignItems: "center" }}>{s}</div>
          {turni.grid.map((g, di) => {
            const cell = g.slots[si];
            const tone = cell.stato === "scoperto" ? "var(--warning-soft)" : cell.stato === "chiuso" ? "var(--surface-2)" : "var(--surface)";
            const ink = cell.stato === "scoperto" ? "var(--warning-soft-ink)" : "var(--ink-2)";
            return (
              <div key={di} style={{ background: tone, padding: px, fontSize: fs, color: ink, minHeight: minH, overflow: "hidden" }}>
                {cell.stato === "chiuso" ? <span className="muted">—</span> : compact ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center", justifyContent: "center", height: "100%" }}>
                    {cell.stato === "scoperto"
                      ? <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", color: "var(--warning-soft-ink)" }}>!</span>
                      : <span style={{ width: 6, height: 6, borderRadius: 6, background: "var(--success)" }} />}
                    <span style={{ fontSize: 9.5, color: "var(--muted)", lineHeight: 1 }}>{cell.educatori.length || 0}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {cell.educatori.map((e, i) => <span key={i} style={{ fontWeight: 500 }}>{e}</span>)}
                    {cell.stato === "scoperto" && <span style={{ fontSize: 10, fontWeight: 600, color: "var(--warning-soft-ink)" }}>SCOPERTO</span>}
                  </div>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============ TURNI ============
function PageTurni() {
  const D = ACLI_DATA;
  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Turni e calendario</h1>
          <p>Pianificazione educatori · settimana 11–16 maggio 2026</p>
        </div>
        <div className="actions">
          <Btn variant="outline" size="sm" icon="download">Esporta PDF</Btn>
          <Btn size="sm" icon="plus">Assegna turno</Btn>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="label"><Ico name="check" /> Turni coperti</div><div className="value">10/12</div></div>
        <div className="stat" data-tone="warn"><div className="label"><Ico name="alert" /> Da coprire</div><div className="value">2</div><div className="delta">Mar pomeriggio · Sab mattina</div></div>
        <div className="stat"><div className="label"><Ico name="clock" /> Ore pianificate</div><div className="value">38h</div></div>
        <div className="stat"><div className="label"><Ico name="hands" /> Educatori in turno</div><div className="value">4/5</div></div>
      </div>

      <Card className="flush">
        <CardHead title="Settimana corrente" sub="Trascina un educatore su uno slot per assegnare" right={
          <div className="row" style={{ gap: 6 }}>
            <Btn variant="outline" size="sm" icon="chevron" style={{ transform: "rotate(180deg)" }} />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>11–16 mag</span>
            <Btn variant="outline" size="sm" icon="chevron" />
          </div>
        } />
        <div style={{ padding: 18 }}><TurniMini turni={D.turni} /></div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <Card className="flush">
          <CardHead title="Disponibilità educatori" sub="Maggio 2026" />
          <table className="table">
            <thead><tr><th>Educatore</th><th>Giorni/sett</th><th>Ore previste</th><th>Stato</th></tr></thead>
            <tbody>
              {D.educatori.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={`${e.nome} ${e.cognome}`} />
                      <span className="name">{e.nome} {e.cognome}</span>
                    </div>
                  </td>
                  <td className="muted">{e.gioxsett}</td>
                  <td className="muted">{e.oremese}h</td>
                  <td>{e.attivo ? <Badge tone="green" dot>Attivo</Badge> : <Badge>Riposo</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="flush">
          <CardHead title="Note operative" sub="Comunicazioni team educatori" />
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
            <div style={{ padding: 12, borderLeft: "3px solid var(--accent)", background: "var(--accent-soft)", borderRadius: 6 }}>
              <b>Mar 12</b> · Lucia non disponibile, sostituire con Davide o Marta.
            </div>
            <div style={{ padding: 12, borderLeft: "3px solid var(--primary)", background: "var(--primary-soft)", borderRadius: 6 }}>
              <b>Sab 16</b> · Laboratorio teatro alle 10:00 · serve un educatore + Anna come volontaria.
            </div>
            <div style={{ padding: 12, borderLeft: "3px solid var(--border-strong)", background: "var(--surface-2)", borderRadius: 6 }}>
              <b>Promemoria</b> · giovedì 21 riunione mensile educatori · 18:30.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============ CASSA EDUCATIVA (read-only) ============
function PageCassaEdu() {
  const D = ACLI_DATA;
  const eduCats = ["Quote iscrizione", "Quote laboratorio", "Compensi educatori", "Materiale didattico", "Cancelleria", "Merenda"];
  const list = D.movimenti.filter((m) => eduCats.includes(m.categoria));
  const totE = list.filter((m) => m.tipo === "Entrata" && m.stato !== "errato").reduce((a, m) => a + m.importo, 0);
  const totU = list.filter((m) => m.tipo === "Uscita" && m.stato !== "errato").reduce((a, m) => a + m.importo, 0);
  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Cassa educativa</h1>
          <p>Sola lettura · entrate e uscite collegate alle attività educative</p>
        </div>
        <div className="actions">
          <Btn variant="outline" size="sm" icon="download">Esporta CSV</Btn>
        </div>
      </div>

      <div style={{ marginBottom: 18, padding: 12, borderRadius: 10, background: "var(--info-soft)", color: "var(--info-soft-ink)", display: "flex", gap: 10, alignItems: "center", fontSize: 12.5 }}>
        <Ico name="alert" size={14} />
        <span>Visualizzi solo i movimenti del perimetro educativo. Per registrare nuovi movimenti rivolgiti al presidente o a un volontario di cassa.</span>
      </div>

      <div className="stats">
        <div className="stat" data-tone="green"><div className="label"><Ico name="arrowDown" /> Entrate</div><div className="value eur">{fmtEur(totE)}</div><div className="delta">Quote, laboratori</div></div>
        <div className="stat"><div className="label"><Ico name="arrowUp" /> Uscite</div><div className="value eur">{fmtEur(totU)}</div><div className="delta">Compensi, materiale</div></div>
        <div className="stat" data-tone={totE - totU >= 0 ? "green" : "red"}><div className="label"><Ico name="wallet" /> Saldo educativo</div><div className="value eur">{fmtEur(totE - totU)}</div><div className="delta">Mese in corso</div></div>
        <div className="stat"><div className="label"><Ico name="cap" /> Quote pagate</div><div className="value">{list.filter((m) => m.categoria.startsWith("Quote")).length}</div><div className="delta">{list.length} movimenti totali</div></div>
      </div>

      <Card className="flush">
        <CardHead title="Movimenti collegati alle attività educative" sub={`${list.length} movimenti · maggio 2026`} />
        <table className="table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Descrizione</th><th>Categoria</th><th>Conto</th><th className="num">Importo</th></tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{m.data}</td>
                <td>
                  <span className="row" style={{ gap: 6, color: m.tipo === "Entrata" ? "var(--success-soft-ink)" : "var(--ink-2)" }}>
                    <Ico name={m.tipo === "Entrata" ? "arrowDown" : "arrowUp"} size={13} />{m.tipo}
                  </span>
                </td>
                <td className="name">{m.descrizione}</td>
                <td className="muted">{m.categoria}</td>
                <td><Badge>{m.conto}</Badge></td>
                <td className="num eur" style={{
                  fontWeight: 500,
                  color: m.stato === "errato" ? "var(--muted-2)" : m.tipo === "Entrata" ? "var(--success-soft-ink)" : "var(--ink)",
                  textDecoration: m.stato === "errato" ? "line-through" : "none",
                }}>{m.tipo === "Entrata" ? "+" : "−"}{fmtEur(m.importo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============ NUOVA SPESA / INCASSO ============
function PageSpeseEdu() {
  const D = ACLI_DATA;
  const oggi = new Date().toISOString().slice(0, 10);
  const eduCats = {
    Uscita: ["Compensi educatori", "Materiale didattico", "Cancelleria", "Merenda", "Trasporti e rimborsi km", "Altro"],
    Entrata: ["Quote iscrizione", "Quote laboratorio", "Donazioni", "Altro"],
  };
  const conti = ["Cassa", "BCC", "Sumup"];
  const [step, setStep] = useStateEdu("form"); // form | conferma | ok
  const [f, setF] = useStateEdu({
    tipo: "Uscita", importo: "", data: oggi, conto: "",
    categoria: "", descrizione: "", note: "",
  });
  const [recenti, setRecenti] = useStateEdu(() => D.movimenti.slice(0, 4).map((m) => ({ ...m, mio: m.volontario === "Marta Belli" })));
  const cats = eduCats[f.tipo];
  const valid = f.importo && parseFloat(String(f.importo).replace(",", ".")) > 0 && f.conto && f.categoria && f.descrizione.trim();
  const upd = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const reset = () => { setF({ tipo: "Uscita", importo: "", data: oggi, conto: "", categoria: "", descrizione: "", note: "" }); setStep("form"); };
  const conferma = () => {
    const nuovo = {
      id: "m" + Date.now(),
      data: new Date(f.data).toLocaleDateString("it-IT"),
      tipo: f.tipo,
      importo: parseFloat(String(f.importo).replace(",", ".")),
      conto: f.conto,
      categoria: f.categoria,
      descrizione: f.descrizione,
      volontario: "Marta Belli",
      stato: "valido",
      note: f.note,
      mio: true,
    };
    setRecenti((r) => [nuovo, ...r].slice(0, 6));
    setStep("ok");
    setTimeout(() => reset(), 1800);
  };
  const importoNum = parseFloat(String(f.importo).replace(",", ".")) || 0;

  const inp = { width: "100%", height: 38, padding: "0 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", fontSize: 13.5, color: "var(--ink)", fontFamily: "inherit", outline: "none" };
  const lbl = { display: "block", fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, marginBottom: 6 };

  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Registra movimento</h1>
          <p>Inserisci una spesa o un incasso · scrive sulla cassa educativa</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <Card className="flush">
          <CardHead title={step === "ok" ? "Movimento registrato" : step === "conferma" ? "Conferma il riepilogo" : "Nuovo movimento"} sub={step === "form" ? "Compila i campi e poi conferma il riepilogo" : step === "conferma" ? "Verifica i dati prima di salvare" : "Salvato sulla cassa educativa"} />

          {step === "ok" && (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 56, background: "var(--success-soft)", color: "var(--success-soft-ink)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Ico name="check" size={26} />
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Salvato</div>
              <div className="muted" style={{ fontSize: 13.5 }}>Il movimento è ora visibile nella cassa educativa.</div>
            </div>
          )}

          {step === "form" && (
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={lbl}>Tipo movimento</label>
                <div className="seg" style={{ width: "fit-content" }}>
                  <button className={f.tipo === "Uscita" ? "on" : ""} onClick={() => upd("tipo", "Uscita") || upd("categoria", "")}>− Uscita / spesa</button>
                  <button className={f.tipo === "Entrata" ? "on" : ""} onClick={() => upd("tipo", "Entrata") || upd("categoria", "")}>+ Entrata / incasso</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={lbl}>Importo</label>
                  <div style={{ position: "relative" }}>
                    <input type="text" inputMode="decimal" placeholder="0,00" value={f.importo} onChange={(e) => upd("importo", e.target.value)} style={{ ...inp, paddingLeft: 30, fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 500 }} />
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 14 }}>€</span>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Data</label>
                  <input type="date" value={f.data} onChange={(e) => upd("data", e.target.value)} style={inp} />
                </div>
              </div>

              <div>
                <label style={lbl}>Conto</label>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {conti.map((c) => (
                    <button key={c} onClick={() => upd("conto", c)}
                      style={{
                        padding: "8px 14px", borderRadius: 8,
                        border: "1px solid " + (f.conto === c ? "var(--ink)" : "var(--border)"),
                        background: f.conto === c ? "var(--ink)" : "var(--surface)",
                        color: f.conto === c ? "var(--surface)" : "var(--ink)",
                        fontFamily: "inherit", fontSize: 13, cursor: "pointer", fontWeight: 500,
                        display: "inline-flex", gap: 8, alignItems: "center",
                      }}>
                      <Ico name={c === "Cassa" ? "cash" : c === "BCC" ? "bank" : "card"} size={14} /> {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Categoria</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
                  {cats.map((c) => (
                    <button key={c} onClick={() => upd("categoria", c)}
                      style={{
                        padding: "9px 12px", borderRadius: 8, textAlign: "left",
                        border: "1px solid " + (f.categoria === c ? "var(--accent)" : "var(--border)"),
                        background: f.categoria === c ? "var(--accent-soft)" : "var(--surface)",
                        color: f.categoria === c ? "var(--accent-soft-ink)" : "var(--ink)",
                        fontFamily: "inherit", fontSize: 12.5, cursor: "pointer", fontWeight: f.categoria === c ? 500 : 400,
                      }}>{c}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Descrizione</label>
                <input placeholder={f.tipo === "Uscita" ? "es. quaderni e penne per laboratorio" : "es. quota maggio — Sofia Romano"} value={f.descrizione} onChange={(e) => upd("descrizione", e.target.value)} style={inp} />
              </div>

              <div>
                <label style={lbl}>Note <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "var(--muted-2)" }}>(facoltative)</span></label>
                <textarea rows={2} placeholder="es. ricevuta in busta, da rimborsare a Marta" value={f.note} onChange={(e) => upd("note", e.target.value)} style={{ ...inp, height: "auto", padding: 10, resize: "vertical", minHeight: 60 }} />
              </div>

              <div className="row" style={{ justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <span className="muted" style={{ fontSize: 12 }}>Stai inserendo come <b style={{ color: "var(--ink)" }}>Marta Belli</b></span>
                <Btn icon="arrowRight" disabled={!valid} onClick={() => setStep("conferma")}>Vai al riepilogo</Btn>
              </div>
            </div>
          )}

          {step === "conferma" && (
            <div style={{ padding: 22 }}>
              <div style={{ padding: 18, background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500 }}>{f.tipo === "Uscita" ? "−" : "+"}{importoNum.toFixed(2).replace(".", ",")} €</span>
                  <Badge tone={f.tipo === "Uscita" ? "red" : "green"} dot>{f.tipo}</Badge>
                </div>
                <RiepRow l="Data" v={new Date(f.data).toLocaleDateString("it-IT")} />
                <RiepRow l="Conto" v={f.conto} />
                <RiepRow l="Categoria" v={f.categoria} />
                <RiepRow l="Descrizione" v={f.descrizione} />
                {f.note && <RiepRow l="Note" v={f.note} />}
                <RiepRow l="Volontario" v="Marta Belli" />
              </div>
              <div className="row" style={{ justifyContent: "space-between", marginTop: 18 }}>
                <Btn variant="ghost" icon="arrowLeft" onClick={() => setStep("form")}>Modifica</Btn>
                <Btn icon="check" onClick={conferma}>Conferma e salva</Btn>
              </div>
            </div>
          )}
        </Card>

        {/* Colonna destra */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 84 }}>
          <Card>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }}>Saldo conti — oggi</div>
              {Object.entries(D.conti).map(([k, c]) => (
                <div key={k} className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="row" style={{ gap: 8, fontSize: 13 }}>
                    <Ico name={k === "Cassa" ? "cash" : k === "BCC" ? "bank" : "card"} size={14} className="muted" /> {k}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500 }}>{fmtEur(c.saldo)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="flush">
            <CardHead title="I miei ultimi movimenti" sub="Inseriti da te oggi" />
            <div>
              {recenti.filter((m) => m.mio).length === 0 && (
                <div className="muted" style={{ padding: "16px 18px", fontSize: 12.5 }}>Nessun movimento inserito oggi.</div>
              )}
              {recenti.filter((m) => m.mio).map((m) => (
                <div key={m.id} className="row" style={{ gap: 10, padding: "11px 18px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
                  <div style={{ width: 6, height: 28, borderRadius: 3, background: m.tipo === "Uscita" ? "var(--danger)" : "var(--success)", flex: "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="name" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.descrizione}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{m.categoria} · {m.conto} · {m.data}</div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, flex: "none", color: m.tipo === "Uscita" ? "var(--ink)" : "var(--success-soft-ink)" }}>{m.tipo === "Uscita" ? "−" : "+"}{fmtEur(m.importo)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RiepRow({ l, v }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", gap: 14, alignItems: "baseline" }}>
      <span className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600, flex: "none" }}>{l}</span>
      <span style={{ fontSize: 13.5, textAlign: "right", fontWeight: 500 }}>{v}</span>
    </div>
  );
}

window.PageEduHome = PageEduHome;
window.PageTurni = PageTurni;
window.PageCassaEdu = PageCassaEdu;
window.PageSpeseEdu = PageSpeseEdu;
