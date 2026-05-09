/* global React, ACLI_DATA, Ico, Btn, Badge, StatePill, Card, CardHead, Avatar, fmtEur, fmtN, useToast */
const { useState: useStateD, useMemo: useMemoD } = React;

// ============ DASHBOARD ============
function PageDashboard({ go }) {
  const D = ACLI_DATA;
  const totaleSaldo = D.conti.Cassa.saldo + D.conti.BCC.saldo + D.conti.Sumup.saldo;
  const totaleEntrate = D.conti.Cassa.entrate + D.conti.BCC.entrate + D.conti.Sumup.entrate;
  const totaleUscite = D.conti.Cassa.uscite + D.conti.BCC.uscite + D.conti.Sumup.uscite;
  const presOggi = D.presenzeOggi.filter((p) => p.stato === "presente").length;
  const presTot = D.presenzeOggi.length;

  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Buongiorno, Nicolò</h1>
          <p>Riepilogo del gestionale · maggio 2026 · Anno scolastico 2025–2026</p>
        </div>
        <div className="actions">
          <Btn variant="outline" icon="download" size="sm">Esporta riepilogo</Btn>
          <Btn icon="plus" size="sm" onClick={() => go("iscrizioni")}>Nuova iscrizione</Btn>
        </div>
      </div>

      <div className="stats">
        <Stat
          label="Bambini attivi" value={fmtN(D.bambini.filter((b) => b.attivo).length)}
          delta="+2 rispetto ad aprile" tone="green" icon="baby"
        />
        <Stat
          label="Mesi non pagati" value={fmtN(D.iscrizioni.reduce((a, i) => a + (i.mesi.tot - i.mesi.pagati), 0))}
          delta="del mese in corso" tone="gold" icon="cap"
        />
        <Stat
          label="Presenze oggi" value={`${presOggi}/${presTot}`}
          delta={`${Math.round((presOggi / presTot) * 100)}% di presenza`} tone="blue" icon="check"
        />
        <Stat
          label="Saldo totale" value={fmtEur(totaleSaldo)}
          delta={`+${fmtEur(totaleEntrate - totaleUscite)} questo mese`} tone="green" icon="wallet" deltaUp
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card className="flush">
          <CardHead
            title="Movimenti ultimi 14 giorni"
            sub={`Entrate ${fmtEur(D.trend.reduce((a, t) => a + t.e, 0))} · Uscite ${fmtEur(D.trend.reduce((a, t) => a + t.u, 0))}`}
            right={
              <div className="row" style={{ gap: 14, fontSize: 12, color: "var(--muted)" }}>
                <span className="row" style={{ gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--primary)" }} /> Entrate
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--accent)" }} /> Uscite
                </span>
              </div>
            }
          />
          <div style={{ padding: "20px 24px 24px" }}>
            <TrendChart data={D.trend} />
          </div>
        </Card>
        <Card className="flush">
          <CardHead
            title="Saldi conti"
            right={<Btn variant="ghost" size="sm" icon="refresh" />}
          />
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.entries(D.conti).map(([k, v]) => (
              <ContoRow key={k} nome={k} saldo={v.saldo} entrate={v.entrate} uscite={v.uscite} />
            ))}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Saldo totale</span>
              <span className="eur lg">{fmtEur(totaleSaldo)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card className="flush">
          <CardHead
            title="Mesi da incassare"
            sub="Iscrizioni con rate ancora aperte"
            right={<Btn variant="ghost" size="sm" iconRight="chevron" onClick={() => go("iscrizioni")}>Tutte</Btn>}
          />
          <div>
            {D.iscrizioni.filter((i) => i.stato === "in_ritardo").slice(0, 4).map((i) => (
              <div key={i.id} className="row" style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", gap: 14 }}>
                <Avatar name={i.bambino} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{i.bambino}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{i.modalita}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="eur" style={{ fontWeight: 500 }}>{fmtEur(i.importo * (i.mesi.tot - i.mesi.pagati))}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{i.mesi.tot - i.mesi.pagati} rate aperte</div>
                </div>
                <Btn variant="outline" size="sm">Sollecita</Btn>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flush">
          <CardHead
            title="Presenze oggi"
            sub={new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
            right={<Btn variant="ghost" size="sm" iconRight="chevron" onClick={() => go("presenze")}>Apri griglia</Btn>}
          />
          <div>
            {D.presenzeOggi.slice(0, 6).map((p) => (
              <div key={p.bambino} className="row" style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", gap: 14 }}>
                <Avatar name={p.bambino} size="sm" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{p.bambino}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{p.iscrizione}</div>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--muted)" }}>
                  {p.in || "—"} → {p.out || "…"}
                </div>
                <StatePill stato={p.stato} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="flush">
        <CardHead
          title="Ultimi movimenti"
          sub="Sincronizzati da Telegram bot e cassa"
          right={
            <div className="row" style={{ gap: 8 }}>
              <Badge tone="green" dot>Sync attivo</Badge>
              <Btn variant="ghost" size="sm" iconRight="chevron" onClick={() => go("cassa")}>Vai a Cassa</Btn>
            </div>
          }
        />
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrizione</th>
              <th>Conto</th>
              <th>Volontario</th>
              <th>Stato</th>
              <th className="num">Importo</th>
            </tr>
          </thead>
          <tbody>
            {D.movimenti.slice(0, 7).map((m) => (
              <tr key={m.id}>
                <td className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{m.data}</td>
                <td>
                  <span className="row" style={{ gap: 6 }}>
                    <Ico name={m.tipo === "Entrata" ? "arrowDown" : "arrowUp"} size={13} />
                    {m.tipo}
                  </span>
                </td>
                <td className="name">{m.descrizione}</td>
                <td><Badge>{m.conto}</Badge></td>
                <td className="muted">{m.volontario}</td>
                <td><StatePill stato={m.stato} /></td>
                <td className="num eur" style={{ color: m.tipo === "Entrata" ? "var(--success-soft-ink)" : "var(--ink)", fontWeight: 500 }}>
                  {m.tipo === "Entrata" ? "+" : "−"}{fmtEur(m.importo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Stat({ label, value, delta, tone, icon, deltaUp }) {
  return (
    <div className="stat" data-tone={tone}>
      <div className="label">
        <Ico name={icon} /> {label}
      </div>
      <div className="value">{value}</div>
      <div className={"delta " + (deltaUp ? "up" : "")}>
        {deltaUp && <Ico name="trending" size={12} />} {delta}
      </div>
    </div>
  );
}

function ContoRow({ nome, saldo, entrate, uscite }) {
  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <span className="row" style={{ gap: 8 }}>
          <Ico name={nome === "Cassa" ? "cash" : nome === "BCC" ? "bank" : "card"} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{nome}</span>
        </span>
        <span className="eur" style={{ fontWeight: 500 }}>{fmtEur(saldo)}</span>
      </div>
      <div className="bar"><div className="fill" style={{ width: `${Math.min(100, (saldo / 9000) * 100)}%` }} /></div>
      <div className="row" style={{ justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
        <span>Entrate {fmtEur(entrate)}</span>
        <span>Uscite {fmtEur(uscite)}</span>
      </div>
    </div>
  );
}

function TrendChart({ data }) {
  const max = Math.max(...data.flatMap((d) => [d.e, d.u]));
  const w = 720;
  const h = 200;
  const padX = 20;
  const padY = 16;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const step = innerW / (data.length - 1);
  const yE = (v) => padY + innerH - (v / max) * innerH;
  const lineE = data.map((d, i) => `${i === 0 ? "M" : "L"} ${padX + i * step} ${yE(d.e)}`).join(" ");
  const lineU = data.map((d, i) => `${i === 0 ? "M" : "L"} ${padX + i * step} ${yE(d.u)}`).join(" ");
  const areaE = lineE + ` L ${padX + (data.length - 1) * step} ${padY + innerH} L ${padX} ${padY + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
      <defs>
        <linearGradient id="gE" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <line key={p} x1={padX} x2={w - padX} y1={padY + p * innerH} y2={padY + p * innerH} stroke="var(--border)" strokeDasharray="2 4" />
      ))}
      <path d={areaE} fill="url(#gE)" />
      <path d={lineE} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
      <path d={lineU} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={padX + i * step} cy={yE(d.e)} r="3" fill="var(--bg-elev)" stroke="var(--primary)" strokeWidth="1.5" />
          <text x={padX + i * step} y={h - 2} textAnchor="middle" fontSize="9.5" fill="var(--muted)" fontFamily="var(--font-mono)">
            {d.d}
          </text>
        </g>
      ))}
    </svg>
  );
}

window.PageDashboard = PageDashboard;
