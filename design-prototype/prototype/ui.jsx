/* global React */
const { useState, useMemo, useEffect, useRef, createContext, useContext } = React;

// ---------- Tiny icon set (lucide-style strokes) ----------
const Ico = (props) => {
  const { name, size = 16, className = "icon", ...rest } = props;
  const paths = ICONS[name] || ICONS.dot;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
};

const ICONS = {
  dot: '<circle cx="12" cy="12" r="2"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/>',
  baby: '<circle cx="12" cy="12" r="9"/><path d="M9 11h.01M15 11h.01M9 15s1 1 3 1 3-1 3-1"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/>',
  range: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  check: '<path d="M21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/><path d="m9 12 2 2 6-6"/>',
  hands: '<path d="M11 13.7 8.5 11.3a2 2 0 0 1 0-2.8L13 4l5 5-3 3-4-4"/><path d="M3 14a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3v-1"/>',
  bank: '<rect x="3" y="10" width="18" height="11" rx="1"/><path d="M3 10 12 4l9 6"/><path d="M7 14v3M12 14v3M17 14v3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  filter: '<path d="M3 4h18l-7 9v5l-4 2v-7z"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  chevron: '<polyline points="9 6 15 12 9 18"/>',
  chevronDown: '<polyline points="6 9 12 15 18 9"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  euro: '<path d="M18 7a7 7 0 1 0 0 10"/><line x1="3" y1="10" x2="13" y2="10"/><line x1="3" y1="14" x2="13" y2="14"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11l-1.27 1.27a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  arrowUp: '<path d="m12 19V5M5 12l7-7 7 7"/>',
  arrowDown: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  side: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M5 19l1.5-1.5"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  drama: '<path d="M3 11h18l-1 8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  train: '<rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M8 19l-2 3M16 19l2 3"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/>',
  calc: '<rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.4"/>',
  trending: '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9 1.65 1.65 0 0 0 4.27 7.18l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  flag: '<path d="M4 22V4a1 1 0 0 1 1-1h12l-2 5 2 5H5"/>',
  log: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 4v4M9 14h.01M15 14h.01"/><path d="M9 19c0 1 1 2 3 2s3-1 3-2"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="2.5"/><path d="M22 18a5 5 0 0 0-6-4.6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  star: '<polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9"/>',
  pin: '<path d="M12 22s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  paperclip: '<path d="M21 11.5 12 20a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7-7"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5 7l1.5-3a2 2 0 0 1 2-1.4h7a2 2 0 0 1 2 1.4L19 7v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/>',
};

// ---------- Generic UI ----------
function Btn({ as = "button", variant = "primary", size, icon, iconRight, children, ...rest }) {
  const cls = ["btn", variant, size].filter(Boolean).join(" ");
  const Tag = as;
  return (
    <Tag className={cls} {...rest}>
      {icon && <Ico name={icon} />}
      {children}
      {iconRight && <Ico name={iconRight} />}
    </Tag>
  );
}

function Badge({ tone, dot, children, solid }) {
  return (
    <span className={"badge" + (solid ? " solid" : "")} data-tone={tone || ""}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

function StatePill({ stato }) {
  const map = {
    pagato: { tone: "green", label: "Pagato" },
    parziale: { tone: "warn", label: "Parziale" },
    non_pagato: { tone: "red", label: "Non pagato" },
    in_corso: { tone: "blue", label: "In corso" },
    completata: { tone: "green", label: "Completata" },
    in_ritardo: { tone: "red", label: "In ritardo" },
    valido: { tone: "green", label: "Valido" },
    errato: { tone: "red", label: "Errato" },
    corretto: { tone: "blue", label: "Correzione" },
    presente: { tone: "green", label: "Presente" },
    assente: { tone: "red", label: "Assente" },
    assente_giustificato: { tone: "warn", label: "Giustificato" },
  };
  const m = map[stato] || { tone: "", label: stato };
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}

function Card({ children, className = "", ...rest }) {
  return <div className={"card " + className} {...rest}>{children}</div>;
}
function CardHead({ title, sub, right }) {
  return (
    <div className="card-head">
      <div className="card-head-titles">
        <h3>{title}</h3>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right && <div className="card-head-right">{right}</div>}
    </div>
  );
}

function BrandMark({ size = 40 }) {
  return (
    <img
      src={(typeof window !== "undefined" && window.__resources && window.__resources.logoAcli) || "assets/logo-acli.png"}
      alt="ACLI"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", flex: "none", display: "block" }}
    />
  );
}

function Avatar({ name, size }) {
  const init = (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return <div className={"avatar " + (size || "")}>{init}</div>;
}

function Drawer({ open, onClose, children }) {
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">{children}</aside>
    </>
  );
}

function Dialog({ open, onClose, title, sub, children, footer, width }) {
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="dialog" style={width ? { width } : null}>
        {(title || sub) && (
          <div className="dialog-head">
            {title && <h3>{title}</h3>}
            {sub && <p>{sub}</p>}
          </div>
        )}
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </>
  );
}

// ---------- Helpers ----------
function fmtEur(n) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);
}
function fmtN(n) {
  return new Intl.NumberFormat("it-IT").format(n || 0);
}

// ---------- Toast ----------
const ToastCtx = createContext(() => {});
function ToastHost({ children }) {
  const [t, setT] = useState(null);
  const show = (msg) => {
    setT(msg);
    clearTimeout(show._);
    show._ = setTimeout(() => setT(null), 2200);
  };
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && (
        <div className="toast">
          <Ico name="check" /> {t}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
const useToast = () => useContext(ToastCtx);

Object.assign(window, {
  Ico, Btn, Badge, StatePill, Card, CardHead, BrandMark, Avatar, Drawer, Dialog,
  fmtEur, fmtN, ToastHost, useToast,
});
