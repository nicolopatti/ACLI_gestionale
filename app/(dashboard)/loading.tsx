import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-[var(--muted)] rounded" />
        <div className="h-4 w-72 bg-[var(--muted)] rounded opacity-70" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="h-3 w-20 bg-[var(--muted)] rounded" />
              <div className="h-7 w-24 bg-[var(--muted)] rounded" />
              <div className="h-3 w-32 bg-[var(--muted)] rounded opacity-70" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <div className="h-5 w-40 bg-[var(--muted)] rounded" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 py-2">
                  <div className="h-8 w-8 bg-[var(--muted)] rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 bg-[var(--muted)] rounded" />
                    <div className="h-3 w-1/2 bg-[var(--muted)] rounded opacity-70" />
                  </div>
                  <div className="h-5 w-16 bg-[var(--muted)] rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
