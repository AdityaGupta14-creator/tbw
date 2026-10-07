import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  Lock,
  MessageSquare,
  FileCheck,
  ArrowRight,
  UserCheck,
  RotateCcw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type {
  ReviewAuditEntry,
  ReviewDecision,
  ReviewedPassageStatus,
  ReviewStatus,
  SubmissionReview,
  UserRole,
} from "@/types/database";

interface SubmissionReviewTabProps {
  reviewRecord?: SubmissionReview | undefined;
  auditTrail: ReviewAuditEntry[];
  selectedDecision: ReviewDecision | "";
  setSelectedDecision: (decision: ReviewDecision) => void;
  decisionRationale: string;
  setDecisionRationale: (val: string) => void;
  facultyNotesText: string;
  setFacultyNotesText: (val: string) => void;
  generalFeedback: string;
  setGeneralFeedback: (val: string) => void;
  rubricScores: Array<{ criterion: string; score: number; max: number }>;
  onScoreChange: (index: number, val: number) => void;
  totalScore: number;
  maxPossibleScore: number;
  onRecordDecision: () => Promise<void>;
  onTransitionStatus: (nextStatus: ReviewStatus, notes?: string) => Promise<void>;
  onOpenExplanationDialog: () => void;
  onOpenResponseDialog: () => void;
  onRecordPassageReviewDirect: (passageId: string, status: ReviewedPassageStatus) => Promise<void>;
  activePassages: any[];
  currentUserRole: UserRole;
  submission: any;
  onSendFeedback?: () => Promise<void>;
  isSendingFeedback?: boolean;
}

export function SubmissionReviewTab({
  reviewRecord,
  auditTrail,
  selectedDecision,
  setSelectedDecision,
  decisionRationale,
  setDecisionRationale,
  facultyNotesText,
  setFacultyNotesText,
  generalFeedback,
  setGeneralFeedback,
  rubricScores,
  onScoreChange,
  totalScore,
  maxPossibleScore,
  onRecordDecision,
  onTransitionStatus,
  onOpenExplanationDialog,
  onOpenResponseDialog,
  onRecordPassageReviewDirect,
  activePassages,
  currentUserRole,
  submission,
  onSendFeedback,
  isSendingFeedback,
}: SubmissionReviewTabProps) {
  const currentStatus = reviewRecord?.status || (submission.status === "reviewed" ? "reviewed" : "needs_review");
  const reviewedPassages = reviewRecord?.reviewed_passages || [];

  const getPassageDecision = (pId: string): ReviewedPassageStatus | undefined => {
    const found = reviewedPassages.find((rp) => rp.passage_id === pId);
    return found?.status;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Review Status & Lifecycle Header */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-brand" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground font-serif">
                Faculty Review Workflow
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Official academic evaluation, passage determinations, and evidence disposition.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
              Current Status:
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                currentStatus === "reviewed"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : currentStatus === "explanation_requested"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : currentStatus === "in_review"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
              }`}
            >
              {currentStatus.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Quick Transition Action Bar */}
        {currentUserRole !== "student" && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <span className="text-xs font-medium text-muted-foreground">Quick Actions:</span>
            {currentStatus !== "in_review" && currentStatus !== "reviewed" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onTransitionStatus("in_review", "Faculty initiated active review")}
              >
                Mark In-Review
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400"
              onClick={onOpenExplanationDialog}
            >
              <HelpCircle className="mr-1 size-3.5" />
              Request Student Explanation
            </Button>
            {reviewRecord?.student_explanation_request && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-blue-700 hover:text-blue-800 dark:text-blue-400"
                onClick={onOpenResponseDialog}
              >
                <MessageSquare className="mr-1 size-3.5" />
                Record Student Response
              </Button>
            )}
            {currentStatus !== "escalated" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-danger"
                onClick={() => onTransitionStatus("escalated", "Referred to departmental integrity committee")}
              >
                Escalate to Committee
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 2. Passage Decisions */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Passage Determinations ({activePassages.length} Flagged Passages)
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Review each flagged section individually and classify the scholarly finding.
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {reviewedPassages.length} of {activePassages.length} determined
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {activePassages.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No overlapping passages flagged for this submission.
            </p>
          ) : (
            activePassages.map((p, idx) => {
              const pId = p.id || `p-${idx + 1}`;
              const decision = getPassageDecision(pId);
              const previewText = p.student_text || p.studentText || p.text || `Passage ${idx + 1}`;
              const sourceTitle = p.source_title || p.sourceTitle || p.title || p.source_name || "Academic Source";

              return (
                <div
                  key={pId}
                  className="rounded-md border border-border bg-muted/20 p-4 transition-all"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground text-xs">
                          Passage #{idx + 1}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          ({pId})
                        </span>
                        <span className="num rounded bg-card px-1.5 py-0.5 text-[11px] font-bold text-danger border border-border">
                          {p.similarity_percentage ?? p.similarity ?? p.percent ?? 0}% overlap
                        </span>
                        <span className="text-xs text-muted-foreground">
                          vs <span className="font-medium text-foreground">{sourceTitle}</span>
                        </span>
                      </div>
                      <p className="text-xs italic text-foreground/90 line-clamp-2">
                        "{previewText}"
                      </p>
                    </div>

                    {/* Status Badge */}
                    {decision && (
                      <span className={`shrink-0 rounded-xs px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        decision === "verified_plagiarism"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : decision === "cited_or_common"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : decision === "cleared"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}>
                        {decision === "cited_or_common"
                          ? "Cited / Common Term"
                          : decision === "verified_plagiarism"
                          ? "Verified Misconduct"
                          : decision === "pending_explanation"
                          ? "Flag for Explanation"
                          : "Cleared"}
                      </span>
                    )}
                  </div>

                  {/* 4 Standard Passage Decisions Buttons */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
                    <span className="text-[11px] font-medium text-muted-foreground mr-1">
                      Action:
                    </span>
                    <Button
                      variant={decision === "cited_or_common" ? "secondary" : "outline"}
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => onRecordPassageReviewDirect(pId, "cited_or_common")}
                    >
                      Cited / Common Term
                    </Button>
                    <Button
                      variant={decision === "verified_plagiarism" ? "destructive" : "outline"}
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => onRecordPassageReviewDirect(pId, "verified_plagiarism")}
                    >
                      Verified Misconduct
                    </Button>
                    <Button
                      variant={decision === "pending_explanation" ? "secondary" : "outline"}
                      size="sm"
                      className="h-7 px-2 text-[11px] text-amber-700 dark:text-amber-400"
                      onClick={() => onRecordPassageReviewDirect(pId, "pending_explanation")}
                    >
                      Flag for Explanation
                    </Button>
                    <Button
                      variant={decision === "cleared" ? "secondary" : "outline"}
                      size="sm"
                      className="h-7 px-2 text-[11px] text-emerald-700 dark:text-emerald-400"
                      onClick={() => onRecordPassageReviewDirect(pId, "cleared")}
                    >
                      Clear Passage
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Student Explanation Status */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Student Explanation Dialogue
        </h3>

        {reviewRecord?.student_explanation_request ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-md border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 p-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="size-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-semibold text-foreground">
                  Faculty Inquiry Sent
                </span>
                {reviewRecord.student_explanation_requested_at && (
                  <span className="text-[11px] text-muted-foreground">
                    ({new Date(reviewRecord.student_explanation_requested_at).toLocaleDateString()})
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-foreground/90 whitespace-pre-wrap">
                "{reviewRecord.student_explanation_request}"
              </p>
            </div>

            {reviewRecord.student_explanation_response ? (
              <div className="rounded-md border border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-foreground">
                    Candidate Response Received
                  </span>
                  {reviewRecord.student_explanation_received_at && (
                    <span className="text-[11px] text-muted-foreground">
                      ({new Date(reviewRecord.student_explanation_received_at).toLocaleDateString()})
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-foreground/90 whitespace-pre-wrap">
                  "{reviewRecord.student_explanation_response}"
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 p-3">
                <span className="text-xs text-muted-foreground">
                  Awaiting candidate response.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={onOpenResponseDialog}
                >
                  Record Response Manually
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
            <span>No formal explanation has been requested for this submission yet.</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={onOpenExplanationDialog}
            >
              Request Explanation
            </Button>
          </div>
        )}
      </div>

      {/* 4. Faculty Feedback & Confidential Notes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Student-Visible Feedback */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-brand" />
            <h3 className="text-sm font-semibold text-foreground">
              Candidate Feedback (Student Visible)
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Academic advice, citation guidance, and revision directions visible to the student.
          </p>

          <textarea
            value={generalFeedback}
            onChange={(e) => setGeneralFeedback(e.target.value)}
            rows={5}
            className="mt-3 w-full rounded-md border border-input bg-background p-3 text-xs leading-relaxed focus:border-brand focus:outline-none"
            placeholder="Provide constructive feedback for student learning..."
          />

          {/* Rubric summary */}
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground uppercase tracking-wider text-[11px]">
                Rubric Evaluation
              </span>
              <span className="num text-foreground">
                Total: {totalScore} / {maxPossibleScore}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {rubricScores.map((r, i) => (
                <div key={r.criterion} className="flex items-center justify-between text-xs">
                  <span className="text-foreground/80">{r.criterion}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={r.max}
                      value={r.score}
                      onChange={(e) => onScoreChange(i, parseInt(e.target.value) || 0)}
                      className="num h-6 w-12 rounded border border-input bg-background px-1.5 text-center text-xs"
                    />
                    <span className="text-muted-foreground">/ {r.max}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Send Candidate Feedback Action */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-3.5">
            <div className="text-[11px] text-muted-foreground">
              {reviewRecord?.general_feedback ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  Feedback active & dispatched to student dashboard
                </span>
              ) : (
                <span>Feedback will be notified to the student upon sending</span>
              )}
            </div>
            {onSendFeedback && (
              <Button
                type="button"
                size="sm"
                onClick={onSendFeedback}
                disabled={isSendingFeedback || !generalFeedback.trim()}
                className="gap-1.5 h-8 text-xs bg-brand hover:bg-brand/90 text-white shrink-0 shadow-xs"
              >
                <Send className="size-3.5" />
                {reviewRecord?.general_feedback ? "Update & Notify Student" : "Send Feedback to Student"}
              </Button>
            )}
          </div>
        </div>

        {/* Confidential Faculty Notes (Strictly Hidden from Students) */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">
              Confidential Faculty Notes
            </h3>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Internal Only
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Strictly restricted to instructors and academic review committees. Never visible to students.
          </p>

          <textarea
            value={facultyNotesText}
            onChange={(e) => setFacultyNotesText(e.target.value)}
            rows={5}
            className="mt-3 w-full rounded-md border border-input bg-background p-3 text-xs leading-relaxed focus:border-brand focus:outline-none"
            placeholder="Confidential observations, committee referrals, interview logs, or comparative corroboration notes..."
          />

          <div className="mt-4 rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground block mb-0.5">
              Auditing Policy:
            </span>
            Notes entered here are recorded in the cryptographically hashed audit trail for accreditation compliance.
          </div>
        </div>
      </div>

      {/* 5. Final Decision Recording */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <FileCheck className="size-5 text-brand" />
          <h3 className="text-base font-semibold text-foreground font-serif">
            Official Academic Integrity Decision
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Record your formal academic verdict. This will finalize the submission status and generate the archival audit entry.
        </p>

        {/* 3 Clear Official Choices */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setSelectedDecision("cleared_no_action")}
            className={`flex flex-col items-start rounded-md border p-4 text-left transition-all ${
              selectedDecision === "cleared_no_action"
                ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-600"
                : "border-border bg-background hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="text-xs font-bold text-foreground">Cleared</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Overlap justified by valid citation, standard technical terms, or acceptable quotations.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDecision("requires_further_review")}
            className={`flex flex-col items-start rounded-md border p-4 text-left transition-all ${
              selectedDecision === "requires_further_review"
                ? "border-amber-600 bg-amber-50/50 dark:bg-amber-950/30 ring-1 ring-amber-600"
                : "border-border bg-background hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <HelpCircle className="size-4 text-amber-600" />
              <span className="text-xs font-bold text-foreground">Explanation Requested</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Requires clarification from the student before an academic determination can be concluded.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDecision("academic_misconduct_verified")}
            className={`flex flex-col items-start rounded-md border p-4 text-left transition-all ${
              selectedDecision === "academic_misconduct_verified"
                ? "border-rose-600 bg-rose-50/50 dark:bg-rose-950/30 ring-1 ring-rose-600"
                : "border-border bg-background hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-rose-600" />
              <span className="text-xs font-bold text-foreground">Academic Integrity Concern</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Substantial uncredited overlap or unauthorized duplication confirmed by evidence.
            </p>
          </button>
        </div>

        {/* Decision Rationale */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-foreground">
            Academic Decision Rationale <span className="text-danger">*</span>
          </label>
          <textarea
            value={decisionRationale}
            onChange={(e) => setDecisionRationale(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-md border border-input bg-background p-3 text-xs focus:border-brand focus:outline-none"
            placeholder="State the academic justification for this decision based on the evidence..."
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button
            onClick={onRecordDecision}
            disabled={!selectedDecision || !decisionRationale.trim()}
            className="gap-2"
          >
            <ShieldCheck className="size-4" />
            Record Official Decision
          </Button>
        </div>
      </div>

      {/* 6. Immutable Audit Trail */}
      {auditTrail.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Review History & Audit Trail ({auditTrail.length} entries)
          </h3>
          <div className="mt-4 divide-y divide-border text-xs">
            {auditTrail.map((entry, idx) => (
              <div key={entry.id || idx} className="py-2.5 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {entry.action.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <span className="text-muted-foreground">by</span>
                    <span className="font-medium text-foreground">{entry.actor_name}</span>
                  </div>
                  {entry.notes && (
                    <p className="text-muted-foreground italic">"{entry.notes}"</p>
                  )}
                </div>
                <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
