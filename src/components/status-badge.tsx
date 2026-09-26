import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/lib/mock-data";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        info: "border-brand/25 bg-brand-soft text-brand",
        success: "border-success/25 bg-success-soft text-success",
        warning: "border-warning/30 bg-warning-soft text-warning-foreground",
        danger: "border-danger/25 bg-danger-soft text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge2({
  tone,
  className,
  children,
}: VariantProps<typeof badgeVariants> & { className?: string; children: React.ReactNode }) {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>;
}

const statusMap: Record<ReviewStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral"; mark: string }> = {
  reviewed: { label: "Reviewed", tone: "success", mark: "●" },
  review: { label: "Requires Review", tone: "warning", mark: "▲" },
  pending: { label: "Pending", tone: "neutral", mark: "○" },
  flagged: { label: "High Similarity", tone: "danger", mark: "■" },
};

export function StatusBadge({ status, className }: { status: ReviewStatus; className?: string }) {
  const s = statusMap[status];
  return (
    <Badge2 tone={s.tone} className={className}>
      <span aria-hidden="true" className="text-[8px] leading-none">
        {s.mark}
      </span>
      {s.label}
    </Badge2>
  );
}

export function similarityTone(value: number): "success" | "warning" | "danger" {
  if (value >= 30) return "danger";
  if (value >= 20) return "warning";
  return "success";
}

export function SimilarityValue({ value }: { value: number }) {
  const tone = similarityTone(value);
  return (
    <span
      className={cn(
        "num font-medium",
        tone === "danger" && "text-danger",
        tone === "warning" && "text-warning-foreground",
        tone === "success" && "text-foreground",
      )}
    >
      {value}%
    </span>
  );
}
