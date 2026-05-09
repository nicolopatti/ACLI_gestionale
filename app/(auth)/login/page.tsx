import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Pannello "art": brand + claim. Nascosto sotto lg per dare priorità al form. */}
      <aside
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, var(--accent-soft) 0%, transparent 60%), " +
            "radial-gradient(ellipse at 100% 100%, var(--primary-soft) 0%, transparent 55%), " +
            "var(--bg-elev)",
        }}
        aria-hidden="false"
      >
        <div className="flex items-center gap-3.5">
          <Image
            src="/logo-acli.png"
            alt=""
            width={56}
            height={56}
            priority
            className="rounded-xl bg-white p-1 border border-[var(--border)]"
          />
          <div>
            <div className="font-serif text-[22px] font-medium tracking-tight leading-tight">
              Circolo ACLI
            </div>
            <div className="text-[12px] text-[var(--muted-foreground)] uppercase tracking-[0.06em]">
              Calvisano
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <p className="font-serif text-[26px] leading-[1.3] tracking-tight text-[var(--ink)]">
            Un gestionale pensato per chi{" "}
            <em className="text-[var(--primary)] not-italic">tiene la cassa</em>, fa
            l&apos;appello, accoglie le famiglie.
          </p>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-5 leading-relaxed">
            Due aree separate:{" "}
            <strong className="text-[var(--ink)] font-medium">Amministrazione</strong>{" "}
            per il direttivo,{" "}
            <strong className="text-[var(--ink)] font-medium">Attività educative</strong>{" "}
            per coordinatori ed educatori.
          </p>
        </div>

        <div className="text-[11px] text-[var(--muted-foreground)] tracking-[0.04em]">
          ACLI Gestionale · MVP 2026
        </div>
      </aside>

      {/* Pannello form: occupa tutto lo schermo sotto lg */}
      <main className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm space-y-6">
          {/* Brand inline visibile solo sotto lg, dove l'aside è nascosto */}
          <div className="flex items-center gap-3 lg:hidden">
            <Image
              src="/logo-acli.png"
              alt=""
              width={40}
              height={40}
              className="rounded-lg bg-white p-1 border border-[var(--border)]"
            />
            <div>
              <div className="font-serif text-[16px] font-medium tracking-tight leading-tight">
                Circolo ACLI
              </div>
              <div className="text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-[0.06em]">
                Calvisano
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="font-serif text-[26px] font-medium tracking-tight">
              Bentornato
            </h1>
            <p className="text-[13px] text-[var(--muted-foreground)]">
              Accedi al gestionale con le tue credenziali.
            </p>
          </div>

          <LoginForm />

          <p className="text-[11.5px] text-[var(--muted-foreground)] text-center">
            Hai problemi di accesso? Contatta un amministratore.
          </p>
        </div>
      </main>
    </div>
  );
}
