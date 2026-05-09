import type { Metadata } from "next";
import { DM_Sans, Newsreader } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ACLI Gestionale",
  description: "Gestionale per l'associazione: doposcuola, presenze, pagamenti.",
};

// Applica `data-theme` (da localStorage) e `data-area` (dal pathname)
// prima dell'idratazione, così non si vede il flash dei colori sbagliati.
// Le rotte amministrative iniziano con /cassa o /utenti — tutto il resto è "edu".
const chromeBootstrap = `
(function () {
  var d = document.documentElement;
  try {
    var t = localStorage.getItem("acli-theme") || "light";
    d.setAttribute("data-theme", t);
  } catch (_) {
    d.setAttribute("data-theme", "light");
  }
  var p = window.location.pathname || "";
  var area = (p.indexOf("/cassa") === 0 || p.indexOf("/utenti") === 0) ? "amm" : "edu";
  d.setAttribute("data-area", area);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      data-area="edu"
      data-theme="light"
      className={`${dmSans.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: chromeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
