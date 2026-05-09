/* global React, ACLI_DATA, Ico, Btn, Badge, StatePill, Card, CardHead, Avatar, Drawer, fmtEur, fmtN */
const { useState: useStateB, useMemo: useMemoB } = React;

function PageBambini({ go }) {
  const D = ACLI_DATA;
  const [tab, setTab] = useStateB("tutti");
  const [q, setQ] = useStateB("");
  const [scuola, setScuola] = useStateB("");
  const [open, setOpen] = useStateB(null);

  const list = useMemoB(() => {
    return D.bambini.filter((b) => {
      if (tab === "attivi" && !b.attivo) return false;
      if (tab === "saldo" && b.saldo === 0) return false;
      if (tab === "archivio" && b.attivo) return false;
      if (scuola && b.scuola !== scuola) return false;
      if (q) {
        const s = (b.nome + " " + b.cognome + " " + b.genitore).toLowerCase();
        if (!s.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [D, tab, scuola, q]);

  const counts = {
    tutti: D.bambini.length,
    attivi: D.bambini.filter((b) => b.attivo).length,
    saldo: D.bambini.filter((b) => b.saldo > 0).length,
    archivio: D.bambini.filter((b) => !b.attivo).length,
  };

  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Bambini</h1>
          <p>Anagrafica iscritti, genitori e contatti aggiuntivi</p>
        </div>
        <div className="actions">
          <Btn variant="outline" size="sm" icon="download">Esporta CSV</Btn>
          <Btn icon="plus" size="sm">Nuovo bambino</Btn>
        </div>
      </div>

      <div className="tabs">
        {[
          ["tutti", "Tutti"],
          ["attivi", "Attivi"],
          ["saldo", "Con saldo aperto"],
          ["archivio", "Archivio"],
        ].map(([k, l]) => (
          <div key={k} className="tab" data-active={tab === k} onClick={() => setTab(k)}>
            {l}<span className="count">{counts[k]}</span>
          </div>
        ))}
      </div>

      <div className="filterbar">
        <div className="filter-input has-search" style={{ width: 280 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per nome o genitore"
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              flex: 1,
              fontSize: 12.5,
              fontFamily: "inherit",
              color: "inherit",
            }}
          />
        </div>
        <select className="filter-input" value={scuola} onChange={(e) => setScuola(e.target.value)}>
          <option value="">Tutte le scuole</option>
          <option>Don Milani</option>
          <option>G. Bertinotti</option>
          <option>A. Manzoni</option>
        </select>
        <select className="filter-input">
          <option>Tutte le classi</option>
        </select>
        <select className="filter-input">
          <option>Tutte le iscrizioni</option>
        </select>
        <span className="spacer" />
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {list.length} di {D.bambini.length} bambini
        </span>
      </div>

      <Card className="flush">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" /></th>
              <th>Bambino</th>
              <th>Classe / Scuola</th>
              <th>Iscrizione</th>
              <th>Genitore</th>
              <th>Pres. mese</th>
              <th className="num">Saldo aperto</th>
              <th>Stato</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id} onClick={() => setOpen(b)} style={{ cursor: "pointer" }}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={`${b.nome} ${b.cognome}`} />
                    <div>
                      <div className="name">{b.nome} {b.cognome}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>nato il {new Date(b.dataNascita).toLocaleDateString("it-IT")}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ color: "var(--ink)" }}>{b.classe}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{b.scuola}</div>
                </td>
                <td>{b.iscrizione === "—" ? <span className="muted">—</span> : <Badge tone={b.iscrizione.includes("Doposcuola") ? "green" : b.iscrizione.includes("Laboratorio") ? "gold" : "blue"}>{b.iscrizione}</Badge>}</td>
                <td>
                  <div style={{ color: "var(--ink)" }}>{b.genitore}</div>
                  <div className="muted" style={{ fontSize: 11.5, fontFamily: "var(--font-mono)" }}>{b.telefono}</div>
                </td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <div className="bar" style={{ width: 60 }}>
                      <div className="fill" style={{ width: `${(b.presenzeMese / 16) * 100}%` }} />
                    </div>
                    <span className="muted" style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{b.presenzeMese}/16</span>
                  </div>
                </td>
                <td className="num eur" style={{ color: b.saldo > 0 ? "var(--danger-soft-ink)" : "var(--muted)", fontWeight: b.saldo > 0 ? 500 : 400 }}>
                  {b.saldo > 0 ? fmtEur(b.saldo) : "—"}
                </td>
                <td>{b.attivo ? <Badge tone="green" dot>Attivo</Badge> : <Badge>Archiviato</Badge>}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Btn variant="ghost" size="sm" icon="more" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Drawer open={!!open} onClose={() => setOpen(null)}>
        {open && <BambinoDrawer b={open} onClose={() => setOpen(null)} />}
      </Drawer>
    </div>
  );
}

function BambinoDrawer({ b, onClose }) {
  return (
    <>
      <div className="drawer-head">
        <div className="row" style={{ gap: 14 }}>
          <Avatar name={`${b.nome} ${b.cognome}`} size="lg" />
          <div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em" }}>
              {b.nome} {b.cognome}
            </h2>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <Badge tone="green" dot>{b.attivo ? "Attivo" : "Archiviato"}</Badge>
              <span className="muted" style={{ fontSize: 12 }}>{b.classe} · {b.scuola}</span>
            </div>
          </div>
        </div>
        <Btn variant="ghost" size="sm" icon="close" onClick={onClose} />
      </div>
      <div className="drawer-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
          <KV label="Data di nascita" value={new Date(b.dataNascita).toLocaleDateString("it-IT")} />
          <KV label="Iscrizione attiva" value={b.iscrizione} />
          <KV label="Saldo aperto" value={fmtEur(b.saldo)} highlight={b.saldo > 0} />
          <KV label="Presenze del mese" value={`${b.presenzeMese}/16`} />
        </div>

        <SectionTitle>Genitore di riferimento</SectionTitle>
        <Card className="tight" style={{ marginBottom: 22 }}>
          <div className="row" style={{ gap: 12 }}>
            <Avatar name={b.genitore} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{b.genitore}</div>
              <div className="row" style={{ gap: 14, fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                <span className="row" style={{ gap: 4 }}><Ico name="phone" size={12} /> {b.telefono}</span>
                <span className="row" style={{ gap: 4 }}><Ico name="mail" size={12} /> genitore@email.it</span>
              </div>
            </div>
            <Btn variant="outline" size="sm" icon="edit">Modifica</Btn>
          </div>
        </Card>

        <SectionTitle>Calendario settimanale</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 22 }}>
          {[["lun","Lun"],["mar","Mar"],["mer","Mer"],["gio","Gio"],["ven","Ven"]].map(([k, l]) => (
            <div key={k} style={{
              padding: 10,
              borderRadius: 8,
              background: b.giorni.includes(k) ? "var(--primary-soft)" : "var(--surface-2)",
              color: b.giorni.includes(k) ? "var(--primary-soft-ink)" : "var(--muted)",
              textAlign: "center",
              border: "1px solid var(--border)",
              fontSize: 12,
              fontWeight: 500,
            }}>
              {l}
              <div style={{ fontSize: 10.5, marginTop: 4, opacity: 0.7 }}>
                {b.giorni.includes(k) ? (b.fasceOrarie.length === 2 ? "14–18" : b.fasceOrarie[0] || "—") : "—"}
              </div>
            </div>
          ))}
        </div>

        <SectionTitle>Pagamenti dell'iscrizione</SectionTitle>
        <Card className="flush" style={{ marginBottom: 22 }}>
          <table className="table">
            <thead>
              <tr><th>Mese</th><th className="num">Importo</th><th>Mezzo</th><th>Stato</th></tr>
            </thead>
            <tbody>
              {ACLI_DATA.rate.map((r, i) => (
                <tr key={i}>
                  <td className="name">{r.mese}</td>
                  <td className="num eur">{fmtEur(r.importo)}</td>
                  <td>{r.mezzo ? <Badge>{r.mezzo}</Badge> : <span className="muted">—</span>}</td>
                  <td><StatePill stato={r.stato} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <SectionTitle>Note</SectionTitle>
        <Card className="tight">
          <p style={{ margin: 0, color: b.note ? "var(--ink)" : "var(--muted)" }}>
            {b.note || "Nessuna nota."}
          </p>
        </Card>
      </div>
      <div className="drawer-foot">
        <Btn variant="danger outline" size="sm" icon="trash">Archivia</Btn>
        <div className="row" style={{ gap: 8 }}>
          <Btn variant="outline" size="sm">Modifica</Btn>
          <Btn size="sm" icon="euro">Segna pagato</Btn>
        </div>
      </div>
    </>
  );
}

function KV({ label, value, highlight }) {
  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 8,
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
    }}>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: highlight ? "var(--danger-soft-ink)" : "var(--ink)" }}>{value}</div>
    </div>
  );
}
function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--muted)",
      marginBottom: 10,
    }}>{children}</div>
  );
}

window.PageBambini = PageBambini;
