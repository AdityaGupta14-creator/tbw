import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileText, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { rubric, citationAnalysis } from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";
import { useStudentSession } from "@/lib/student-session";
import { formatInstitutionalTime } from "@/lib/formatters";

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
  const [liveAnnotations, setLiveAnnotations] = useState<any[]>([]);
  const totalScore = rubric.reduce((acc, curr) => acc + curr.score, 0);
  const maxScore = rubric.reduce((acc, curr) => acc + curr.max, 0);

  useEffect(() => {
    verityApi.submissions.list().then((dbList) => {
      if (dbList && dbList.length > 0) {
        const sub = dbList[0];
        if (sub) {
          verityApi.feedback.list(sub.id).then((fbList) => {
            if (fbList && fbList.length > 0) {
              setLiveAnnotations(fbList);
            }
          });
        }
      }
    });
  }, []);

  return (
    <AppShell role="student">
      <div className="border-b border-border pb-3.5">
        <Button asChild variant="ghost" size="sm" className="mb-2 h-7 px-2 text-muted-foreground hover:text-foreground">
          <Link to="/student/submissions">
            <ArrowLeft className="mr-1 size-3.5" /> Back to My Submissions
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Returned Faculty Feedback</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Student: {currentStudent.full_name} ({currentStudent.roll_number}) · Technical Report 02 · <span className="num">ENG-CSE-301</span> · Guide: Dr. P. Kulkarni
            </p>
          </div>
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

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Rubric Score Breakdown Card */}
        <section className="rounded-md border border-border bg-card p-5 shadow-xs lg:col-span-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Final Evaluation Score
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="num text-4xl font-bold text-brand">{totalScore}</span>
            <span className="num text-muted-foreground font-semibold">/ {maxScore}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Grade equivalent: First Class with Distinction</p>

          <div className="mt-5 space-y-3 border-t border-border pt-4">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Rubric Criterion Breakdown
            </h2>
            {rubric.map((r) => (
              <div key={r.criterion} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground">{r.criterion}</span>
                  <span className="num font-semibold text-foreground">
                    {r.score} / {r.max}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-navy rounded-full"
                    style={{ width: `${(r.score / r.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Feedback & Annotations */}
        <section className="space-y-5 lg:col-span-2">
          {/* Faculty Summary Note */}
          <div className="rounded-md border border-border bg-card p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2.5 flex items-center gap-2">
              <MessageSquare className="size-4 text-brand" /> Guide Reviewer Assessment
            </h2>
            <div className="mt-3 rounded-sm bg-muted/30 p-3.5 text-xs text-foreground leading-relaxed italic">
              &ldquo;Strong experimental setup comparing AVL and Red-Black trees. The empirical cross-over analysis at 3:1 read/write ratio is very well articulated and supported by measured latency figures. Please review the highlighted citation note below regarding reference [8] before final department archiving.&rdquo;
            </div>
            <div className="mt-2.5 text-right text-xs text-muted-foreground">
              — Dr. P. Kulkarni, Faculty Guide
            </div>
          </div>

          {/* Live Faculty Annotations from Database */}
          {liveAnnotations.length > 0 && (
            <div className="rounded-md border border-border bg-card p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2.5 flex items-center gap-2">
                <MessageSquare className="size-4 text-brand" /> Live Faculty Annotations ({liveAnnotations.length})
              </h2>
              <div className="mt-3 space-y-2">
                {liveAnnotations.map((anno) => (
                  <div key={anno.id} className="rounded-sm border border-border bg-muted/20 p-2.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span className="font-medium text-foreground">{anno.faculty_name || "Faculty Guide"} · Paragraph {anno.text_reference || "p-2"}</span>
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
