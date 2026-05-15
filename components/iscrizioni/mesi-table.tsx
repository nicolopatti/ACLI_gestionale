import { SegnaPagatoDialog } from "./segna-pagato-dialog";
import { AnnullaPagamentoButton } from "./annulla-pagamento-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatEur, meseAnnoLabel } from "@/lib/utils";
import type { MeseIscrizione, Sessione } from "@/lib/db/types";

interface Props {
  mesi: MeseIscrizione[];
  sessioniById?: Map<string, Sessione>;
}

function periodoLabel(m: MeseIscrizione, sessione?: Sessione): string {
  // Le righe pacchetto/quota_iscrizione/sconto non hanno sessione: l'etichetta
  // umana viaggia in descrizione_riga.
  if (m.descrizioneRiga) return m.descrizioneRiga;
  if (sessione?.etichetta) return sessione.etichetta;
  if (m.tipoUnita === "mese" && m.meseAnno) return meseAnnoLabel(m.meseAnno);
  return m.chiavePeriodo ?? m.meseAnno ?? "—";
}

function tipoRigaBadge(m: MeseIscrizione) {
  switch (m.tipoRiga) {
    case "pacchetto":
      return <Badge variant="secondary" className="ml-2 text-[10px]">pacchetto</Badge>;
    case "quota_iscrizione":
      return <Badge variant="outline" className="ml-2 text-[10px]">quota</Badge>;
    case "sconto":
      return <Badge variant="destructive" className="ml-2 text-[10px]">sconto</Badge>;
    case "sessione":
    default:
      return null;
  }
}

export function MesiTable({ mesi, sessioniById }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Periodo</TableHead>
          <TableHead>Dovuto</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead>Pagato il</TableHead>
          <TableHead>Mezzo</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mesi.map((m) => {
          const sessione = m.sessioneId ? sessioniById?.get(m.sessioneId) : undefined;
          const isSconto = m.tipoRiga === "sconto";
          // Sconti: importo negativo, niente flow di pagamento, niente azione.
          return (
            <TableRow key={m.recordId}>
              <TableCell className="font-medium capitalize">
                {periodoLabel(m, sessione)}
                {tipoRigaBadge(m)}
              </TableCell>
              <TableCell
                className={isSconto ? "text-[var(--destructive)] tabular-nums" : "tabular-nums"}
              >
                {formatEur(m.importoDovuto)}
              </TableCell>
              <TableCell>
                {isSconto ? (
                  <span className="text-xs text-[var(--muted-foreground)]">—</span>
                ) : m.statoPagamento === "pagato" ? (
                  <Badge variant="success">Pagato {formatEur(m.importoPagato)}</Badge>
                ) : m.statoPagamento === "parziale" ? (
                  <Badge variant="warning">Parziale</Badge>
                ) : (
                  <Badge variant="outline">Non pagato</Badge>
                )}
              </TableCell>
              <TableCell>{formatDate(m.dataPagamento)}</TableCell>
              <TableCell>{m.mezzoPagamento ?? "—"}</TableCell>
              <TableCell className="text-right">
                {isSconto ? null : m.statoPagamento === "pagato" ? (
                  <AnnullaPagamentoButton meseId={m.recordId} />
                ) : (
                  <SegnaPagatoDialog mese={m} />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
