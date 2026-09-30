import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubmissionOverviewTabProps {
  submission: {
    id: string;
    student: string;
    roll: string;
    courseCode: string;
    assignment: string;
    submitted: string;
    similarity: number;
    matchedSources: number;
    citationIssues: number;
    status: string;
    drafts?: number;
  };
  liveAnalysis: any;
  activePassages: any[];
  activeEvidence: {
    strong_percentage?: number;
    moderate_percentage?: number;
    semantic_percentage?: number;
  };
  citationIssuesCount: number;
  isWpUnavailable: boolean;
  activeWpStatus: string;
  proseWordCount: number;
  onNavigateTab: (
    tab: "overview" | "evidence" | "document" | "citations" | "review" | "report"
  ) => void;
}

export function SubmissionOverviewTab({
  submission,
  liveAnalysis,
  activePassages,
  activeEvidence,
  citationIssuesCount,
  isWpUnavailable,
  activeWpStatus,
  proseWordCount,
  onNavigateTab,
}: SubmissionOverviewTabProps) {
  const [technicalDetailsOpen, setTechnicalDetailsOpen] = useState(false);

  const similarityScore =
    liveAnalysis?.similarity_percentage ?? submission.similarity ?? 0;
  const matchedSourcesCount =
    submission.matchedSources ?? liveAnalysis?.matched_source_count ?? 0;
  const flaggedPassagesCount = activePassages.length;

  const conciseExplanation = (() => {
    if (similarityScore === 0 && citationIssuesCount > 0) {
      return `Document exhibits 0% textual similarity across indexed sources. However, ${citationIssuesCount} citation issue${
        citationIssuesCount === 1 ? "" : "s"
      } were detected during format compliance check. Review the citations tab before making a final determination.`;
    }
    if (similarityScore === 0 && citationIssuesCount === 0) {
      return "Zero textual overlap detected across indexed institutional databases, peer submissions, and scientific literature. Standard IEEE citation guidelines are satisfied. Automated check cleared.";
    }
    return `${flaggedPassagesCount} passage${
      flaggedPassagesCount === 1 ? "" : "s"
    } show meaningful overlap with ${matchedSourcesCount} identified source${
      matchedSourcesCount === 1 ? "" : "s"
    }. Review the highlighted evidence before making a decision.`;
  })();

  const isReviewed = submission.status === "reviewed";
  const needsReview =
    !isReviewed && (similarityScore >= 25 || citationIssuesCount > 0);

  return (
    <div className="mt-5 space-y-6 font-sans">
      {/* Primary Integrity Summary Box */}
      <div className="rounded-md border border-border bg-card p-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
          {/* Primary Similarity Metric */}
          <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Text Similarity
            </span>
            <div className="mt-1 flex items-baseline gap-3">
              <span
                className={`num text-5xl font-extrabold tracking-tight ${
                  similarityScore >= 25
                    ? "text-danger"
                    : similarityScore >= 10
                    ? "text-warning-foreground"
                    : "text-foreground"
                }`}
              >
                {similarityScore}%
              </span>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Document Overlap
              </span>
            </div>
          </div>

          {/* Only 4 Core Integrity Metrics */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Matched Sources
              </span>
              <p className="num text-2xl font-bold text-foreground">
                {matchedSourcesCount}
              </p>
              <p className="text-[10px] text-muted-foreground">Discovered records</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Flagged Passages
              </span>
              <p className="num text-2xl font-bold text-foreground">
                {flaggedPassagesCount}
              </p>
              <p className="text-[10px] text-muted-foreground">Requiring review</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Citation Issues
              </span>
              <p
                className={`num text-2xl font-bold ${
                  citationIssuesCount > 0 ? "text-amber-700" : "text-foreground"
                }`}
              >
                {citationIssuesCount}
              </p>
              <p className="text-[10px] text-muted-foreground">IEEE compliance</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Review Status
              </span>
              <div className="pt-0.5">
                {isReviewed ? (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-success-soft px-2 py-1 text-[11px] font-semibold text-success border border-success/30">
                    <CheckCircle2 className="size-3" /> Reviewed
                  </span>
                ) : needsReview ? (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 border border-amber-300">
                    <AlertTriangle className="size-3" /> Needs Review
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-success-soft px-2 py-1 text-[11px] font-semibold text-success border border-success/30">
                    <CheckCircle2 className="size-3" /> Cleared
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Faculty standing</p>
            </div>
          </div>
        </div>

        {/* Concise Evidence-Driven Explanation */}
        <div className="mt-6 rounded-md bg-muted/30 border border-border p-3.5 flex items-start gap-3">
          <ShieldCheck className="size-4 shrink-0 text-brand mt-0.5" />
          <div className="text-[12px] leading-relaxed text-foreground/90">
            <p>{conciseExplanation}</p>
          </div>
        </div>
      </div>

      {/* Three Questions: Faculty Decision-Assisting Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-md border border-border bg-card p-4 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="num flex size-4 items-center justify-center rounded-full bg-brand text-white text-[10px]">
              1
            </span>
            Is there something to review?
          </span>
          <p className="text-xs text-foreground/80 leading-relaxed">
            {similarityScore >= 25
              ? `Yes — Significant overlap (${similarityScore}%) detected across ${matchedSourcesCount} sources.`
              : citationIssuesCount > 0
              ? `Yes — ${citationIssuesCount} citation compliance issue(s) require verification.`
              : "No critical integrity flags detected. Document meets automatic clearance criteria."}
          </p>
          <div className="pt-1">
            {similarityScore > 0 || citationIssuesCount > 0 ? (
              <span className="inline-block rounded-xs bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-semibold border border-amber-300">
                Faculty Review Recommended
              </span>
            ) : (
              <span className="inline-block rounded-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-semibold border border-emerald-300">
                No Action Required
              </span>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-4 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="num flex size-4 items-center justify-center rounded-full bg-brand text-white text-[10px]">
              2
            </span>
            What evidence caused the flag?
          </span>
          <p className="text-xs text-foreground/80 leading-relaxed">
            {flaggedPassagesCount > 0
              ? `${flaggedPassagesCount} aligned passage(s) show textual or semantic correspondence.`
              : citationIssuesCount > 0
              ? "Numbered bibliography entries lack corresponding in-text bracket citations."
              : "No evidence thresholds were breached across indexed peer or web databases."}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {flaggedPassagesCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-brand"
                onClick={() => onNavigateTab("evidence")}
              >
                View Passages ({flaggedPassagesCount}) →
              </Button>
            )}
            {citationIssuesCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-amber-800 border-amber-300 hover:bg-amber-50"
                onClick={() => onNavigateTab("citations")}
              >
                View Citations ({citationIssuesCount}) →
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-4 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="num flex size-4 items-center justify-center rounded-full bg-brand text-white text-[10px]">
              3
            </span>
            What action should I take?
          </span>
          <p className="text-xs text-foreground/80 leading-relaxed">
            Evaluate aligned passages, request student clarification if needed, and record your formal determination.
          </p>
          <div className="pt-1">
            <Button
              size="sm"
              className="h-7 text-xs bg-brand text-white hover:bg-brand/90"
              onClick={() => onNavigateTab("review")}
            >
              Open Review Workspace →
            </Button>
          </div>
        </div>
      </div>

      {/* Collapsed Technical Analysis Section */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setTechnicalDetailsOpen(!technicalDetailsOpen)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              Technical Analysis ▾
            </span>
            <span className="text-[11px] text-muted-foreground">
              (Multi-layer signals, corroboration gate, and analysis metadata)
            </span>
          </div>
          {technicalDetailsOpen ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>

        {technicalDetailsOpen && (
          <div className="border-t border-border p-4 space-y-4 bg-muted/10 text-xs">
            {/* Multi-Layer Signals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-sm border border-border bg-card p-3">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                  Exact Similarity
                </span>
                <span className="num text-base font-bold text-foreground">
                  {liveAnalysis?.transparent_breakdown?.exactSimilarity ??
                    activeEvidence.strong_percentage ??
                    0}
                  %
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Verbatim n-gram match
                </span>
              </div>

              <div className="rounded-sm border border-border bg-card p-3">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                  Fuzzy Similarity
                </span>
                <span className="num text-base font-bold text-foreground">
                  {liveAnalysis?.transparent_breakdown?.fuzzySimilarity ??
                    activeEvidence.moderate_percentage ??
                    0}
                  %
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Lexical edit-distance
                </span>
              </div>

              <div className="rounded-sm border border-border bg-card p-3">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                  Semantic Similarity
                </span>
                <span className="num text-base font-bold text-foreground">
                  {liveAnalysis?.transparent_breakdown?.semanticSimilarity ??
                    activeEvidence.semantic_percentage ??
                    0}
                  %
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Contextual embedding
                </span>
              </div>

              <div className="rounded-sm border border-border bg-card p-3">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                  Corroboration Gate
                </span>
                <span className="num text-xs font-bold text-foreground">
                  {similarityScore === 0 ||
                  !activeEvidence ||
                  (activeEvidence.strong_percentage === 0 &&
                    activeEvidence.moderate_percentage === 0 &&
                    activeEvidence.semantic_percentage === 0)
                    ? "NOT APPLICABLE (0% Overlap)"
                    : (activeEvidence.strong_percentage || 0) >= 15
                    ? "CORROBORATED"
                    : "MODERATE"}
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Multi-engine verification
                </span>
              </div>
            </div>

            {/* Analysis Metadata & Observations */}
            <div className="rounded-sm border border-border bg-card p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Engine Processing Metadata & Observations
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] pt-1">
                <div>
                  <span className="text-muted-foreground block">Analysis Engine:</span>
                  <span className="font-mono font-medium text-foreground">
                    Verity Core v4.2 (Hybrid Multi-Layer)
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">
                    Writing Pattern Observation:
                  </span>
                  <span className="font-medium text-foreground">
                    {isWpUnavailable
                      ? "Writing pattern analysis unavailable (insufficient prose)"
                      : activeWpStatus === "Requires Review"
                      ? "Requires Review (informational only)"
                      : "Cadence consistent with standard academic prose"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Prose Sample Size:</span>
                  <span className="num font-medium text-foreground">
                    {proseWordCount} prose words (bibliography excluded)
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/60">
                Note: Stylometric writing pattern indicators are purely informational and do not constitute an automated plagiarism determination.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
