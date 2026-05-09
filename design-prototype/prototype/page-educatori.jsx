/* global React, ACLI_DATA, Ico, Btn, Badge, StatePill, Card, CardHead, Avatar, fmtEur */
const { useState: useStateE } = React;

function PageEducatori() {
  const D = ACLI_DATA;
  const [sel, setSel] = useStateE(D.educatori[0]);
  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Educatori</h1>
          <p>Anagrafica + calendario disponibilità · maggio 2026</p>
        </div>
        <div className="actions">
          <Btn variant="outline" size="sm" icon="download">Esporta ore</Btn>
          <Btn icon="plus" size="sm">Nuovo educatore</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        <Card className="flush">
          <CardHead title="Team" sub={`${D.educatori.length} educatori · ${D.educatori.filter(e=>e.attivo).length} attivi`} />
          <div>
            {D.educatori.map((e) => (
              <div
                key={e.id}
                onClick={() => setSel(e)}
                style={{
                  display: "flex", gap: 12, padding: "14px 18px",
                  borderTop: "1px solid var(--border)", cursor: "pointer",
                  background: sel?.id === e.id ? "var(--primary-soft)" : "transparent",
                }}
              >
                <Avatar name={`${e.nome} ${e.cognome}`} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: sel?.id === e.id ? "var(--primary-soft-ink)" : "var(--ink)" }}>
                    {e.nome} {e.cognome}
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, fontFamily: "var(--font-mono)" }}>{e.telefono}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {e.attivo ? <Badge tone="green" dot>Attivo</Badge> : <Badge>Inattivo</Badge>}
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{e.oremese}h / mese</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div>
          {sel && (
            <>
              <Card style={{ marginBottom: 16 }}>
                <div className="row" style={{ gap: 14, marginBottom: 18 }}>
                  <Avatar name={`${sel.nome} ${sel.cognome}`} size="lg" />
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500 }}>
                      {sel.nome} {sel.cognome}
                    </h2>
                    <div className="row" style={{ gap: 14, fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
                      <span className="row" style={{ gap: 4 }}><Ico name="mail" size={12} /> {sel.email}</span>
                      <span className="row" style={{ gap: 4 }}><Ico name="phone" size={12} /> {sel.telefono}</span>
                    </div>
                  </div>
                  <Btn variant="outline" size="sm" icon="edit">Modifica</Btn>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  <Mini2 label="Giorni / settimana" value={sel.gioxsett} />
                  <Mini2 label="Ore / mese" value={`${sel.oremese}h`} />
                  <Mini2 label="Compenso aprile" value={fmtEur(sel.oremese * 9)} />
                  <Mini2 label="Stato" value={sel.attivo ? "In servizio" : "Pausa"} />
                </div>
              </Card>

              <Card className="flush">
                <CardHead
                  title="Disponibilità — maggio 2026"
                  sub="Click su un giorno per modificare le fasce"
                  right={
                    <div className="row" style={{ gap: 14, fontSize: 11.5, color: "var(--muted)" }}>
                      <span className="row" style={{ gap: 5 }}>
                        <span style={{ width: 10, height: 4, borderRadius: 2, background: "var(--primary)" }} /> Coperto
                      </span>
                      <span className="row" style={{ gap: 5 }}>
                        <span style={{ width: 10, height: 4, borderRadius: 2, background: "var(--border-strong)" }} /> Vuoto
                      </span>
                    </div>
                  }
                />
                <div style={{ padding: 18 }}>
                  <CalGrid />
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Mini2({ label, value }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: "var(--ink)", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function CalGrid() {
  const D = ACLI_DATA;
  // Pad to start at Mon=1
  const first = D.disponibilita[0];
  const offset = (first.dow + 6) % 7; // Mon-first
  const cells = Array(offset).fill(null).concat(D.disponibilita);
  return (
    <div className="cal">
      {["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map((h) => <div key={h} className="head">{h}</div>)}
      {cells.map((c, i) => {
        if (!c) return <div key={i} />;
        const today = c.date === 8;
        return (
          <div key={i} className={"day" + (today ? " today" : "") + (c.dow === 0 || c.dow === 6 ? " muted" : "")}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="num">{c.date}</span>
              {c.copertura === "scoperto" && <span className="pip" />}
            </div>
            <div className="slots">
              <div className={"slot" + (c.slots.includes("14-16") ? " on" : "")} />
              <div className={"slot" + (c.slots.includes("16-18") ? " on" : "")} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =========== PRESENZE ===========
function PagePresenze() {
  const D = ACLI_DATA;
  const [date] = useStateE(new Date());
  const [list, setList] = useStateE(D.presenzeOggi);

  const tot = list.length;
  const pres = list.filter((p) => p.stato === "presente").length;
  const ass = list.filter((p) => p.stato === "assente").length;
  const giust = list.filter((p) => p.stato === "assente_giustificato").length;

  function toggle(idx, field) {
    setList((curr) =>
      curr.map((p, i) => {
        if (i !== idx) return p;
        if (field === "presente") return { ...p, stato: p.stato === "presente" ? "assente" : "presente", in: p.stato === "presente" ? null : "14:05" };
        if (field === "giust") return { ...p, stato: p.stato === "assente_giustificato" ? "assente" : "assente_giustificato" };
        return p;
      })
    );
  }

  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Presenze</h1>
          <p>{date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="actions">
          <Btn variant="outline" size="sm" icon="log">Storico</Btn>
          <Btn variant="outline" size="sm">Ieri</Btn>
          <Btn variant="outline" size="sm">Domani</Btn>
        </div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <MiniStat label="Totali del giorno" value={tot} />
        <MiniStat label="Presenti" value={pres} tone="green" />
        <MiniStat label="Assenti" value={ass} tone="red" />
        <MiniStat label="Giustificati" value={giust} tone="warn" />
      </div>

      <Card className="flush">
        <CardHead
          title="Griglia di oggi"
          sub="Click su Presente per registrare ingresso · imposta uscita per chiudere"
          right={<Btn size="sm" icon="check">Salva tutto</Btn>}
        />
        <table className="table">
          <thead>
            <tr>
              <th>Bambino</th>
              <th>Iscrizione</th>
              <th>Ingresso</th>
              <th>Uscita</th>
              <th>Note</th>
              <th>Stato</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p, i) => (
              <tr key={p.bambino}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={p.bambino} size="sm" />
                    <span className="name">{p.bambino}</span>
                  </div>
                </td>
                <td className="muted">{p.iscrizione}</td>
                <td>
                  <input
                    className="input"
                    style={{ height: 30, width: 84, fontFamily: "var(--font-mono)", fontSize: 12.5 }}
                    placeholder="--:--"
                    defaultValue={p.in || ""}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    style={{ height: 30, width: 84, fontFamily: "var(--font-mono)", fontSize: 12.5 }}
                    placeholder="--:--"
                    defaultValue={p.out || ""}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    style={{ height: 30, fontSize: 12.5 }}
                    placeholder="—"
                  />
                </td>
                <td><StatePill stato={p.stato} /></td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    <Btn
                      variant={p.stato === "presente" ? "primary" : "outline"}
                      size="sm"
                      onClick={() => toggle(i, "presente")}
                    >
                      Presente
                    </Btn>
                    <Btn
                      variant={p.stato === "assente_giustificato" ? "primary" : "outline"}
                      size="sm"
                      onClick={() => toggle(i, "giust")}
                    >
                      Giust.
                    </Btn>
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

function MiniStat({ label, value, tone }) {
  return (
    <div className="stat" data-tone={tone}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

window.PageEducatori = PageEducatori;
window.PagePresenze = PagePresenze;
