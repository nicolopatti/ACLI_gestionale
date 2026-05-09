"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex gap-0.5 border-b border-[var(--border)] mb-[18px]",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "px-3.5 py-2.5 text-[13px] font-medium text-[var(--muted-foreground)]",
      "border-b-2 border-transparent -mb-px cursor-pointer",
      "hover:text-[var(--ink-2)] transition-colors",
      "data-[state=active]:text-[var(--ink)] data-[state=active]:border-[var(--primary)]",
      "focus-visible:outline-hidden focus-visible:text-[var(--ink)]",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("focus-visible:outline-hidden", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export function TabCount({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "ml-1.5 text-[11px] text-[var(--muted-2)] tabular-nums font-normal",
        className,
      )}
    >
      {children}
    </span>
  );
}
