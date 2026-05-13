import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function IscrizioneDetailLoading() {
  return (
    <div className="max-w-4xl space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-72 bg-[var(--muted)] rounded" />
        <div className="h-4 w-56 bg-[var(--muted)] rounded opacity-70" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <div className="h-3 w-24 bg-[var(--muted)] rounded" />
              <div className="h-7 w-28 bg-[var(--muted)] rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-5 w-32 bg-[var(--muted)] rounded" />
        </CardHeader>
        <CardContent className="p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] last:border-0"
            >
              <div className="h-4 w-24 bg-[var(--muted)] rounded" />
              <div className="h-4 w-32 bg-[var(--muted)] rounded" />
              <div className="flex-1" />
              <div className="h-6 w-20 bg-[var(--muted)] rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
