import { useState, useEffect, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { rubric as defaultRubric, citationAnalysis } from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";
import { useStudentSession } from "@/lib/student-session";
import { formatInstitutionalTime, formatInstitutionalDateTime } from "@/lib/formatters";
import type { Submission } from "@/types/database";

export const Route = createFileRoute("/student/feedback")({
  head: () => ({
    meta: [
      { title: "Faculty Feedback — Student Portal" },
      {
        name: "description",
        content: "View faculty evaluation rubric, inline comments, and citation guidance.",
      },
      { property: "og:title", content: "Feedback — Student Portal" },
    ],
  }),
  component: StudentFeedbackPage,
});

function StudentFeedbackPage() {
  const { currentStudent } = useStudentSession();
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [liveAnnotations, setLiveAnnotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeedbackData = useCallback(async () => {
    setLoading(true);
    try {
      const dbList = await verityApi.submissions.list();
      if (dbList && dbList.length > 0) {
        // Find submissions matching the active student
        const studentSubs = dbList.filter((s) => {
          const matchId = s.student_id && s.student_id === currentStudent.id;
          const matchRoll =
            s.student_roll &&
            currentStudent.roll_number &&
            s.student_roll.trim().toLowerCase() === currentStudent.roll_number.trim().toLowerCase();
          return matchId || matchRoll;
        });

        // Prefer submission that has review feedback or is reviewed, else first student submission, else first overall
        const targetSub =
          studentSubs.find((s) => s.review?.general_feedback || s.review?.decision) ||
          studentSubs.find((s) => s.status === "reviewed") ||
          studentSubs[0] ||
          dbList[0];

        if (targetSub) {
          // Fetch full submission record with detailed review
          const fullSub = await verityApi.submissions.get(targetSub.id);
          const finalSub = fullSub || targetSub;
          setActiveSubmission(finalSub);

          const fbList = await verityApi.feedback.list(finalSub.id);
          setLiveAnnotations(fbList || []);
        }
      }
    } catch (e) {
      console.warn("Failed to load feedback:", e);
    } finally {
      setLoading(false);
    }
  }, [currentStudent]);

  useEffect(() => {
    loadFeedbackData();

    const handleUpdate = () => {
      loadFeedbackData();
    };

    window.addEventListener("verity:notifications-updated", handleUpdate);
    window.addEventListener("verity:student-session-changed", handleUpdate);

    return () => {
      window.removeEventListener("verity:notifications-updated", handleUpdate);
      window.removeEventListener("verity:student-session-changed", handleUpdate);
    };
  }, [loadFeedbackData]);

  // Rubric Scores calculation
  const currentRubric =
    activeSubmission?.review?.rubric_scores && activeSubmission.review.rubric_scores.length > 0
      ? activeSubmission.review.rubric_scores
      : defaultRubric;

  const totalScore = currentRubric.reduce((acc, curr) => acc + curr.score, 0);
  const maxScore = currentRubric.reduce((acc, curr) => acc + curr.max, 0);

  const generalFeedbackText =
    activeSubmission?.review?.general_feedback ||
    activeSubmission?.review?.decision_rationale ||
    "Strong experimental setup and analysis. All empirical cross-over measurements are well articulated. Review any highlighted citation guidance before department archival.";

  const reviewerName =
    activeSubmission?.review?.reviewer_name || "Dr. P. Kulkarni, Faculty Guide";

  return (
    <AppShell role="student">
      <div className="border-b border-border pb-3.5">
        <Button asChild variant="ghost" size="sm" className="mb-2 h-7 px-2 text-muted-foreground hover:text-foreground">
          <Link to="/student">
            <ArrowLeft className="mr-1 size-3.5" /> Back to Dashboard
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Returned Faculty Feedback & Evaluation</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Student: <span className="font-semibold text-foreground">{currentStudent.full_name}</span> ({currentStudent.roll_number}) · {activeSubmission?.assignment_title || "Technical Report 02"} · <span className="num font-semibold text-brand">{activeSubmission?.course_code || "ENG-CSE-301"}</span> · Guide: {reviewerName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeSubmission && (
              <Button asChild size="sm" variant="outline" className="text-xs">
                <Link to="/submissions/$submissionId" params={{ submissionId: activeSubmission.id }}>
                  <FileText className="mr-1.5 size-3.5" /> View Full Submission
                </Link>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => toast.success("Evaluation summary report downloaded")}
            >
              <Download className="mr-1.5 size-3.5" /> Download Evaluation Slip
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Rubric Score Breakdown Card */}
        <section className="rounded-md border border-border bg-card p-5 shadow-xs lg:col-span-1 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Faculty Evaluation Score
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="num text-4xl font-bold text-brand">{totalScore}</span>
              <span className="num text-muted-foreground font-semibold">/ {maxScore}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalScore >= 80
                ? "Grade equivalent: First Class with Distinction"
                : totalScore >= 60
                ? "Grade equivalent: First Class"
                : "Grade equivalent: Satisfactory"}
            </p>

            <div className="mt-5 space-y-3 border-t border-border pt-4">
              <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Rubric Criterion Breakdown
              </h2>
              {currentRubric.map((r) => (
                <div key={r.criterion} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground">{r.criterion}</span>
                    <span className="num font-semibold text-foreground">
                      {r.score} / {r.max}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${Math.min(100, (r.score / (r.max || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {activeSubmission?.review?.decision && (
            <div className="mt-6 border-t border-border pt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Official Review Status
              </span>
              <div className="mt-1 flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                  {activeSubmission.review.decision.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Detailed Feedback & Annotations */}
        <section className="space-y-5 lg:col-span-2">
          {/* Faculty Summary Note */}
          <div className="rounded-md border border-border bg-card p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-brand" /> Guide Reviewer Assessment
              </div>
              <span className="text-[11px] font-normal text-muted-foreground">
                Direct Candidate Feedback
              </span>
            </h2>
            <div className="mt-3 rounded-sm bg-brand/5 border border-brand/15 p-4 text-xs text-foreground leading-relaxed">
              &ldquo;{generalFeedbackText}&rdquo;
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-[11px]">
                {activeSubmission?.review?.updated_at && (
                  <>Recorded: {formatInstitutionalDateTime(activeSubmission.review.updated_at)}</>
                )}
              </span>
              <span className="font-medium text-foreground">
                — {reviewerName}
              </span>
            </div>
          </div>

          {/* Decision Rationale if separate */}
          {activeSubmission?.review?.decision_rationale &&
            activeSubmission.review.decision_rationale !== activeSubmission.review.general_feedback && (
              <div className="rounded-md border border-border bg-card p-5 shadow-xs">
                <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2.5 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-brand" /> Academic Decision Rationale
                </h2>
                <div className="mt-3 rounded-sm bg-muted/30 p-3.5 text-xs text-foreground leading-relaxed">
                  {activeSubmission.review.decision_rationale}
                </div>
              </div>
            )}

          {/* Live Faculty Annotations from Database */}
          {liveAnnotations.length > 0 && (
            <div className="rounded-md border border-border bg-card p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2.5 flex items-center gap-2">
                <MessageSquare className="size-4 text-brand" /> Inline Annotations ({liveAnnotations.length})
              </h2>
              <div className="mt-3 space-y-2">
                {liveAnnotations.map((anno) => (
                  <div key={anno.id} className="rounded-sm border border-border bg-muted/20 p-2.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span className="font-medium text-foreground">{anno.faculty_name || reviewerName} · Paragraph {anno.text_reference || anno.paragraph_id || "p-2"}</span>
                      <span>{formatInstitutionalTime(anno.created_at)}</span>
                    </div>
                    <p className="mt-1 text-foreground leading-snug">{anno.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Citation Guidance Items */}
          <div className="rounded-md border border-border bg-card p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2.5 flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" /> Citation Revision Guidance
            </h2>
            <div className="mt-3 space-y-2.5 text-xs">
              {citationAnalysis.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-sm border border-warning/30 bg-warning-soft p-3 text-warning-foreground leading-snug"
                >
                  <p className="font-medium">{issue.text}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Action required: Update document text to add bracketed citation [8] or remove unused bibliography record.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
