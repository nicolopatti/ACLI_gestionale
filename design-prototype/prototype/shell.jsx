/* global React, Ico, Btn, Avatar, BrandMark, ACLI_DATA */

const NAV = {
  amm: {
    label: "Amministrazione",
    sub: "Direttivo · Presidenza",
    icon: "shield",
    items: [
      { id: "adm-home", icon: "home", label: "Cruscotto" },
      { id: "eventi", icon: "calendar", label: "Eventi e iniziative" },
      { id: "cassa", icon: "bank", label: "Cassa e finanze", count: 14 },
      { id: "utenti", icon: "user", label: "Utenti gestionale" },
    ],
  },
  edu: {
    label: "Attività educative",
    sub: "Doposcuola · Laboratori · Estate",
    icon: "cap",
    items: [
      { id: "edu-home", icon: "home", label: "Cruscotto educativo" },
      { id: "bambini", icon: "baby", label: "Bambini", count: 12 },
      { id: "educatori", icon: "hands", label: "Educatori", count: 5 },
      { id: "attivita", icon: "range", label: "Attività" },
      { id: "iscrizioni", icon: "cap", label: "Iscrizioni", count: 41 },
      { id: "presenze", icon: "check", label: "Presenze" },
      { id: "turni", icon: "calendar", label: "Turni · calendario" },
      { id: "spese-edu", icon: "plus", label: "Registra movimento" },
      { id: "cassa-edu", icon: "wallet", label: "Cassa educativa" },
    ],
  },
};

const ROLE_ACCESS = {
  admin: { amm: NAV.amm.items.map((i) => i.id), edu: NAV.edu.items.map((i) => i.id) },
  coordinatore_educativo: { edu: NAV.edu.items.map((i) => i.id) },
  volontario_cassa: { amm: ["cassa"] },
};

function visibleSections(ruolo) {
  const access = ROLE_ACCESS[ruolo] || {};
  const out = [];
  for (const key of ["amm", "edu"]) {
    if (!access[key]) continue;
    const items = NAV[key].items.filter((i) => access[key].includes(i.id));
    if (items.length) out.push({ key, ...NAV[key], items });
  }
  return out;
}

function areaOfRoute(route) {
  for (const key of ["amm", "edu"]) {
    if (NAV[key].items.some((i) => i.id === route)) return key;
  }
  return "amm";
}

function Sidebar({ route, onNav, collapsed, user }) {
  const sections = visibleSections(user.ruolo);
  return (
    <aside className="sidebar" data-collapsed={collapsed}>
      <div className="sidebar-brand">
        <BrandMark size={40} />
        <div className="brand-text">
          <div className="name">Circolo ACLI</div>
          <div className="sub">Calvisano</div>
        </div>
      </div>
      <nav className="nav">
        {sections.map((s, i) => (
          <div className="nav-section" key={s.key} data-area={s.key}>
            <div className="nav-section-head">
              <Ico name={s.icon} size={13} />
              <div className="nav-section-titles">
                <div className="nav-section-label">{s.label}</div>
                <div className="nav-section-sub">{s.sub}</div>
              </div>
            </div>
            {s.items.map((it) => (
              <div
                className="nav-item"
                key={it.id}
                data-active={route === it.id}
                onClick={() => onNav(it.id)}
              >
                <Ico name={it.icon} className="icon" />
                <span>{it.label}</span>
                {it.count != null && <span className="badge">{it.count}</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <span className="dot" /> <span>Sync n8n · 2 min fa</span>
      </div>
    </aside>
  );
}

const ROUTE_LABELS = {
  "adm-home": ["Amministrazione", "Cruscotto"],
  eventi: ["Amministrazione", "Eventi e iniziative"],
  cassa: ["Amministrazione", "Cassa e finanze"],
  utenti: ["Amministrazione", "Utenti gestionale"],
  "edu-home": ["Attività educative", "Cruscotto"],
  bambini: ["Attività educative", "Bambini"],
  educatori: ["Attività educative", "Educatori"],
  attivita: ["Attività educative", "Attività"],
  iscrizioni: ["Attività educative", "Iscrizioni"],
  presenze: ["Attività educative", "Presenze"],
  turni: ["Attività educative", "Turni e calendario"],
  "spese-edu": ["Attività educative", "Registra movimento"],
  "cassa-edu": ["Attività educative", "Cassa educativa"],
};

function Topbar({ route, theme, onTheme, setCollapsed, onLogout, user }) {
  const labels = ROUTE_LABELS[route] || [route];
  const area = areaOfRoute(route);
  const D = ACLI_DATA;
  return (
    <header className="topbar" data-area={area}>
      <button
        className="btn ghost icon-only sm"
        onClick={() => setCollapsed((c) => !c)}
        title="Comprimi sidebar"
      >
        <Ico name="side" />
      </button>
      <div className="area-pill" data-area={area}>
        <span className="dot" />
        {area === "amm" ? "Amministrazione" : "Attività educative"}
      </div>
      <div className="crumb">
        {labels.map((l, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="crumb-sep">/</span>}
            {i === labels.length - 1 ? <b>{l}</b> : <span>{l}</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="search">
        <Ico name="search" />
        <input placeholder="Cerca…" readOnly />
        <kbd>⌘K</kbd>
      </div>
      <button
        className="btn ghost icon-only sm"
        onClick={() => onTheme(theme === "dark" ? "light" : "dark")}
        title="Cambia tema"
      >
        <Ico name={theme === "dark" ? "sun" : "moon"} />
      </button>
      <button className="btn ghost icon-only sm" title="Notifiche">
        <Ico name="bell" />
      </button>
      <div className="user-pill" onClick={onLogout} title="Esci">
        <Avatar name={user.nome} />
        <div className="who">
          {user.nome}
          <small>{D.ruoliLabel[user.ruolo]}</small>
        </div>
      </div>
    </header>
  );
}

Object.assign(window, { Sidebar, Topbar, NAV, ROLE_ACCESS, areaOfRoute, visibleSections });
