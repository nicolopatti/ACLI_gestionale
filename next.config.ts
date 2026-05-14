import type { NextConfig } from "next";

// Sessione 1 SECURITY_PLAN: HTTP security headers + CSP.
//
// 'unsafe-inline' su script-src e' temporaneo: serve a far passare il bootstrap
// del tema in app/layout.tsx (dangerouslySetInnerHTML). La sostituzione con un
// nonce e' tracciata come stretch goal nella sessione successiva del piano.
//
// In sviluppo aggiungiamo 'unsafe-eval' perche' React ricostruisce le stack trace
// via eval (lo dichiara la doc Next 16 in dist/docs/.../content-security-policy.md).
const isDev = process.env.NODE_ENV === "development";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// Distribuita in Report-Only: il browser segnala le violazioni in console / via
// report-uri ma NON le blocca. Dopo ~24h di osservazione in produzione senza
// segnalazioni, rinominare la key in "Content-Security-Policy" per attivare
// l'enforcing (vedi SECURITY_PLAN.md - Sessione 1).
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: cspDirectives },
];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "sonner"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
