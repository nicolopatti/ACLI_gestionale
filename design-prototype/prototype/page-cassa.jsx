/* global React, ACLI_DATA, Ico, Btn, Badge, StatePill, Card, CardHead, fmtEur, fmtN */
const { useState: useStateC, useMemo: useMemoC } = React;

function PageCassa() {
  const D = ACLI_DATA;
  const [conto, setConto] = useStateC("");
  const [tipo, setTipo] = useStateC("");
  const [q, setQ] = useStateC("");
  const list = useMemoC(() => D.movimenti.filter((m) => {
    if (conto && m.conto !== conto) return false;
    if (tipo && m.tipo !== tipo) return false;
    if (q && !(m.descrizione + " " + m.categoria + " " + m.volontario).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [D, conto, tipo, q]);

  const totE = list.filter((m) => m.tipo === "Entrata").reduce((a, m) => a + m.importo, 0);
  const totU = list.filter((m) => m.tipo === "Uscita").reduce((a, m) => a + m.importo, 0);

  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Cassa</h1>
          <p>Movimenti sincronizzati da Telegram bot e Google Sheets · maggio 2026</p>
        </div>
        <div className="actions">
          <Btn variant="outline" size="sm" icon="bot">Stato sync</Btn>
          <Btn variant="outline" size="sm" icon="download">Esporta CSV</Btn>
          <Btn icon="plus" size="sm">Nuovo movimento</Btn>
        </div>
      </div>

      <div className="stats">
        <ContoStat nome="Cassa" {...D.conti.Cassa} icon="cash" />
        <ContoStat nome="BCC" {...D.conti.BCC} icon="bank" />
        <ContoStat nome="Sumup" {...D.conti.Sumup} icon="card" />
        <div className="stat" data-tone="green">
          <div className="label"><Ico name="wallet" /> Saldo totale</div>
          <div className="value">{fmtEur(D.conti.Cassa.saldo + D.conti.BCC.saldo + D.conti.Sumup.saldo)}</div>
          <div className="delta up"><Ico name="trending" size={12} /> +{fmtEur(totE - totU)} filtrato</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <Card className="flush">
          <div style={{ padding: 16, borderBottom: "1px solid var(--border)", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div className="filter-input has-search" style={{ width: 280 }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca descrizione, categoria, volontario"
                style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 12.5, fontFamily: "inherit" }}
              />
            </div>
            <select className="filter-input" value={conto} onChange={(e) => setConto(e.target.value)}>
              <option value="">Tutti i conti</option>
              <option>Cassa</option><option>BCC</option><option>Sumup</option>
            </select>
            <select className="filter-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Entrate + Uscite</option>
              <option>Entrata</option><option>Uscita</option>
            </select>
            <select className="filter-input"><option>Tutte le categorie</option></select>
            <span className="spacer" />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{list.length} movimenti</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Data</th><th>Tipo</th><th>Descrizione</th><th>Categoria</th>
                <th>Conto</th><th>Volontario</th><th>Stato</th><th className="num">Importo</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id} data-selected={m.stato === "errato"}>
                  <td className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{m.data}</td>
                  <td>
                    <span className="row" style={{ gap: 6, color: m.tipo === "Entrata" ? "var(--success-soft-ink)" : "var(--ink-2)" }}>
                      <Ico name={m.tipo === "Entrata" ? "arrowDown" : "arrowUp"} size={13} />
                      {m.tipo}
                    </span>
                  </td>
                  <td className="name">{m.descrizione}</td>
                  <td className="muted">{m.categoria}</td>
                  <td><Badge>{m.conto}</Badge></td>
                  <td className="muted">{m.volontario}</td>
                  <td><StatePill stato={m.stato} /></td>
                  <td className="num eur" style={{
                    fontWeight: 500,
                    color: m.stato === "errato" ? "var(--muted-2)" : m.tipo === "Entrata" ? "var(--success-soft-ink)" : "var(--ink)",
                    textDecoration: m.stato === "errato" ? "line-through" : "none",
                  }}>
                    {m.tipo === "Entrata" ? "+" : "−"}{fmtEur(m.importo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="card-foot">
            <span>Pagina 1 di 1 · {list.length} risultati</span>
            <span className="row" style={{ gap: 14 }}>
              <span>Totale entrate <b style={{ color: "var(--success-soft-ink)" }}>+{fmtEur(totE)}</b></span>
              <span>Totale uscite <b>−{fmtEur(totU)}</b></span>
              <span>Saldo periodo <b className="eur">{fmtEur(totE - totU)}</b></span>
            </span>
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card className="flush">
            <CardHead title="Categorie" sub="Distribuzione del mese" />
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {ACLI_DATA.categorie.map((c) => (
                <div key={c.nome}>
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5 }}>{c.nome}</span>
                    <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{c.n}</span>
                  </div>
                  <div className="bar">
                    <div className="fill" style={{
                      width: `${(c.n / 38) * 100}%`,
                      background: c.tipo === "Entrata" ? "var(--primary)" : "var(--accent)",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="flush">
            <CardHead title="Sync n8n" right={<Badge tone="green" dot>Attivo</Badge>} />
            <div style={{ padding: 18, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <Ico name="bot" />
                <span><b>Cassa Bot Telegram</b> · ultimo sync 2 min fa</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Ico name="refresh" />
                <span><b>Sheet → Airtable</b> · ogni 5 minuti</span>
              </div>
              <div className="divider" />
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                I movimenti registrati via Telegram appaiono qui entro 5 minuti.
                Le correzioni si propagano automaticamente.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ContoStat({ nome, saldo, entrate, uscite, icon }) {
  return (
    <div className="stat">
      <div className="label"><Ico name={icon} /> {nome}</div>
      <div className="value">{fmtEur(saldo)}</div>
      <div className="row" style={{ gap: 14, fontSize: 11, color: "var(--muted)" }}>
        <span style={{ color: "var(--success-soft-ink)" }}>+{fmtEur(entrate)}</span>
        <span>−{fmtEur(uscite)}</span>
      </div>
    </div>
  );
}

function PageUtenti() {
  const D = ACLI_DATA;
  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Utenti</h1>
          <p>Account ammessi al gestionale · {D.utenti.length} totali</p>
        </div>
        <div className="actions">
          <Btn icon="plus" size="sm">Nuovo utente</Btn>
        </div>
      </div>

      <Card className="flush">
        <table className="table">
          <thead>
            <tr>
              <th>Utente</th><th>Email</th><th>Ruolo</th><th>Ultimo accesso</th><th>Stato</th><th></th>
            </tr>
          </thead>
          <tbody>
            {D.utenti.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={u.nome} />
                    <span className="name">{u.nome}</span>
                  </div>
                </td>
                <td className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{u.email}</td>
                <td>
                  {u.ruolo === "admin"
                    ? <Badge tone="green" dot>Admin</Badge>
                    : <Badge tone="gold" dot>Volontario cassa</Badge>}
                </td>
                <td className="muted">{u.ultimoAccesso}</td>
                <td>{u.attivo ? <Badge tone="green">Attivo</Badge> : <Badge tone="red">Disattivato</Badge>}</td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    <Btn variant="ghost" size="sm" icon="edit" />
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

window.PageCassa = PageCassa;
window.PageUtenti = PageUtenti;
