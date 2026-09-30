import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Search,
  Download,
  Eye,
  AlertTriangle,
  X,
  BookMarked,
  Users,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SubmissionDocumentTabProps {
  activePages: any[][];
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  highlightsEnabled: boolean;
  setHighlightsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  docSearch: string;
  setDocSearch: React.Dispatch<React.SetStateAction<string>>;
  selectedMatch: any;
  setSelectedMatch: React.Dispatch<React.SetStateAction<any>>;
  submission: any;
  citationIssues?: any[];
  onOpenEvidenceDialog: (match: any) => void;
  onAddAnnotation?: (paragraphId: string) => void;
}

export function SubmissionDocumentTab({
  activePages,
  currentPage,
  setCurrentPage,
  zoomLevel,
  setZoomLevel,
  highlightsEnabled,
  setHighlightsEnabled,
  docSearch,
  setDocSearch,
  selectedMatch,
  setSelectedMatch,
  submission,
  citationIssues = [],
  onOpenEvidenceDialog,
  onAddAnnotation,
}: SubmissionDocumentTabProps) {
  // Quick legend filter if user wants to toggle highlight types
  const [filterType, setFilterType] = useState<"all" | "strong" | "moderate" | "peer" | "citations">("all");

  const safePages = activePages.length > 0 ? activePages : [[{ id: "p-1", text: "No content available." }]];
  const currentParagraphs = safePages[currentPage] ?? safePages[0] ?? [];

  return (
    <div className="space-y-4">
      {/* Top Document Reader Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-xs">
        {/* Page Navigation */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="num px-2 font-medium text-foreground">
            Page {currentPage + 1} of {safePages.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= safePages.length - 1}
            onClick={() => setCurrentPage((p) => Math.min(safePages.length - 1, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Highlight Legend & Filter Pills */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Legend:
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <span className="size-1.5 rounded-full bg-rose-600" />
            Strong Overlap
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
            <span className="size-1.5 rounded-full bg-amber-600" />
            Moderate Overlap
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
            <span className="size-1.5 rounded-full bg-indigo-600" />
            Peer Student Match
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
            <span className="size-1.5 rounded-full bg-purple-600" />
            Citation Issue
          </span>
        </div>

        {/* Zoom & Search Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom */}
          <div className="flex items-center rounded-md border border-input bg-background">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={zoomLevel <= 70}
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              aria-label="Zoom out"
            >
              <Minus className="size-3" />
            </Button>
            <span className="num px-2 text-xs font-medium">{zoomLevel}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={zoomLevel >= 150}
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              aria-label="Zoom in"
            >
              <Plus className="size-3" />
            </Button>
          </div>

          {/* Toggle Highlights */}
          <Button
            variant={highlightsEnabled ? "secondary" : "outline"}
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => setHighlightsEnabled(!highlightsEnabled)}
          >
            {highlightsEnabled ? "Highlights ON" : "Highlights OFF"}
          </Button>

          {/* Search in document */}
          <div className="relative">
            <input
              type="text"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="Find in text..."
              className="h-8 w-36 rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:w-48 focus:outline-none transition-all"
            />
            <Search className="pointer-events-none absolute top-2.5 left-2 size-3 text-muted-foreground" />
          </div>

          {/* Download Original File */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title="Download original file"
            onClick={() => toast.info("Downloading original submission copy...")}
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Selected Match Inspector Banner if a passage is currently clicked */}
      {selectedMatch && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-xs transition-all shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-semibold text-foreground text-sm">
                  Flagged Passage Overlap
                </span>
                <span className="num rounded bg-card px-2 py-0.5 font-bold text-danger border border-border">
                  {selectedMatch.percent}% overlap
                </span>
                <span className="num text-muted-foreground">
                  ({selectedMatch.words || 0} words)
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  selectedMatch.sourceType === "student_submission"
                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                    : selectedMatch.evidenceLevel === "strong"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}>
                  {selectedMatch.sourceType === "student_submission"
                    ? "Peer Student Match"
                    : selectedMatch.evidenceLevel === "strong"
                    ? "Strong Overlap"
                    : "Moderate Overlap"}
                </span>
              </div>

              <p className="text-xs text-foreground/90">
                <span className="font-semibold text-muted-foreground">Source:</span>{" "}
                <span className="font-medium text-brand">
                  {selectedMatch.sourceTitle || selectedMatch.sourceId || "Academic Repository"}
                </span>
                {selectedMatch.sourceUrl && (
                  <span className="text-muted-foreground ml-1">({selectedMatch.sourceUrl})</span>
                )}
              </p>

              {selectedMatch.sourceText && (
                <div className="mt-2 rounded border border-border bg-card/90 p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Matched Source Text:
                  </span>
                  <p className="italic text-foreground line-clamp-2">
                    "{selectedMatch.sourceText}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => onOpenEvidenceDialog(selectedMatch)}
              >
                <Eye className="size-3.5" />
                View Full Evidence
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedMatch(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Canvas Presentation */}
      <div className="overflow-auto rounded-lg border border-border bg-muted/20 p-6 md:p-10" style={{ minHeight: "720px" }}>
        <div
          className="mx-auto max-w-[850px] rounded-md border border-border bg-card p-8 md:p-14 shadow-sm transition-transform"
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: "top center",
          }}
        >
          {/* Institutional Document Header */}
          <div className="border-b-2 border-border pb-6 text-center">
            <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
              ABC Institute of Technology · Academic Submission Ingestion
            </p>
            <h1 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl font-serif">
              {submission.assignment}
            </h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{submission.student}</span>
              <span>·</span>
              <span className="num">Roll: {submission.roll}</span>
              <span>·</span>
              <span className="num">Course: {submission.courseCode}</span>
              <span>·</span>
              <span>Receipt: <span className="font-mono">{submission.id}</span></span>
            </div>
          </div>

          {/* Document Paragraphs with Rich Evidence Highlighting */}
          <div className="mt-8 space-y-6 text-[14px] leading-relaxed text-foreground font-serif">
            {currentParagraphs.map((p: any) => {
              const hasMatch = p.match && highlightsEnabled;
              const isMatchActive = selectedMatch?.paragraphId === p.id;
              const searchHit =
                docSearch.trim().length > 1 &&
                p.text.toLowerCase().includes(docSearch.toLowerCase());

              // Check if paragraph has an associated citation issue
              const paragraphCitationIssue = citationIssues.find(
                (ci) => ci.target === p.id
              );

              // Determine highlight styling based on evidence category
              let highlightClass = "";
              let badgeColor = "";
              let badgeLabel = "";

              if (hasMatch) {
                const isPeerMatch = p.match.sourceType === "student_submission";
                const isStrong = p.match.evidenceLevel === "strong" || (p.match.percent ?? 0) >= 40;

                if (isPeerMatch) {
                  highlightClass = "bg-indigo-100/70 dark:bg-indigo-950/40 border-b-2 border-indigo-500 hover:bg-indigo-200/70";
                  badgeColor = "bg-indigo-600 text-white";
                  badgeLabel = "Peer Match";
                } else if (isStrong) {
                  highlightClass = "bg-rose-100/70 dark:bg-rose-950/40 border-b-2 border-rose-500 hover:bg-rose-200/70";
                  badgeColor = "bg-rose-600 text-white";
                  badgeLabel = `${p.match.percent}% Strong`;
                } else {
                  highlightClass = "bg-amber-100/70 dark:bg-amber-950/40 border-b-2 border-amber-500 hover:bg-amber-200/70";
                  badgeColor = "bg-amber-600 text-white";
                  badgeLabel = `${p.match.percent}% Overlap`;
                }
              }

              return (
                <div
                  key={p.id}
                  id={p.id}
                  className={`group relative rounded p-2.5 transition-colors ${
                    isMatchActive
                      ? "bg-amber-100/60 dark:bg-amber-950/30 border-l-4 border-amber-600 pl-4 ring-1 ring-amber-400"
                      : searchHit
                      ? "bg-blue-100/60 dark:bg-blue-950/30 border-l-4 border-blue-500 pl-4"
                      : paragraphCitationIssue && highlightsEnabled
                      ? "bg-purple-50/60 dark:bg-purple-950/30 border-l-4 border-purple-500 pl-4"
                      : "hover:bg-muted/30"
                  }`}
                >
                  {p.heading && (
                    <h2 className="mb-2 text-base font-bold text-foreground font-sans tracking-tight">
                      {p.heading}
                    </h2>
                  )}

                  <p className="relative">
                    {hasMatch ? (
                      <span
                        onClick={() => {
                          const matchObj = {
                            sourceId: p.match.sourceId,
                            percent: p.match.percent,
                            words: p.match.words,
                            paragraphId: p.id,
                            studentText: p.match.studentText || p.text,
                            sourceText: p.match.sourceText,
                            evidenceLevel: p.match.evidenceLevel,
                            reasons: p.match.reasons,
                            exactSimilarity: p.match.exactSimilarity,
                            fuzzySimilarity: p.match.fuzzySimilarity,
                            semanticSimilarity: p.match.semanticSimilarity,
                            confidence: p.match.confidence,
                            isQuoted: p.match.isQuoted,
                            isCommonTechnicalPhrase: p.match.isCommonTechnicalPhrase,
                            sourceType: p.match.sourceType,
                            sourceTitle: p.match.sourceTitle,
                            sourceUrl: p.match.sourceUrl,
                          };
                          setSelectedMatch(matchObj);
                          onOpenEvidenceDialog(matchObj);
                        }}
                        className={`cursor-pointer rounded px-1 py-0.5 transition-colors ${highlightClass}`}
                        title="Click to view full match evidence"
                      >
                        {p.text}
                        <span className={`num ml-1.5 inline-block rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-tight align-super ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                      </span>
                    ) : (
                      p.text
                    )}
                  </p>

                  {/* Inline Citation Alert if paragraph has a citation discrepancy */}
                  {paragraphCitationIssue && highlightsEnabled && (
                    <div className="mt-2 flex items-center gap-1.5 rounded border border-purple-300 dark:border-purple-800 bg-purple-100/50 dark:bg-purple-950/30 px-2 py-1 text-xs text-purple-900 dark:text-purple-300">
                      <BookMarked className="size-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                      <span className="font-semibold">Citation Note:</span>
                      <span>{paragraphCitationIssue.text}</span>
                    </div>
                  )}

                  {/* Hover action menu for faculty annotation */}
                  {onAddAnnotation && (
                    <div className="mt-2 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-brand font-sans"
                        onClick={() => onAddAnnotation(p.id)}
                      >
                        + Add Faculty Annotation
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Document Footer */}
          <div className="mt-14 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground font-sans">
            <span className="num font-mono">Verity Audit Archival Ingestion · {submission.id}</span>
            <span className="num">Page {currentPage + 1} of {safePages.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
