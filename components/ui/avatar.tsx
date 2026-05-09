import * as React from "react";
import { cn } from "@/lib/utils";

export type AvatarSize = "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-[30px] h-[30px] text-[11.5px]",
  lg: "w-10 h-10 text-[14px]",
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: AvatarSize;
}

export function Avatar({ name, size = "md", className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full bg-[var(--primary)] text-[var(--primary-ink)]",
        "grid place-items-center font-semibold tracking-[0.02em] shrink-0 select-none",
        sizeClasses[size],
        className,
      )}
      aria-label={name}
      {...props}
    >
      {getInitials(name)}
    </div>
  );
}
