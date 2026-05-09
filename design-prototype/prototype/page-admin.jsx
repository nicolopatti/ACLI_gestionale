/* global React, ACLI_DATA, Ico, Btn, Badge, Card, CardHead, Avatar, fmtEur, fmtN */
const { useState: useStateAdm, useMemo: useMemoAdm } = React;

// ============ ADMIN HOME ============
function PageAdmHome({ go }) {
  const D = ACLI_DATA;
  const saldoTot = D.conti.Cassa.saldo + D.conti.BCC.saldo + D.conti.Sumup.saldo;
  const morosi = D.iscrizioni.filter((i) => i.stato === "in_ritardo");
  const morositaTot = morosi.reduce((a, i) => a + (i.mesi.tot - i.mesi.pagati) * i.importo, 0);
  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Cruscotto presidenza</h1>
          <p>Stato dell'associazione · maggio 2026 · accesso completo</p>
        </div>
        <div className="actions">
          <Btn variant="outline" size="sm" icon="download">Report mensile</Btn>
          <Btn size="sm" icon="plus">Nuovo movimento</Btn>
        </div>
      </div>

      <div className="stats">
        <KPI label="Saldo totale conti" value={fmtEur(saldoTot)} icon="wallet" tone="green" hint={`Cassa · BCC · Sumup`} />
        <KPI label="Morosità educativo" value={fmtEur(morositaTot)} icon="alert" tone={morositaTot > 0 ? "red" : "green"} hint={`${morosi.length} iscrizioni in ritardo`} />
        <KPI label="Eventi in programma" value={D.eventi.filter((e) => e.stato !== "concluso").length} icon="calendar" hint={`${D.eventi.length} totali in agenda`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <Card className="flush">
          <CardHead title="Situazione finanziaria" sub="Aprile → maggio 2026" right={<Btn variant="ghost" size="sm" icon="arrowRight" iconRight="chevron" onClick={() => go("cassa")}>Vedi cassa</Btn>} />
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {Object.entries(D.conti).map(([k, c]) => (
              <div key={k} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)" }}>
                <div className="row" style={{ gap: 8, fontSize: 12, color: "var(--muted)" }}>
                  <Ico name={k === "Cassa" ? "cash" : k === "BCC" ? "bank" : "card"} size={13} />{k}
                </div>
                <div style={{ fontSize: 22, fontFamily: "var(--font-serif)", fontWeight: 500, marginTop: 6 }}>{fmtEur(c.saldo)}</div>
                <div className="row" style={{ gap: 10, fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  <span style={{ color: "var(--success-soft-ink)" }}>+{fmtEur(c.entrate)}</span>
                  <span>−{fmtEur(c.uscite)}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "0 20px 18px" }}>
            <TrendChart trend={D.trend} />
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginTop: 16 }}>
        <Card className="flush">
          <CardHead title="Eventi e iniziative" sub="Prossimi appuntamenti" right={<Btn variant="ghost" size="sm" iconRight="chevron" onClick={() => go("eventi")}>Apri</Btn>} />
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            {D.eventi.map((e) => (
              <div key={e.id} className="row" style={{ gap: 12, padding: 12, border: "1px solid var(--border)", borderRadius: 10 }}>
                <div style={{ width: 56, textAlign: "center", padding: "8px 4px", borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent-soft-ink)" }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{e.data.split("/")[1]}/{e.data.split("/")[2]}</div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, lineHeight: 1 }}>{e.data.split("/")[0]}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="name">{e.nome}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{e.luogo} · resp. {e.responsabile}</div>
                </div>
                <Badge tone={e.stato === "concluso" ? "green" : e.stato === "in_preparazione" ? "warn" : "blue"} dot>
                  {e.stato.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value, icon, hint, tone }) {
  return (
    <div className="stat" data-tone={tone}>
      <div className="label"><Ico name={icon} /> {label}</div>
      <div className="value">{value}</div>
      {hint && <div className="delta"><Ico name="dot" size={8} /> {hint}</div>}
    </div>
  );
}

function TrendChart({ trend }) {
  const max = Math.max(...trend.map((t) => Math.max(t.e, t.u)));
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${trend.length}, 1fr)`, gap: 4, alignItems: "end", height: 100, marginTop: 6 }}>
      {trend.map((t, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ display: "flex", gap: 2, alignItems: "end", height: 80, width: "100%", justifyContent: "center" }}>
            <div style={{ width: 6, height: `${(t.e / max) * 100}%`, background: "var(--primary)", borderRadius: 1 }} />
            <div style={{ width: 6, height: `${(t.u / max) * 100}%`, background: "var(--accent)", borderRadius: 1, opacity: 0.6 }} />
          </div>
          <div style={{ fontSize: 9.5, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{t.d}</div>
        </div>
      ))}
    </div>
  );
}

// ============ EVENTI ============
function PageEventi() {
  const D = ACLI_DATA;
  return (
    <div className="content">
      <div className="page-head">
        <div className="titles">
          <h1>Eventi e iniziative</h1>
          <p>Feste, raccolte fondi, cene sociali · 2026</p>
        </div>
        <div className="actions">
          <Btn size="sm" icon="plus">Nuovo evento</Btn>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {D.eventi.map((e) => (
          <Card key={e.id}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <Badge tone={e.stato === "concluso" ? "green" : e.stato === "in_preparazione" ? "warn" : "blue"} dot>{e.stato.replace("_", " ")}</Badge>
              <span className="muted" style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{e.data}</span>
            </div>
            <h3 style={{ margin: "4px 0 6px", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 500 }}>{e.nome}</h3>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>{e.luogo} · resp. {e.responsabile}</div>
            <div className="row" style={{ gap: 12, fontSize: 12 }}>
              <div style={{ flex: 1, padding: 10, background: "var(--surface-2)", borderRadius: 8 }}>
                <div className="muted" style={{ fontSize: 11 }}>Budget</div>
                <div className="eur" style={{ fontWeight: 500 }}>{fmtEur(e.budget)}</div>
              </div>
              <div style={{ flex: 1, padding: 10, background: "var(--surface-2)", borderRadius: 8 }}>
                <div className="muted" style={{ fontSize: 11 }}>Incassato</div>
                <div className="eur" style={{ fontWeight: 500, color: e.incassato > 0 ? "var(--success-soft-ink)" : "var(--ink)" }}>{fmtEur(e.incassato)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

window.PageAdmHome = PageAdmHome;
window.PageEventi = PageEventi;
