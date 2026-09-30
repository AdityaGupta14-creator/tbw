import { Check, CheckCircle2, ExternalLink, Eye, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReviewedPassageRecord, ReviewedPassageStatus } from "@/types/database";

interface SubmissionEvidenceTabProps {
  activePassages: any[];
  currentUserRole: string;
  reviewedPassages?: ReviewedPassageRecord[] | undefined;
  onSelectMatch: (match: any) => void;
  onRecordPassageReview: (status: ReviewedPassageStatus, passageId: string) => Promise<void>;
  onJumpToParagraph: (pId: string) => void;
}

export function SubmissionEvidenceTab({
  activePassages,
  currentUserRole,
  reviewedPassages = [],
  onSelectMatch,
  onRecordPassageReview,
  onJumpToParagraph,
}: SubmissionEvidenceTabProps) {
  const getPassageDecision = (pId: string) => {
    return reviewedPassages.find((rp) => rp.passage_id === pId);
  };

  return (
    <div className="mt-5 space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Flagged Passage Evidence
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Showing specific text passages that caused this submission to be flagged for academic review.
          </p>
        </div>
        <span className="num text-xs font-semibold text-muted-foreground">
          {activePassages.length} passage{activePassages.length === 1 ? "" : "s"} identified
        </span>
      </div>

      {activePassages.length === 0 ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-8 text-center space-y-2">
          <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
          <h3 className="text-sm font-bold text-emerald-950">No Aligned Overlaps Detected</h3>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            No significant textual or semantic overlap was detected by the integrity engines across institutional archives or scientific databases.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activePassages.map((item: any, idx: number) => {
            const isPassage = Boolean(item.student_text);
            const title = isPassage ? item.source_name : item.title;
            const contribution = isPassage ? item.similarity_percentage : item.contribution;
            const rawLevel = isPassage ? item.evidence_level : idx === 0 ? "strong" : "moderate";
            const matchStrength =
              rawLevel === "strong"
                ? "Strong Overlap"
                : rawLevel === "moderate"
                ? "Moderate Overlap"
                : "Possible Overlap";
            const studentText =
              item.student_text || item.matched_text || "Extracted passage text unavailable.";
            const sourceText =
              item.source_text ||
              item.source_matched_text ||
              "Matched reference text indexed from corpus repository.";
            const targetPara = idx % 2 === 0 ? "p-1" : "p-2";
            const existingDecision = getPassageDecision(targetPara);

            const matchDetails = {
              sourceId: title,
              percent: contribution,
              words: item.matched_words || 36,
              paragraphId: targetPara,
              studentText,
              sourceText,
              evidenceLevel: rawLevel,
              reasons: item.reasons || ["Contiguous overlap with reference source"],
              exactSimilarity: item.exact_similarity,
              fuzzySimilarity: item.fuzzy_similarity,
              semanticSimilarity: item.semantic_similarity,
              confidence: item.confidence ?? 0.88,
              isQuoted: item.is_quoted ?? false,
              isCommonTechnicalPhrase: item.is_common_technical_phrase ?? false,
              sourceType: item.source_type,
              sourceTitle: item.source_title || title,
              sourceUrl: item.source_url,
            };

            return (
              <div
                key={item.id || idx}
                className="rounded-md border border-border bg-card p-4 space-y-3 shadow-xs hover:border-border/80 transition-colors"
              >
                {/* Passage Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="num font-bold text-xs text-foreground uppercase tracking-wider">
                      Passage 0{idx + 1}
                    </span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span
                      className={`num rounded-xs px-2 py-0.5 text-[10px] font-bold uppercase border ${
                        rawLevel === "strong"
                          ? "bg-red-100 text-red-800 border-red-300"
                          : rawLevel === "moderate"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-blue-100 text-blue-800 border-blue-300"
                      }`}
                    >
                      {matchStrength}
                    </span>
                    <span className="num text-xs text-muted-foreground">
                      ({contribution}% overlap · {item.matched_words || 36} words)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Source: <strong className="text-foreground">{title}</strong>
                    </span>
                    {existingDecision && (
                      <span
                        className={`rounded-xs px-2 py-0.5 text-[10px] font-semibold uppercase border ${
                          existingDecision.status === "cited_or_common"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : existingDecision.status === "verified_plagiarism"
                            ? "bg-red-50 text-red-800 border-red-300"
                            : existingDecision.status === "pending_explanation"
                            ? "bg-purple-50 text-purple-800 border-purple-300"
                            : "bg-slate-100 text-slate-800 border-slate-300"
                        }`}
                      >
                        {existingDecision.status.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Excerpt Comparison Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-sm border border-border bg-amber-50/50 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                      Submitted Student Text
                    </span>
                    <p className="font-serif leading-relaxed text-foreground italic">
                      &quot;{studentText}&quot;
                    </p>
                  </div>

                  <div className="rounded-sm border border-border bg-muted/30 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Discovered Source Text
                    </span>
                    <p className="font-serif leading-relaxed text-foreground italic">
                      &quot;{sourceText}&quot;
                    </p>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline font-mono pt-1"
                      >
                        <ExternalLink className="size-3" /> External Link
                      </a>
                    )}
                  </div>
                </div>

                {/* Evidence Explanation */}
                {item.reasons && item.reasons.length > 0 && (
                  <p className="text-[11px] text-muted-foreground italic">
                    <strong>Evidence explanation:</strong> {item.reasons.join("; ")}
                  </p>
                )}

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-brand border-brand/30 hover:bg-brand/10"
                      onClick={() => onSelectMatch(matchDetails)}
                    >
                      <Eye className="mr-1 size-3" /> View Full Evidence
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => onJumpToParagraph(targetPara)}
                    >
                      View in Document →
                    </Button>
                  </div>

                  {currentUserRole !== "student" && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        onClick={() => onRecordPassageReview("cited_or_common", targetPara)}
                      >
                        <Check className="mr-1 size-3 text-emerald-600" /> Mark Cited / Common
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] text-purple-700 border-purple-300 hover:bg-purple-50"
                        onClick={() => onRecordPassageReview("pending_explanation", targetPara)}
                      >
                        <HelpCircle className="mr-1 size-3 text-purple-600" /> Flag for Explanation
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] text-slate-700 border-slate-300 hover:bg-slate-50"
                        onClick={() => onRecordPassageReview("cleared", targetPara)}
                      >
                        Clear Passage
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
