import { SegnaPagatoDialog } from "./segna-pagato-dialog";
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
import type { MeseIscrizione } from "@/lib/airtable/types";

export function MesiTable({ mesi }: { mesi: MeseIscrizione[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mese</TableHead>
          <TableHead>Dovuto</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead>Pagato il</TableHead>
          <TableHead>Mezzo</TableHead>
          <TableHead className="text-right">Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mesi.map((m) => (
          <TableRow key={m.recordId}>
            <TableCell className="font-medium capitalize">{meseAnnoLabel(m.meseAnno)}</TableCell>
            <TableCell>{formatEur(m.importoDovuto)}</TableCell>
            <TableCell>
              {m.statoPagamento === "pagato" ? (
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
              {m.statoPagamento !== "pagato" && <SegnaPagatoDialog mese={m} />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
