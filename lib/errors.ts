// SECURITY_PLAN sessione 3: error message hardening.
//
// `BusinessError` segna gli errori "user-friendly" (validazioni di
// business, autorizzazione negata, vincoli funzionali). Le server
// action mostrano il `userMessage` direttamente.
//
// Tutti gli altri throw — eccezioni Supabase, invarianti rotti,
// timeout di rete, ecc. — restano come `Error` normali: il chiamante
// li intercetta, logga lato server e mostra al client il messaggio
// generico in `fallback`. Cosi' i dettagli del DB (es. "duplicate key
// value violates unique constraint users_email_key") non escono mai
// dal server.
export class BusinessError extends Error {
  readonly userMessage: string;
  constructor(userMessage: string) {
    super(userMessage);
    this.userMessage = userMessage;
    this.name = "BusinessError";
  }
}

export function userErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof BusinessError) return e.userMessage;
  return fallback;
}
