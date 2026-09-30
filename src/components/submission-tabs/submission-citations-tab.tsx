import { BookMarked, CheckCircle2, AlertTriangle, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubmissionCitationsTabProps {
  citationAnalysis: any;
  onJumpToParagraph: (paragraphId: string) => void;
}

export function SubmissionCitationsTab({
  citationAnalysis,
  onJumpToParagraph,
}: SubmissionCitationsTabProps) {
  const totalCitations =
    citationAnalysis?.totalReferencesCount ??
    citationAnalysis?.references ??
    citationAnalysis?.inTextCitationsCount ??
    citationAnalysis?.inText ??
    0;

  const issues: any[] = citationAnalysis?.issues || [];
  const issuesNeedingAttention = issues.length;
  const wellFormed = Math.max(0, totalCitations - issuesNeedingAttention);

  return (
    <div className="space-y-6">
      {/* Primary Citation Metric Cards */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookMarked className="size-5 text-brand" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground font-serif">
                Citation Integrity Analysis
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Style verification and reference attribution for the submitted document.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Format Style:</span>
              <span className="rounded bg-brand/10 px-1.5 py-0.5 font-mono font-semibold text-brand">
                {citationAnalysis?.style || "IEEE"}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Summary Counters */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-muted/20 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Citations
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="num text-3xl font-bold text-foreground">{totalCitations}</span>
              <span className="text-xs text-muted-foreground">detected</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              In-text brackets and bibliography entries.
            </p>
          </div>

          <div className="rounded-md border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Well-Formed
              </span>
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="num text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                {wellFormed}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">attributed</span>
            </div>
            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400/80">
              Properly matched between text and bibliography.
            </p>
          </div>

          <div className={`rounded-md border p-4 ${
            issuesNeedingAttention > 0
              ? "border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20"
              : "border-border bg-muted/20"
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                issuesNeedingAttention > 0
                  ? "text-amber-800 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}>
                Need Attention
              </span>
              {issuesNeedingAttention > 0 && (
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`num text-3xl font-bold ${
                issuesNeedingAttention > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-foreground"
              }`}>
                {issuesNeedingAttention}
              </span>
              <span className="text-xs text-muted-foreground">issues</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {issuesNeedingAttention > 0
                ? "Discrepancies requiring faculty review."
                : "No citation discrepancies found."}
            </p>
          </div>
        </div>
      </div>

      {/* Citation Issues List */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Citations Needing Attention ({issuesNeedingAttention})
        </h3>

        {issues.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-md border border-dashed border-border py-10 text-center">
            <CheckCircle2 className="size-8 text-emerald-600" />
            <h4 className="mt-2 text-sm font-semibold text-foreground">
              All Citations Validated
            </h4>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Every in-text citation correctly links to its corresponding bibliographic entry, and no uncited sources were identified.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {issues.map((issue, idx) => {
              const targetParagraph = issue.target || `p-${idx + 1}`;
              const citationLabel =
                issue.referenceNumber !== undefined
                  ? `Reference [${issue.referenceNumber}]`
                  : issue.referenceText
                  ? issue.referenceText
                  : `Citation Issue #${idx + 1}`;

              return (
                <div
                  key={issue.id || `issue-${idx}`}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                      <span className="text-xs font-bold">{idx + 1}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {citationLabel}
                        </span>
                        {issue.target && (
                          <span className="num rounded-xs bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground border border-border">
                            {issue.target}
                          </span>
                        )}
                        <span className="rounded-xs border border-amber-500/30 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          {issue.type ? issue.type.replace(/_/g, " ") : "Citation Issue"}
                        </span>
                      </div>

                      <p className="text-sm text-foreground/90">
                        {issue.text || issue.reason || "Missing or misaligned citation reference in document."}
                      </p>

                      {issue.referenceText && (
                        <p className="text-xs italic text-muted-foreground">
                          Bibliography entry: "{issue.referenceText}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-brand hover:text-brand"
                      onClick={() => onJumpToParagraph(targetParagraph)}
                    >
                      <FileText className="size-3.5" />
                      View in Document
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
