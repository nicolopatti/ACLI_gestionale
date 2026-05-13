import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { listMovimentiInRange } from "@/lib/db/movimenti";
import { listVociRendiconto } from "@/lib/db/voci-rendiconto";
import { listCategorie } from "@/lib/db/categorie";
import { aggregaRendiconto, rendicontoToCsv } from "@/lib/rendiconto/aggregate";

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.ruolo !== "admin") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }
  const url = new URL(req.url);
  const annoParam = url.searchParams.get("anno");
  const anno = Number.parseInt(annoParam ?? "", 10) || new Date().getFullYear();
  const [movimenti, voci, categorie] = await Promise.all([
    listMovimentiInRange(`${anno}-01-01`, `${anno}-12-31`),
    listVociRendiconto(),
    listCategorie(),
  ]);
  const r = aggregaRendiconto(anno, movimenti, voci, categorie);
  const csv = rendicontoToCsv(r);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rendiconto-${anno}.csv"`,
    },
  });
}
