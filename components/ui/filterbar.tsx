import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterBar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2.5 mb-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface FilterSearchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

export const FilterSearch = React.forwardRef<HTMLInputElement, FilterSearchProps>(
  ({ className, placeholder = "Cerca…", ...props }, ref) => (
    <div className="relative flex items-center">
      <Search
        className="absolute left-2.5 w-3.5 h-3.5 text-[var(--muted-foreground)] pointer-events-none"
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        className={cn(
          "h-[34px] rounded-lg border border-[var(--border)] bg-[var(--surface)]",
          "pl-8 pr-3 text-[12.5px] text-[var(--ink)] outline-none",
          "min-w-[220px] focus:border-[var(--primary)]",
          "placeholder:text-[var(--muted-foreground)]",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
FilterSearch.displayName = "FilterSearch";

export type FilterSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const FilterSelect = React.forwardRef<HTMLSelectElement, FilterSelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-[34px] rounded-lg border border-[var(--border)] bg-[var(--surface)]",
        "px-3 pr-8 text-[12.5px] text-[var(--ink)] outline-none cursor-pointer",
        "focus:border-[var(--primary)]",
        // arrow icon as inline SVG bg
        "bg-no-repeat bg-[length:14px_14px] bg-[position:right_10px_center]",
        "appearance-none",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%237b7770' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
      }}
      {...props}
    >
      {children}
    </select>
  ),
);
FilterSelect.displayName = "FilterSelect";

export function FilterSpacer() {
  return <div className="ml-auto" />;
}
