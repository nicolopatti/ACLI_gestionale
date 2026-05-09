import * as React from "react";
import { cn } from "@/lib/utils";

export type ProgressTone = "primary" | "gold" | "danger" | "success";

const fillByTone: Record<ProgressTone, string> = {
  primary: "bg-[var(--primary)]",
  gold: "bg-[var(--accent-solid)]",
  danger: "bg-[var(--danger)]",
  success: "bg-[var(--success)]",
};

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  tone?: ProgressTone;
  label?: string;
}

export function Progress({
  value,
  max = 100,
  tone = "primary",
  label,
  className,
  ...props
}: ProgressProps) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const pct = ratio * 100;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label={label}
      className={cn(
        "h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden relative",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0.7,0.2,1)]",
          fillByTone[tone],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
