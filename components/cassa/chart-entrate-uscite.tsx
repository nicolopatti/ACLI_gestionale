"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEur } from "@/lib/utils";

interface MeseData {
  mese: number;
  entrate: number;
  uscite: number;
}

interface Props {
  data: MeseData[];
}

const MESI_LABEL = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
];

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[12px] shadow-md">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block size-2 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-[var(--muted-foreground)]">{item.name}:</span>
          <span className="font-mono tabular-nums">
            {formatEur(Number(item.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChartEntrateUscite({ data }: Props) {
  const chartData = data.map((d) => ({
    mese: MESI_LABEL[d.mese - 1] ?? String(d.mese),
    Entrate: d.entrate,
    Uscite: d.uscite,
  }));
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="mese"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
            width={48}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.3 }}
            content={<CustomTooltip />}
          />
          <Bar
            dataKey="Entrate"
            fill="var(--success)"
            radius={[3, 3, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            dataKey="Uscite"
            fill="var(--danger)"
            radius={[3, 3, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
