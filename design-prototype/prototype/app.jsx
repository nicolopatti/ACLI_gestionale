/* global React, ReactDOM, ACLI_DATA, Ico, Btn, Badge, Card, CardHead, Dialog, Avatar, BrandMark, fmtEur,
   Sidebar, Topbar, ToastHost, useToast, NAV, ROLE_ACCESS, areaOfRoute, visibleSections,
   PageDashboard, PageBambini, PageAttivita, PageIscrizioni, PageEducatori, PagePresenze, PageCassa, PageUtenti,
   PageAdmHome, PageEventi,
   PageEduHome, PageTurni, PageCassaEdu, PageSpeseEdu,
   useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle */
const { useState: useStateApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "warm",
  "density": "comfortable",
  "theme": "light",
  "sidebar": "expanded",
  "accentByArea": true,
  "showLogin": false,
  "fontset": "dashboard"
}/*EDITMODE-END*/;

const PAGES = {
  "adm-home": PageAdmHome,
  eventi: PageEventi,
  cassa: PageCassa,
  utenti: PageUtenti,
  "edu-home": PageEduHome,
  bambini: PageBambini,
  educatori: PageEducatori,
  attivita: PageAttivita,
  iscrizioni: PageIscrizioni,
  presenze: PagePresenze,
  turni: PageTurni,
  "spese-edu": PageSpeseEdu,
  "cassa-edu": PageCassaEdu,
  dashboard: PageDashboard, // legacy alias
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [user, setUser] = useStateApp(null);
  const [route, setRoute] = useStateApp(null);
  const [collapsed, setCollapsed] = useStateApp(false);

  useEffectApp(() => {
    document.documentElement.setAttribute("data-palette", t.palette);
    document.documentElement.setAttribute("data-density", t.density);
    document.documentElement.setAttribute("data-theme", t.theme);
  }, [t.palette, t.density, t.theme]);

  useEffectApp(() => {
    setCollapsed(t.sidebar === "icons");
  }, [t.sidebar]);

  useEffectApp(() => {
    document.documentElement.setAttribute("data-fontset", t.fontset || "editoriale");
  }, [t.fontset]);

  // login flag from tweaks
  useEffectApp(() => {
    if (t.showLogin) setUser(null);
  }, [t.showLogin]);

  // area follows route
  const area = route ? areaOfRoute(route) : "amm";
  useEffectApp(() => {
    document.documentElement.setAttribute("data-area", t.accentByArea ? area : "none");
  }, [area, t.accentByArea]);

  if (!user) {
    return (
      <>
        <LoginScreen onEnter={(u) => {
          setUser(u);
          setRoute(u.landing);
          if (t.showLogin) setTweak("showLogin", false);
        }} />
        <TweaksUI t={t} setTweak={setTweak} />
      </>
    );
  }

  // role-aware route guard
  const access = ROLE_ACCESS[user.ruolo] || {};
  const allowed = Object.values(access).flat();
  const safeRoute = allowed.includes(route) ? route : (user.landing || allowed[0]);
  const Page = PAGES[safeRoute] || PageAdmHome;

  return (
    <>
      <div className="app" data-collapsed={collapsed} data-area={area}>
        <Sidebar
          route={safeRoute}
          onNav={setRoute}
          collapsed={collapsed}
          user={user}
        />
        <div className="main">
          <Topbar
            route={safeRoute}
            theme={t.theme}
            onTheme={(v) => setTweak("theme", v)}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            onLogout={() => setUser(null)}
            user={user}
          />
          <Page go={setRoute} />
        </div>
      </div>
      <TweaksUI t={t} setTweak={setTweak} />
    </>
  );
}

function TweaksUI({ t, setTweak }) {
  return (
    <TweaksPanel title="Tweaks ACLI">
      <TweakSection label="Palette">
        <TweakColor
          label="Tema colore"
          value={t.palette}
          options={["warm", "acli", "mono"]}
          onChange={(v) => setTweak("palette", v)}
        />
        <TweakToggle
          label="Accent diverso per area"
          value={!!t.accentByArea}
          onChange={(v) => setTweak("accentByArea", v)}
        />
      </TweakSection>
      <TweakSection label="Layout">
        <TweakRadio
          label="Densità"
          value={t.density}
          options={[{ value: "comfortable", label: "Comoda" }, { value: "compact", label: "Densa" }]}
          onChange={(v) => setTweak("density", v)}
        />
        <TweakRadio
          label="Sidebar"
          value={t.sidebar}
          options={[{ value: "expanded", label: "Espansa" }, { value: "icons", label: "Icone" }]}
          onChange={(v) => setTweak("sidebar", v)}
        />
        <TweakRadio
          label="Tema"
          value={t.theme}
          options={[{ value: "light", label: "Chiaro" }, { value: "dark", label: "Scuro" }]}
          onChange={(v) => setTweak("theme", v)}
        />
      </TweakSection>
      <TweakSection label="Tipografia">
        <TweakRadio
          label="Set di font"
          value={t.fontset || "editoriale"}
          options={[
            { value: "editoriale", label: "Editoriale" },
            { value: "istituzionale", label: "Istituzionale" },
            { value: "caldo", label: "Caldo" },
            { value: "display", label: "Display" },
            { value: "dashboard", label: "Dashboard" },
          ]}
          onChange={(v) => setTweak("fontset", v)}
        />
      </TweakSection>
      <TweakSection label="Schermate">
        <TweakToggle
          label="Mostra login"
          value={!!t.showLogin}
          onChange={(v) => setTweak("showLogin", v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

function LoginScreen({ onEnter }) {
  const D = ACLI_DATA;
  const [sel, setSel] = useStateApp(D.accounts[0].id);
  const cur = D.accounts.find((a) => a.id === sel);
  return (
    <div className="login" data-area="amm">
      <div className="login-art">
        <div className="row" style={{ gap: 14 }}>
          <BrandMark size={56} />
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
            Circolo ACLI<br />
            <span style={{ fontSize: 13, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Calvisano</span>
          </div>
        </div>
        <div className="quote">
          Un gestionale pensato per chi <em>tiene la cassa, fa l'appello, accoglie le famiglie.</em>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--muted)", marginTop: 18, lineHeight: 1.6 }}>
            Due aree separate: <b>Amministrazione</b> per il presidente,<br />
            <b>Attività educative</b> per coordinatori ed educatori.
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>
          ACLI Gestionale · MVP 2026
        </div>
      </div>
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={(e) => { e.preventDefault(); onEnter(cur); }}>
          <h2>Bentornato</h2>
          <p className="lead">Seleziona un profilo demo per entrare nell'area corrispondente.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {D.accounts.map((a) => (
              <button key={a.id} type="button" onClick={() => setSel(a.id)} className="account-card" data-active={sel === a.id}>
                <Avatar name={a.nome} />
                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{a.nome}</span>
                    {a.ruolo === "admin" && <Badge tone="green" dot>tutto</Badge>}
                    {a.ruolo === "coordinatore_educativo" && <Badge tone="gold" dot>educativo</Badge>}
                    {a.ruolo === "volontario_cassa" && <Badge tone="blue" dot>cassa</Badge>}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{D.ruoliLabel[a.ruolo]} · {a.email}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label>Email</label>
            <input className="input" type="email" value={cur.email} readOnly />
          </div>
          <div className="field" style={{ marginBottom: 18 }}>
            <label>Password</label>
            <input className="input" type="password" defaultValue="••••••••" />
          </div>
          <Btn size="lg" style={{ width: "100%", justifyContent: "center" }}>
            Entra come {cur.nome.split(" ")[0]}
          </Btn>
          <div style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center", marginTop: 16 }}>
            Hai problemi di accesso? Contatta un amministratore.
          </div>
        </form>
      </div>
    </div>
  );
}

function Root() {
  return (
    <ToastHost>
      <App />
    </ToastHost>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
