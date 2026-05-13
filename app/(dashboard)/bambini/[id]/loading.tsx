import { Card, CardContent } from "@/components/ui/card";

export default function BambinoDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 bg-[var(--muted)] rounded-full" />
        <div className="space-y-2">
          <div className="h-6 w-56 bg-[var(--muted)] rounded" />
          <div className="h-3.5 w-40 bg-[var(--muted)] rounded opacity-70" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-[var(--muted)] rounded" />
        ))}
      </div>
      <Card>
        <CardContent className="p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-3 gap-3 py-1.5">
              <div className="h-4 w-24 bg-[var(--muted)] rounded opacity-70" />
              <div className="h-4 w-full bg-[var(--muted)] rounded col-span-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
