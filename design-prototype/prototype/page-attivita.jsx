/* global React, ACLI_DATA, Ico, Btn, Badge, StatePill, Card, CardHead, fmtEur, fmtN */
const { useState: useStateA } = React;

function PageAttivita() {
  const D = ACLI_DATA;
  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Attività</h1>
          <p>Doposcuola, laboratori e centri estivi · 2025–2026</p>
        </div>
        <div className="actions">
          <Btn icon="plus" size="sm">Nuova attività</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {D.attivita.map((a) => (
          <Card key={a.id}>
            <div className="row" style={{ alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: a.tipo === "doposcuola" ? "var(--primary-soft)" : a.tipo === "laboratorio" ? "var(--accent-soft)" : "var(--info-soft)",
                color: a.tipo === "doposcuola" ? "var(--primary-soft-ink)" : a.tipo === "laboratorio" ? "var(--accent-soft-ink)" : "var(--info-soft-ink)",
                display: "grid", placeItems: "center",
              }}>
                <Ico name={a.icon === "GraduationCap" ? "cap" : a.icon === "Drama" ? "drama" : a.icon === "Train" ? "train" : "calc"} size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>{a.nome}</h3>
                  {a.attivo ? <Badge tone="green" dot>Attiva</Badge> : <Badge>Sospesa</Badge>}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", textTransform: "capitalize" }}>{a.tipo} · {a.frequenza}</div>
              </div>
              <Btn variant="ghost" size="sm" icon="more" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
              <Mini label="Modalità" value={a.modalita} />
              <Mini label="Sessioni" value={a.sessioni} />
              <Mini label="Iscritti" value={a.iscritti} highlight />
            </div>

            <div className="row" style={{ gap: 8, justifyContent: "space-between" }}>
              <div className="row" style={{ gap: 6 }}>
                <Btn variant="outline" size="sm">Modalità</Btn>
                <Btn variant="outline" size="sm">Sessioni</Btn>
              </div>
              <Btn variant="ghost" size="sm" iconRight="chevron">Apri</Btn>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <CardHead title="Sessioni del mese — maggio 2026" sub="Doposcuola 2025–2026" />
        <Card className="flush" style={{ marginTop: -1, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Sessione</th>
                <th>Periodo</th>
                <th>Iscritti</th>
                <th>Importo</th>
                <th>Educatori</th>
                <th className="num">Pagamenti</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[
                { c: "MAG-26", p: "01–31 mag 2026", isc: 32, imp: 95, ed: ["Marta Belli", "Lucia Pecchini"], pag: { ok: 28, tot: 32 } },
                { c: "GIU-26", p: "01–10 giu 2026", isc: 32, imp: 60, ed: ["Marta Belli"], pag: { ok: 0, tot: 32 } },
                { c: "APR-26", p: "01–30 apr 2026", isc: 30, imp: 95, ed: ["Marta Belli", "Lucia Pecchini", "Giorgio Antoni"], pag: { ok: 30, tot: 30 } },
                { c: "MAR-26", p: "01–31 mar 2026", isc: 30, imp: 95, ed: ["Marta Belli", "Lucia Pecchini"], pag: { ok: 30, tot: 30 } },
              ].map((s) => (
                <tr key={s.c}>
                  <td className="name">{s.c}</td>
                  <td className="muted">{s.p}</td>
                  <td>{s.isc}</td>
                  <td className="eur">{fmtEur(s.imp)}</td>
                  <td>
                    <div className="row" style={{ gap: -6 }}>
                      {s.ed.map((e, i) => (
                        <div key={e} style={{ marginLeft: i ? -6 : 0, border: "2px solid var(--bg-elev)", borderRadius: "50%" }}>
                          <span className="avatar sm" style={{ position: "static", display: "inline-grid" }}>
                            {e.split(" ").map((x) => x[0]).join("")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="num">
                    <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                      <div className="bar" style={{ width: 80 }}>
                        <div className="fill" style={{ width: `${(s.pag.ok / s.pag.tot) * 100}%` }} />
                      </div>
                      <span style={{ fontSize: 12 }}>{s.pag.ok}/{s.pag.tot}</span>
                    </div>
                  </td>
                  <td><Btn variant="ghost" size="sm" icon="more" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function Mini({ label, value, highlight }) {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 8,
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
    }}>
      <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: highlight ? "var(--primary)" : "var(--ink)", fontWeight: 400, letterSpacing: "-0.01em" }}>{value}</div>
    </div>
  );
}

function PageIscrizioni({ go, openSegnaPagato }) {
  const D = ACLI_DATA;
  const [tab, setTab] = useStateA("attive");
  const counts = {
    attive: D.iscrizioni.filter((i) => i.stato !== "completata").length,
    ritardo: D.iscrizioni.filter((i) => i.stato === "in_ritardo").length,
    completate: D.iscrizioni.filter((i) => i.stato === "completata").length,
    tutte: D.iscrizioni.length,
  };
  const list = D.iscrizioni.filter((i) => {
    if (tab === "attive") return i.stato !== "completata";
    if (tab === "ritardo") return i.stato === "in_ritardo";
    if (tab === "completate") return i.stato === "completata";
    return true;
  });

  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Iscrizioni</h1>
          <p>Iscrizioni del 2025–2026 · {D.iscrizioni.length} totali</p>
        </div>
        <div className="actions">
          <Btn variant="outline" size="sm" icon="download">Esporta</Btn>
          <Btn icon="plus" size="sm">Nuova iscrizione</Btn>
        </div>
      </div>

      <div className="tabs">
        {[["attive","Attive"],["ritardo","In ritardo"],["completate","Completate"],["tutte","Tutte"]].map(([k,l]) => (
          <div key={k} className="tab" data-active={tab===k} onClick={()=>setTab(k)}>{l}<span className="count">{counts[k]}</span></div>
        ))}
      </div>

      <Card className="flush">
        <table className="table">
          <thead>
            <tr>
              <th>Bambino</th>
              <th>Attività</th>
              <th>Modalità</th>
              <th className="num">Importo / sess.</th>
              <th>Avanzamento</th>
              <th>Stato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id}>
                <td className="name">{i.bambino}</td>
                <td>{i.attivita}</td>
                <td className="muted">{i.modalita}</td>
                <td className="num eur">{fmtEur(i.importo)}</td>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <div className="bar" style={{ width: 110 }}>
                      <div
                        className="fill"
                        style={{
                          width: `${(i.mesi.pagati / i.mesi.tot) * 100}%`,
                          background: i.stato === "in_ritardo" ? "var(--danger)" : "var(--primary)",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                      {i.mesi.pagati}/{i.mesi.tot}
                    </span>
                  </div>
                </td>
                <td><StatePill stato={i.stato} /></td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    <Btn variant="outline" size="sm" icon="euro" onClick={() => openSegnaPagato(i)}>Segna pagato</Btn>
                    <Btn variant="ghost" size="sm" icon="more" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

window.PageAttivita = PageAttivita;
window.PageIscrizioni = PageIscrizioni;
