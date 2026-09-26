import { cn } from "@/lib/utils";

export interface Stat {
  label: string;
  value: string;
  tone?: "warning" | "danger" | "success";
  hint?: string;
}

export function StatBar({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 divide-border overflow-hidden rounded-md border border-border bg-card sm:grid-cols-3 sm:divide-x lg:grid-cols-5",
        className,
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="border-b border-border px-4 py-3 last:border-b-0 sm:border-b-0">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{s.label}</dt>
          <dd className="mt-1 flex items-baseline gap-2">
            <span
              className={cn(
                "num text-xl font-semibold",
                s.tone === "danger" && "text-danger",
                s.tone === "warning" && "text-warning-foreground",
                s.tone === "success" && "text-success",
              )}
            >
              {s.value}
            </span>
            {s.hint ? <span className="text-xs text-muted-foreground">{s.hint}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
