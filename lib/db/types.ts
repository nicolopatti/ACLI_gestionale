// Domain types — re-export shim verso lib/airtable/types finche' non si
// rimuove definitivamente la dipendenza Airtable (STATUS.md indica
// "dopo 1 settimana di osservazione" del cutover Supabase). I tipi
// vengono sicuramente da Postgres, il nome del pacchetto e' una traccia
// storica. Quando si farà la rimozione, basta spostare il contenuto di
// `lib/airtable/types.ts` qui e cancellare la cartella `lib/airtable/`.
export * from "@/lib/airtable/types";
