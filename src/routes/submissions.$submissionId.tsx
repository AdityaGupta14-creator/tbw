import { useState, useRef, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  GitCompare,
  HelpCircle,
  Maximize2,
  MessageSquare,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Send,
  Share2,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StatusBadge, SimilarityValue } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  citationAnalysis,
  documentPages,
  findSubmission,
  matchedSources,
  revisionHistory,
  rubric as initialRubric,
  similarityBreakdown,
  writingPattern,
  submissions,
} from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";
import type {
  ReviewAuditEntry,
  ReviewDecision,
  ReviewedPassageRecord,
  ReviewedPassageStatus,
  ReviewStatus,
  SubmissionReview,
  UserRole,
} from "@/types/database";
import { formatInstitutionalDateTime } from "@/lib/formatters";

const fallbackSubmission = submissions[0]!;

export const Route = createFileRoute("/submissions/$submissionId")({
  loader: ({ params }) => {
    const sub = findSubmission(params.submissionId);
    if (sub) return { submission: sub };
    return {
      submission: {
        id: params.submissionId,
        student: "Student Submission",
        roll: "Processing...",
        courseCode: "ENG-CSE-301",
        assignmentId: "asg-current",
        assignment: "Submitted Academic Work",
        submitted: "Recently",
        similarity: 0,
        citationIssues: 0,
        status: "review" as const,
        drafts: 1,
        matchedSources: 0,
      } as any,
    };
  },
  head: ({ loaderData }) => {
    const sub = loaderData?.submission ?? fallbackSubmission;
    return {
      meta: [
        { title: `${sub.roll} · ${sub.student} — ${sub.assignment} — Verity` },
        {
          name: "description",
          content: `Similarity report, matched sources, and document analysis for ${sub.student}.`,
        },
        { property: "og:title", content: `Review: ${sub.student} (${sub.roll}) — Verity` },
      ],
    };
  },
  component: SubmissionReviewPage,
});

function SubmissionReviewPage() {
  const loaderData = Route.useLoaderData();
  const { submissionId } = Route.useParams();
  const initialSubmission = loaderData?.submission ?? {
    id: submissionId,
    student: "Student Submission",
    roll: "Processing...",
    courseCode: "ENG-CSE-301",
    assignmentId: "asg-current",
    assignment: "Submitted Academic Work",
    submitted: "Recently",
    similarity: 0,
    citationIssues: 0,
    status: "review" as const,
    drafts: 1,
    matchedSources: 0,
  };
  const [submission, setSubmission] = useState(initialSubmission);
  const navigate = useNavigate();

  // Document viewer states
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [highlightsEnabled, setHighlightsEnabled] = useState(true);
  const [docSearch, setDocSearch] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("faculty");
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<{
    sourceId: string;
    percent: number;
    words: number;
    paragraphId: string;
    studentText?: string | undefined;
    sourceText?: string | undefined;
    evidenceLevel?: "strong" | "moderate" | "weak" | undefined;
    reasons?: string[] | undefined;
    exactSimilarity?: number | undefined;
    fuzzySimilarity?: number | undefined;
    semanticSimilarity?: number | undefined;
    confidence?: number | undefined;
    isQuoted?: boolean | undefined;
    isCommonTechnicalPhrase?: boolean | undefined;
    sourceType?: string | undefined;
    sourceTitle?: string | undefined;
    sourceUrl?: string | undefined;
  } | null>(null);

  // Active panel tab
  const [activeTab, setActiveTab] = useState("similarity");

  const isDemoSubmission =
    submission.id === "SUB-2026-09124" ||
    submission.id === "sub-01" ||
    submissionId === "SUB-2026-09124" ||
    submissionId === "sub-01";

  // Rubric & Feedback state
  const [rubricScores, setRubricScores] = useState(initialRubric);
  const [generalFeedback, setGeneralFeedback] = useState(
    isDemoSubmission
      ? "Good experimental setup comparing AVL and Red-Black trees. The empirical cross-over analysis at 3:1 read/write is well noted. Address uncited reference [8] in final archival copy."
      : "Automated integrity assessment completed. Analysis indexed against institutional peer archives and scientific literature."
  );
  const [comments, setComments] = useState(
    isDemoSubmission
      ? [
          {
            id: "c-1",
            author: "Dr. P. Kulkarni",
            time: "Yesterday, 14:15",
            paragraph: "p-2",
            text: "Textual overlap with textbook standard definition. Formulate in your own academic phrasing or cite appropriately.",
            resolved: false,
          },
          {
            id: "c-2",
            author: "Dr. P. Kulkarni",
            time: "Yesterday, 14:22",
            paragraph: "p-9",
            text: "Uncited reference [8] needs in-text attribution or removal from bibliography.",
            resolved: false,
          },
        ]
      : []
  );
  const [newCommentText, setNewCommentText] = useState("");
  const [commentTargetParagraph, setCommentTargetParagraph] = useState("p-1");
  const [livePages, setLivePages] = useState<any[][] | null>(null);
  const [liveAnalysis, setLiveAnalysis] = useState<any | null>(null);

  // Report Dialog State
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Step 8 Review Workflow State
  const [reviewRecord, setReviewRecord] = useState<SubmissionReview | undefined>(undefined);
  const [auditTrail, setAuditTrail] = useState<ReviewAuditEntry[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<ReviewDecision | "">("");
  const [decisionRationale, setDecisionRationale] = useState<string>("");
  const [facultyNotesText, setFacultyNotesText] = useState<string>("");
  const [explanationDialogOpen, setExplanationDialogOpen] = useState<boolean>(false);
  const [explanationPrompt, setExplanationPrompt] = useState<string>("");
  const [responseDialogOpen, setResponseDialogOpen] = useState<boolean>(false);
  const [studentExplanationResponse, setStudentExplanationResponse] = useState<string>("");
  const [passageNotesText, setPassageNotesText] = useState<string>("");

  useEffect(() => {
    const targetId = submissionId || initialSubmission.id;

    // Load existing feedback annotations
    verityApi.feedback.list(targetId).then((saved) => {
      if (saved && saved.length > 0) {
        const mapped = saved.map((s) => ({
          id: s.id,
          author: s.faculty_name || "Dr. P. Kulkarni",
          time: new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          paragraph: s.text_reference || "p-1",
          text: s.comment,
          resolved: s.status === "resolved",
        }));
        setComments(mapped);
      }
    });

    verityApi.auth.getCurrentUser().then((u) => {
      if (u?.role) setCurrentUserRole(u.role);
    });

    // Load review record and audit trail
    verityApi.reviews.get(targetId).then((rev) => {
      if (rev) {
        setReviewRecord(rev);
        if (rev.decision) setSelectedDecision(rev.decision);
        if (rev.decision_rationale) setDecisionRationale(rev.decision_rationale);
        if (rev.faculty_notes) setFacultyNotesText(rev.faculty_notes);
      }
    });

    verityApi.reviews.getAuditTrail(targetId).then((trail) => {
      if (trail && trail.length > 0) {
        setAuditTrail(trail);
      }
    });

    // Check if this submission exists in Supabase/backend database
    verityApi.submissions.get(targetId).then((dbSub) => {
      if (dbSub) {
        if (dbSub.review) {
          setReviewRecord(dbSub.review);
          if (dbSub.review.decision) setSelectedDecision(dbSub.review.decision);
          if (dbSub.review.decision_rationale) setDecisionRationale(dbSub.review.decision_rationale);
          if (dbSub.review.faculty_notes) setFacultyNotesText(dbSub.review.faculty_notes);
        }
        if (dbSub.review_audit && dbSub.review_audit.length > 0) {
          setAuditTrail(dbSub.review_audit);
        }
        const currentCode = dbSub.submission_code || dbSub.id;
        const isCurrentDemo = currentCode === "SUB-2026-09124" || currentCode === "sub-01";

        setSubmission({
          id: currentCode,
          student: dbSub.student_name || "Student",
          roll: dbSub.student_roll || "22CSE",
          courseCode: dbSub.course_code || "ENG-CSE-301",
          assignmentId: dbSub.assignment_id || "asg-301-02",
          assignment: dbSub.assignment_title || "Technical Report",
          submitted: formatInstitutionalDateTime(dbSub.submitted_at),
          similarity: dbSub.similarity_percentage ?? 0,
          citationIssues: dbSub.citation_issue_count ?? 0,
          status: (dbSub.status === "needs_review" ? "review" : dbSub.status === "reviewed" ? "reviewed" : "pending") as any,
          drafts: dbSub.drafts_count ?? 1,
          matchedSources: dbSub.matched_source_count ?? 0,
          document: dbSub.document,
        } as any);

        if (!isCurrentDemo && (!dbSub.feedback || dbSub.feedback.length === 0)) {
          setGeneralFeedback(
            `Automated integrity assessment for ${dbSub.assignment_title || "coursework"}. Document submitted by ${dbSub.student_name} (${dbSub.student_roll}). Overall similarity score: ${dbSub.similarity_percentage ?? 0}%.`
          );
        }

        if (dbSub.analysis) {
          setLiveAnalysis(dbSub.analysis);
        }

        const textToDisplay = dbSub.document?.extracted_text;
        if (textToDisplay && textToDisplay.trim().length > 0) {
          const rawParas = textToDisplay
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean);

          if (rawParas.length > 0) {
            const formattedParas = rawParas.map((pText, i) => {
              const pObj = (dbSub.analysis?.passages?.[i] || dbSub.analysis?.matches?.[i]) as any;
              return {
                id: `p-${i + 1}`,
                heading: i === 0 ? "1. Submitted Report Content" : undefined,
                text: pText,
                match: pObj
                  ? {
                      sourceId: pObj.source_name || "src-1",
                      percent: pObj.similarity_percentage,
                      words: pObj.matched_words || 36,
                      studentText: pObj.student_text || pObj.matched_text || pText,
                      sourceText: pObj.source_text || pObj.source_matched_text || "",
                      evidenceLevel: pObj.evidence_level || "strong",
                      reasons: pObj.reasons || ["Contiguous technical text overlap detected"],
                      exactSimilarity: pObj.exact_similarity,
                      fuzzySimilarity: pObj.fuzzy_similarity,
                      semanticSimilarity: pObj.semantic_similarity,
                      confidence: pObj.confidence ?? 0.88,
                      isQuoted: pObj.is_quoted ?? false,
                      isCommonTechnicalPhrase: pObj.is_common_technical_phrase ?? false,
                      sourceType: pObj.source_type,
                      sourceTitle: pObj.source_title || pObj.source_name,
                      sourceUrl: pObj.source_url,
                    }
                  : undefined,
              };
            });

            const pgs: any[][] = [];
            for (let i = 0; i < formattedParas.length; i += 4) {
              pgs.push(formattedParas.slice(i, i + 4));
            }
            if (pgs.length > 0) {
              setLivePages(pgs);
            }
          }
        }
      }
    });
  }, [submissionId, initialSubmission.id]);

  const activePages =
    livePages ||
    (isDemoSubmission
      ? documentPages
      : [
          [
            {
              id: "p-1",
              heading: "1. Uploaded Submission Document",
              text:
                (submission as any).document?.extracted_text ||
                "Uploaded document content has been extracted and archived. No unauthorized textual overlaps detected across institutional repositories.",
            },
          ],
        ]);

  const activeEvidence = liveAnalysis?.evidence_breakdown || (isDemoSubmission ? {
    strong_percentage: 14,
    moderate_percentage: 9,
    semantic_percentage: 5,
  } : {
    strong_percentage: 0,
    moderate_percentage: 0,
    semantic_percentage: 0,
  });

  const activePassages = liveAnalysis?.passages && liveAnalysis.passages.length > 0
    ? liveAnalysis.passages
    : (isDemoSubmission ? matchedSources.slice(0, 4) : []);

  const activeSourceDistribution = isDemoSubmission ? similarityBreakdown : [
    { label: "Student-to-Student", value: liveAnalysis?.student_overlap_percentage ?? 0 },
    { label: "Academic Journals", value: Math.round((liveAnalysis?.similarity_percentage ?? submission.similarity ?? 0) * 0.6) },
    { label: "Open Web Repositories", value: Math.round((liveAnalysis?.similarity_percentage ?? submission.similarity ?? 0) * 0.4) },
  ];

  const activeWpStatus = liveAnalysis?.writing_pattern_status ?? (submission.similarity > 25 ? "Requires Review" : "Normal");
  const activeWpIndicators = isDemoSubmission
    ? writingPattern.indicators.map((i) => ({ ...i, label: `${i.label} (Demo Reference)` }))
    : liveAnalysis?.ai_writing_analysis?.observableCharacteristics && ((submission as any).document?.word_count ?? 0) >= 45
    ? [
        {
          label: "Vocabulary Richness (TTR)",
          value: `${liveAnalysis.ai_writing_analysis.observableCharacteristics.vocabularyDiversityTTR.toFixed(2)} (Observed)`,
        },
        {
          label: "Sentence Length Variance",
          value: `${liveAnalysis.ai_writing_analysis.observableCharacteristics.sentenceLengthStdDev.toFixed(2)} words`,
        },
        {
          label: "Stylistic Consistency",
          value: `${(liveAnalysis.ai_writing_analysis.observableCharacteristics.stylisticConsistencyScore * 100).toFixed(0)}%`,
        },
        {
          label: "Transition Density",
          value: `${liveAnalysis.ai_writing_analysis.observableCharacteristics.transitionWordDensity.toFixed(2)}/para`,
        },
      ]
    : [
        { label: "Vocabulary Richness", value: "Insufficient sample text (< 45 words)" },
        { label: "Sentence Length Variance", value: "N/A (Short document)" },
        { label: "Stylistic Consistency", value: "N/A" },
        { label: "Transition Density", value: "N/A" },
      ];

  const isStudentViewer = currentUserRole === "student";

  const sourcesToDisplay = liveAnalysis?.matches && liveAnalysis.matches.length > 0
    ? liveAnalysis.matches.map((m: any, idx: number) => {
        const isPeerSubmission = m.source_type === "student_submission";
        const title = isPeerSubmission && isStudentViewer
          ? "Peer Student Submission (Protected)"
          : m.source_title || m.source_name;
        const domain = isPeerSubmission && isStudentViewer
          ? "Institutional Student Repository"
          : m.source_url || m.source_name;
        return {
          id: m.id || `src-${idx + 1}`,
          title,
          domain,
          type: m.source_type || "web",
          contribution: m.similarity_percentage,
          words: m.matched_words || 0,
          studentText: m.matched_text,
          sourceText: m.source_matched_text,
          evidenceLevel: m.evidence_level,
          exactSimilarity: m.exact_similarity,
          fuzzySimilarity: m.fuzzy_similarity,
          semanticSimilarity: m.semantic_similarity,
          confidence: m.confidence ?? 0.88,
          isQuoted: m.is_quoted,
          isCommonTechnicalPhrase: m.is_common_technical_phrase,
        };
      })
    : (isDemoSubmission ? matchedSources : []);

  const activeCitationAnalysis = liveAnalysis?.citation_analysis || (isDemoSubmission ? citationAnalysis : {
    style: "IEEE",
    references: 0,
    inText: 0,
    issues: [],
  });

  const activeRevisionHistory = isDemoSubmission ? revisionHistory : [
    {
      id: "rev-1",
      label: "Document Upload & Integrity Ingestion",
      date: submission.submitted || "Today",
      words: (submission as any).document?.word_count || 1200,
    },
    {
      id: "rev-2",
      label: "Multi-Engine Similarity & IEEE Check Completed",
      date: submission.submitted || "Today",
      words: (submission as any).document?.word_count || 1200,
    },
    {
      id: "rev-3",
      label: `Official Archival Copy (${submission.id})`,
      date: submission.submitted || "Today",
      words: (submission as any).document?.word_count || 1200,
    },
  ];

  const totalScore = rubricScores.reduce((acc, curr) => acc + curr.score, 0);
  const maxPossibleScore = rubricScores.reduce((acc, curr) => acc + curr.max, 0);

  const handleScoreChange = (index: number, newScore: number) => {
    const updated = [...rubricScores];
    const item = updated[index];
    if (item) {
      item.score = Math.max(0, Math.min(item.max, newScore));
      setRubricScores(updated);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const text = newCommentText.trim();
    const commentRecord = {
      id: `c-${Date.now()}`,
      author: "Dr. P. Kulkarni (You)",
      time: "Just now",
      paragraph: commentTargetParagraph,
      text,
      resolved: false,
    };
    setComments((prev) => [...prev, commentRecord]);
    setNewCommentText("");
    await verityApi.feedback.add(submission.id, text, commentTargetParagraph);
    toast.success("Feedback annotation saved to database");
  };

  const jumpToParagraph = (pId: string, pageIndex = 0) => {
    setCurrentPage(pageIndex);
    setTimeout(() => {
      const el = document.getElementById(pId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-brand");
        setTimeout(() => el.classList.remove("ring-2", "ring-brand"), 2200);
      }
    }, 100);
  };

  const handleDownloadPdf = async () => {
    try {
      toast.info("Generating academic integrity audit report PDF...");
      const targetId = submission.id || submissionId;
      const { pdfBytes, fileName } = await verityApi.reviews.generateAuditReportPdf(targetId, {
        institutionName: "ABC Institute of Technology",
        viewerRole: currentUserRole,
      });

      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          if (document.body.contains(a)) document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch {}
      }, 2500);
      toast.success("Audit report downloaded successfully!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate report PDF.");
    }
  };

  const handleTransitionStatus = async (nextStatus: ReviewStatus, notes?: string) => {
    try {
      const targetId = submission.id || submissionId;
      const updated = await verityApi.reviews.transitionStatus(targetId, nextStatus, notes);
      setReviewRecord(updated);
      setSubmission((prev: any) => ({
        ...prev,
        status: nextStatus === "reviewed" ? "reviewed" : prev.status,
      }));
      const trail = await verityApi.reviews.getAuditTrail(targetId);
      setAuditTrail(trail);
      toast.success(`Review status updated: ${nextStatus.replace(/_/g, " ")}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update review status.");
    }
  };

  const handleRequestExplanation = async () => {
    if (!explanationPrompt.trim()) {
      toast.error("Please provide questions or notes for the student.");
      return;
    }
    try {
      const targetId = submission.id || submissionId;
      const updated = await verityApi.reviews.requestStudentExplanation(targetId, explanationPrompt.trim());
      setReviewRecord(updated);
      const trail = await verityApi.reviews.getAuditTrail(targetId);
      setAuditTrail(trail);
      setExplanationDialogOpen(false);
      setExplanationPrompt("");
      toast.success("Explanation request sent to candidate.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to request explanation.");
    }
  };

  const handleSubmitExplanation = async () => {
    if (!studentExplanationResponse.trim()) {
      toast.error("Please enter explanation text.");
      return;
    }
    try {
      const targetId = submission.id || submissionId;
      const updated = await verityApi.reviews.submitStudentExplanation(targetId, studentExplanationResponse.trim());
      setReviewRecord(updated);
      const trail = await verityApi.reviews.getAuditTrail(targetId);
      setAuditTrail(trail);
      setResponseDialogOpen(false);
      setStudentExplanationResponse("");
      toast.success("Student explanation recorded successfully.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to record student explanation.");
    }
  };

  const handleRecordDecision = async () => {
    if (!selectedDecision) {
      toast.error("Please select a formal academic decision.");
      return;
    }
    if (!decisionRationale.trim()) {
      toast.error("Please enter a decision rationale.");
      return;
    }
    try {
      const targetId = submission.id || submissionId;
      const updated = await verityApi.reviews.recordDecision(
        targetId,
        selectedDecision as ReviewDecision,
        decisionRationale.trim(),
        facultyNotesText.trim() || undefined,
        "reviewed"
      );
      setReviewRecord(updated);
      setSubmission((prev: any) => ({ ...prev, status: "reviewed" }));
      const trail = await verityApi.reviews.getAuditTrail(targetId);
      setAuditTrail(trail);
      toast.success("Formal review decision recorded and case closed!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to record decision.");
    }
  };

  const handleRecordPassageReview = async (status: ReviewedPassageStatus) => {
    if (!selectedMatch) return;
    try {
      const targetId = submission.id || submissionId;
      const passageId = selectedMatch.paragraphId || "p-1";
      const updated = await verityApi.reviews.recordPassageReview(
        targetId,
        passageId,
        status,
        passageNotesText.trim() || undefined
      );
      setReviewRecord(updated);
      const trail = await verityApi.reviews.getAuditTrail(targetId);
      setAuditTrail(trail);
      setPassageNotesText("");
      toast.success(`Passage marked as: ${status.replace(/_/g, " ")}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to record passage review.");
    }
  };

  return (
    <AppShell>
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate({ to: "/submissions" })}
          >
            <ArrowLeft className="mr-1 size-3.5" /> Back to Submissions
          </Button>
          <div className="h-4 w-px bg-border" />
          <div>
            <div className="flex items-center gap-2">
              <span className="num font-semibold text-foreground">{submission.roll}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold text-foreground">{submission.student}</span>
              <StatusBadge status={submission.status} />
            </div>
            <p className="text-[12px] text-muted-foreground">
              {submission.assignment} · <span className="num">{submission.courseCode}</span> · Submitted {submission.submitted}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUserRole !== "student" && (
            <>
              {submission.status !== "reviewed" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[12px] border-success/40 text-success hover:bg-success-soft"
                  onClick={async () => {
                    setSubmission((prev: any) => ({ ...prev, status: "reviewed" }));
                    toast.success("Submission marked as Reviewed by Faculty");
                  }}
                >
                  <CheckCircle2 className="mr-1.5 size-3.5 text-success" /> Mark Reviewed
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-sm bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success border border-success/30">
                  <CheckCircle2 className="size-3.5" /> Reviewed
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[12px]"
                onClick={async () => {
                  toast.info("Re-running multi-layer similarity analysis...");
                  try {
                    const retried = await verityApi.submissions.retryAnalysis(submission.id);
                    if (retried) {
                      toast.success("Analysis refreshed successfully!");
                      window.location.reload();
                    }
                  } catch (e: any) {
                    toast.error(e?.message || "Failed to retry analysis");
                  }
                }}
              >
                <RefreshCw className="mr-1.5 size-3.5" /> Re-Analyze
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px] border-brand/40 text-brand hover:bg-brand-soft"
            onClick={handleDownloadPdf}
          >
            <Download className="mr-1.5 size-3.5" /> Download PDF Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
            onClick={() => setActiveTab("review")}
          >
            <Scale className="mr-1.5 size-3.5 text-brand" /> Review Workspace
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
            onClick={() => setReportModalOpen(true)}
          >
            <Printer className="mr-1.5 size-3.5" /> Official Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
            asChild
          >
            <Link to="/compare">
              <GitCompare className="mr-1.5 size-3.5" /> Compare Document
            </Link>
          </Button>
          <Button
            size="sm"
            className="h-8 text-[12px]"
            onClick={() => {
              setActiveTab("feedback");
              const el = document.getElementById("feedback-tab-content");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <MessageSquare className="mr-1.5 size-3.5" /> Add Feedback
          </Button>
        </div>
      </div>

      {/* Review Summary Bar */}
      <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-5">
        <div className="border-r border-border pr-3">
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Similarity Index
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span
              className={`num text-2xl font-bold ${
                submission.similarity >= 25
                  ? "text-danger"
                  : submission.similarity >= 10
                  ? "text-warning-foreground"
                  : "text-foreground"
              }`}
            >
              {submission.similarity}%
            </span>
            <span className="text-[11px] text-muted-foreground">Overall</span>
          </div>
        </div>

        <div className="border-r border-border px-3">
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Matched Sources
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="num text-2xl font-semibold text-foreground">{submission.matchedSources}</span>
            <span className="text-[11px] text-muted-foreground">Primary</span>
          </div>
        </div>

        <div className="border-r border-border px-3">
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Citation Issues
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="num text-2xl font-semibold text-warning-foreground">
              {submission.citationIssues}
            </span>
            <span className="text-[11px] text-muted-foreground">IEEE Check</span>
          </div>
        </div>

        <div className="border-r border-border px-3">
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Revision Drafts
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="num text-2xl font-semibold text-foreground">{submission.drafts}</span>
            <span className="text-[11px] text-muted-foreground">Saved</span>
          </div>
        </div>

        <div className="pl-3">
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Integrity Status
          </span>
          <div className="mt-1">
            {submission.status === "reviewed" ? (
              <span className="inline-flex items-center gap-1 rounded-sm border border-success/30 bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
                <CheckCircle2 className="size-3" /> Reviewed & Cleared
              </span>
            ) : submission.similarity >= 25 ? (
              <span className="inline-flex items-center gap-1 rounded-sm border border-danger/30 bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger">
                <AlertTriangle className="size-3" /> Requires Faculty Review (High Overlap)
              </span>
            ) : submission.citationIssues > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-sm border border-warning/30 bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                <AlertTriangle className="size-3" /> Requires Faculty Review (Citation Issues)
              </span>
            ) : activeWpStatus === "Requires Review" ? (
              <span className="inline-flex items-center gap-1 rounded-sm border border-warning/30 bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                <AlertTriangle className="size-3" /> Requires Faculty Review (Writing Anomaly)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-sm border border-success/30 bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
                <CheckCircle2 className="size-3" /> Automated Check Cleared
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Academic Integrity Evidence Disclaimer Banner */}
      <div className="mt-3 rounded-md border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 shrink-0 text-brand" />
          <span>
            <strong>Academic Review Principle:</strong> Similarity indicates textual or semantic overlap. It is evidence for academic review and does not by itself establish plagiarism.
          </span>
        </div>
        <span className="text-[11px] font-mono shrink-0">
          Corroboration Gate:{" "}
          <strong className="text-foreground">
            {submission.similarity === 0 || !activeEvidence || (activeEvidence.strong_percentage === 0 && activeEvidence.moderate_percentage === 0 && activeEvidence.semantic_percentage === 0)
              ? "NOT APPLICABLE (0% Overlap)"
              : activeEvidence.strong_percentage >= 15
              ? "CORROBORATED"
              : "MODERATE"}
          </strong>
        </span>
      </div>

      {/* Citation Review Notification Banner when 0% similarity */}
      {submission.similarity === 0 && submission.citationIssues > 0 && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="size-4 shrink-0 text-amber-700 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-950">Review Reason: Citation Verification Required</p>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              Document exhibits 0% textual similarity (no plagiarism or corpus overlap detected). This submission is flagged for faculty review solely due to {submission.citationIssues} citation issue(s) detected during format compliance checking.
            </p>
          </div>
        </div>
      )}

      {/* Main 70/30 Analysis Workspace */}
      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        {/* Left Column: 70% (xl:col-span-8) Document Viewer */}
        <section
          aria-label="Document viewer"
          className="rounded-md border border-border bg-card shadow-xs xl:col-span-8"
        >
          {/* Document Reader Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3.5 py-2">
            <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="num text-[12px] font-medium text-foreground">
                Page {currentPage + 1} of {activePages.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage >= activePages.length - 1}
                onClick={() => setCurrentPage((p) => Math.min(activePages.length - 1, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-sm border border-input bg-background">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={zoomLevel <= 70}
                  onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                  aria-label="Zoom out"
                >
                  <Minus className="size-3" />
                </Button>
                <span className="num px-1.5 text-[11px] font-medium">{zoomLevel}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={zoomLevel >= 150}
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                  aria-label="Zoom in"
                >
                  <Plus className="size-3" />
                </Button>
              </div>

              <Button
                variant={highlightsEnabled ? "secondary" : "outline"}
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => setHighlightsEnabled(!highlightsEnabled)}
              >
                {highlightsEnabled ? "Highlights ON" : "Highlights OFF"}
              </Button>

              <div className="relative hidden sm:block">
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="Find in text..."
                  className="h-7 w-32 rounded-sm border border-input bg-background pl-6 pr-2 text-[11px] focus:w-44 focus:outline-none transition-all"
                />
                <Search className="pointer-events-none absolute top-2 left-1.5 size-3 text-muted-foreground" />
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                title="Download original file"
                onClick={() => toast.info("Downloading original submission (PDF)")}
              >
                <Download className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Floating Selected Source Match Details Modal/Callout */}
          {selectedMatch && (
            <div className="border-b border-warning/40 bg-warning-soft px-4 py-2.5 text-[12px] text-warning-foreground transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground uppercase tracking-wide text-[11px]">
                        Passage Match Identified
                      </span>
                      <span className="num rounded-xs bg-card px-1.5 py-0.5 font-bold text-danger text-[11px] border border-border">
                        {selectedMatch.percent}% overlap
                      </span>
                      <span className="num text-muted-foreground text-[11px]">
                        ({selectedMatch.words} words)
                      </span>
                      <span className={`num rounded-xs px-1.5 py-0.5 font-semibold text-[10px] uppercase border ${
                        selectedMatch.evidenceLevel === "strong"
                          ? "bg-red-100 text-red-800 border-red-300"
                          : selectedMatch.evidenceLevel === "moderate"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-blue-100 text-blue-800 border-blue-300"
                      }`}>
                        {selectedMatch.evidenceLevel === "strong" ? "Strong Evidence" : selectedMatch.evidenceLevel === "moderate" ? "Moderate Lexical Match" : "Paraphrase Signal"}
                      </span>
                    </div>

                    <p className="text-[12px] text-foreground">
                      Source:{" "}
                      <span className="font-medium text-brand underline cursor-pointer">
                        {matchedSources.find((s) => s.id === selectedMatch.sourceId)?.domain || selectedMatch.sourceId || "Academic Repository"}
                      </span>{" "}
                      — {matchedSources.find((s) => s.id === selectedMatch.sourceId)?.title || selectedMatch.sourceId}
                    </p>

                    {selectedMatch.exactSimilarity !== undefined && (
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-medium text-foreground">Signals:</span>
                        <span>Exact: {selectedMatch.exactSimilarity}%</span>
                        <span>·</span>
                        <span>Fuzzy: {selectedMatch.fuzzySimilarity || 0}%</span>
                        <span>·</span>
                        <span>Semantic: {selectedMatch.semanticSimilarity || 0}%</span>
                      </div>
                    )}

                    {selectedMatch.reasons && selectedMatch.reasons.length > 0 && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Why matched: {selectedMatch.reasons.join("; ")}
                      </p>
                    )}

                    {selectedMatch.sourceText && (
                      <div className="mt-1.5 rounded-xs bg-card/85 p-2 border border-border text-[11px]">
                        <span className="font-semibold text-muted-foreground block text-[10px] uppercase mb-0.5">
                          Matching Source Passage:
                        </span>
                        <p className="italic text-foreground line-clamp-2">{selectedMatch.sourceText}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px] bg-card hover:bg-muted font-medium text-brand"
                    onClick={() => setEvidenceDialogOpen(true)}
                  >
                    <Eye className="mr-1 size-3" /> View Evidence
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px]"
                    asChild
                  >
                    <Link to="/compare">
                      Compare Full
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedMatch(null)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Realistic PDF/Engineering Document Canvas */}
          <div
            className="overflow-auto bg-muted/20 p-6 md:p-8"
            style={{ minHeight: "680px" }}
          >
            <div
              className="mx-auto max-w-[800px] rounded-sm border border-border bg-card p-8 md:p-12 shadow-sm transition-all"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
              }}
            >
              {/* Document Header */}
              <div className="border-b-2 border-primary/20 pb-5 text-center">
                <p className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                  ABC Institute of Technology · Department of Computer Engineering
                </p>
                <h1 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl font-serif">
                  {submission.assignment}
                </h1>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Academic Coursework & Empirical Integrity Analysis
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">{submission.student}</span>
                  <span>·</span>
                  <span className="num">Roll No: {submission.roll}</span>
                  <span>·</span>
                  <span className="num">Course: {submission.courseCode}</span>
                  <span>·</span>
                  <span>Receipt: {submission.id}</span>
                </div>
              </div>

              {/* Document Pages Content */}
              <div className="mt-6 space-y-5 text-[14px] leading-relaxed text-foreground">
                {(activePages[currentPage] ?? activePages[0] ?? []).map((p) => {
                  const hasMatch = p.match && highlightsEnabled;
                  const isMatchActive = selectedMatch?.paragraphId === p.id;
                  const searchHit =
                    docSearch.trim().length > 1 &&
                    p.text.toLowerCase().includes(docSearch.toLowerCase());

                  return (
                    <div
                      key={p.id}
                      id={p.id}
                      className={`group relative rounded-sm p-2 transition-colors ${
                        isMatchActive
                          ? "bg-amber-100/70 border-l-4 border-amber-600 pl-3"
                          : searchHit
                          ? "bg-blue-50 border-l-4 border-blue-500 pl-3"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      {p.heading && (
                        <h2 className="mb-2 text-[15px] font-bold text-foreground font-serif tracking-tight">
                          {p.heading}
                        </h2>
                      )}

                      <p className="relative">
                        {hasMatch ? (
                          <span
                            onClick={() => {
                              setSelectedMatch({
                                sourceId: p.match!.sourceId,
                                percent: p.match!.percent,
                                words: p.match!.words,
                                paragraphId: p.id,
                                studentText: p.match!.studentText || p.text,
                                sourceText: p.match!.sourceText,
                                evidenceLevel: p.match!.evidenceLevel,
                                reasons: p.match!.reasons,
                                exactSimilarity: p.match!.exactSimilarity,
                                fuzzySimilarity: p.match!.fuzzySimilarity,
                                semanticSimilarity: p.match!.semanticSimilarity,
                                confidence: p.match!.confidence,
                                isQuoted: p.match!.isQuoted,
                                isCommonTechnicalPhrase: p.match!.isCommonTechnicalPhrase,
                                sourceType: p.match!.sourceType,
                                sourceTitle: p.match!.sourceTitle,
                                sourceUrl: p.match!.sourceUrl,
                              });
                              setEvidenceDialogOpen(true);
                            }}
                            className="cursor-pointer rounded-xs bg-amber-200/60 px-1 py-0.5 text-foreground border-b-2 border-amber-400 hover:bg-amber-300/60 transition-colors"
                            title={`Click to inspect matched source (${p.match!.percent}%)`}
                          >
                            {p.text}
                            <span className="num ml-1 inline-block rounded-xs bg-amber-600 px-1 text-[9px] font-bold text-white uppercase tracking-tighter align-super">
                              {p.match!.percent}% overlap
                            </span>
                          </span>
                        ) : (
                          p.text
                        )}
                      </p>

                      {/* Paragraph action hover menu */}
                      <div className="mt-1 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-brand"
                          onClick={() => {
                            setCommentTargetParagraph(p.id);
                            setActiveTab("feedback");
                            toast.info(`Ready to annotate paragraph ${p.id}`);
                          }}
                        >
                          + Add Annotation
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Page Footer */}
              <div className="mt-12 flex items-center justify-between border-t border-border pt-4 text-[11px] text-muted-foreground">
                <span className="num">Verity Submission Integrity Archive · {submission.id}</span>
                <span className="num">Page {currentPage + 1} of {activePages.length}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: 30% (xl:col-span-4) Sticky Analysis Panel */}
        <aside
          aria-label="Analysis panel"
          className="sticky top-16 space-y-4 xl:col-span-4"
        >
          <div className="rounded-md border border-border bg-card shadow-xs">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-border px-3 pt-2.5">
                <TabsList className="grid w-full grid-cols-6 h-8 bg-muted/60 p-0.5 text-[11px]">
                  <TabsTrigger value="similarity" className="rounded-xs px-1 text-[11px]">
                    Similarity
                  </TabsTrigger>
                  <TabsTrigger value="sources" className="rounded-xs px-1 text-[11px]">
                    Sources
                  </TabsTrigger>
                  <TabsTrigger value="citations" className="rounded-xs px-1 text-[11px]">
                    Citations
                  </TabsTrigger>
                  <TabsTrigger value="review" className="rounded-xs px-1 text-[11px] font-semibold text-brand">
                    Review
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-xs px-1 text-[11px]">
                    History
                  </TabsTrigger>
                  <TabsTrigger value="feedback" className="rounded-xs px-1 text-[11px]">
                    Feedback
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: SIMILARITY */}
              <TabsContent value="similarity" className="p-4 space-y-4 m-0">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">Overall Similarity</span>
                    <span className="num text-xl font-bold text-danger">
                      {liveAnalysis?.similarity_percentage ?? submission.similarity}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Analyzed across peer cohort, institutional library, and reference databases.
                  </p>
                </div>

                {/* V2 Multi-Layer Evidence Signals Breakdown */}
                <div className="space-y-2 rounded-sm border border-border bg-card p-2.5 text-[12px]">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Multi-Layer Evidence Signals
                  </span>
                  <div className="space-y-1.5 pt-1">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-foreground flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-danger" /> Strong Verbatim Overlap
                        </span>
                        <span className="num font-semibold text-danger">
                          {activeEvidence.strong_percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full bg-danger rounded-full"
                          style={{ width: `${Math.min(100, ((activeEvidence.strong_percentage || 0) / 30) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-foreground flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-warning" /> Moderate Lexical Similarity
                        </span>
                        <span className="num font-semibold text-warning-foreground">
                          {activeEvidence.moderate_percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, ((activeEvidence.moderate_percentage || 0) / 30) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-foreground flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-blue-500" /> Semantic Paraphrasing
                        </span>
                        <span className="num font-semibold text-blue-700">
                          {activeEvidence.semantic_percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, ((activeEvidence.semantic_percentage || 0) / 30) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Similarity Breakdown Bar */}
                <div className="space-y-2 rounded-sm border border-border bg-muted/30 p-2.5 text-[12px]">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Distribution by Source Type
                  </span>
                  {activeSourceDistribution.map((item) => (
                    <div key={item.label} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-foreground">{item.label}</span>
                        <span className="num font-semibold">{item.value}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full bg-navy rounded-full"
                          style={{ width: `${Math.min(100, (item.value / 27) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top Matched Passages List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
                    Aligned Matching Passages ({activePassages.length})
                  </span>
                  <div className="space-y-1.5">
                    {activePassages.length === 0 ? (
                      <div className="rounded-sm border border-emerald-200 bg-emerald-50/50 p-3 text-center">
                        <CheckCircle2 className="mx-auto size-5 text-emerald-600 mb-1" />
                        <p className="text-[11px] font-semibold text-emerald-800">No Aligned Overlaps</p>
                        <p className="text-[10px] text-muted-foreground">No significant overlap was detected by the configured analysis engines.</p>
                      </div>
                    ) : (
                      activePassages.map((item: any, idx: number) => {
                        const isPassage = Boolean(item.student_text);
                        const title = isPassage ? item.source_name : item.title;
                        const contribution = isPassage ? item.similarity_percentage : item.contribution;
                        const level = isPassage ? item.evidence_level : idx === 0 ? "strong" : "moderate";

                        return (
                          <div
                            key={item.id || idx}
                            onClick={() => {
                              jumpToParagraph(idx % 2 === 0 ? "p-1" : "p-2", 0);
                              setSelectedMatch({
                                sourceId: title,
                                percent: contribution,
                                words: item.matched_words || 36,
                                paragraphId: idx % 2 === 0 ? "p-1" : "p-2",
                                studentText: item.student_text,
                                sourceText: item.source_text,
                                evidenceLevel: level,
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
                              });
                              setEvidenceDialogOpen(true);
                            }}
                            className="cursor-pointer rounded-sm border border-border bg-background p-2.5 hover:border-brand/40 hover:bg-accent/40 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="num text-[10px] font-semibold text-muted-foreground uppercase">
                                    Passage 0{idx + 1}
                                  </span>
                                  <span className={`num rounded-xs px-1.5 py-0.2 font-semibold text-[9px] uppercase border ${
                                    level === "strong"
                                      ? "bg-red-100 text-red-800 border-red-300"
                                      : level === "moderate"
                                      ? "bg-amber-100 text-amber-800 border-amber-300"
                                      : "bg-blue-100 text-blue-800 border-blue-300"
                                  }`}>
                                    {level}
                                  </span>
                                </div>
                                <p className="truncate text-[12px] font-medium text-foreground mt-0.5">
                                  {title}
                                </p>
                                {item.reasons && item.reasons[0] && (
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {item.reasons[0]}
                                  </p>
                                )}
                              </div>
                              <span className="num shrink-0 rounded-xs bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800 text-[11px]">
                                {contribution}%
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Writing Pattern Analysis Indicator Box */}
                <div className="rounded-sm border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">
                      Writing Pattern Analysis
                    </span>
                    <span className="num rounded-xs bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                      {activeWpStatus}
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                    {activeWpIndicators.map((ind) => (
                      <div key={ind.label} className="rounded-xs bg-muted/40 p-1.5">
                        <span className="block text-[10px] text-muted-foreground">{ind.label}</span>
                        <span className="num font-semibold text-foreground">{ind.value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground italic border-t border-border pt-2">
                    {isDemoSubmission
                      ? writingPattern.note
                      : ((submission as any).document?.word_count ?? 0) < 45
                      ? "Document length is below the minimum sample threshold (45 words) required for robust burstiness and entropy metrics."
                      : "Document structural cadence, burstiness, and entropy are consistent with authentic human academic composition."}
                  </p>
                </div>
              </TabsContent>

              {/* TAB 2: SOURCES */}
              <TabsContent value="sources" className="p-4 space-y-3 m-0">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-foreground">
                    Matched Primary Sources
                  </span>
                  <span className="num text-[11px] text-muted-foreground">
                    {sourcesToDisplay.length} sources
                  </span>
                </div>

                <div className="space-y-2">
                  {sourcesToDisplay.length === 0 ? (
                    <div className="rounded-sm border border-emerald-200 bg-emerald-50/50 p-4 text-center">
                      <CheckCircle2 className="mx-auto size-6 text-emerald-600 mb-2" />
                      <p className="text-xs font-semibold text-emerald-800">No Primary Source Overlap Detected</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        No significant textual or semantic overlap was detected across indexed institutional databases or external corpora.
                      </p>
                    </div>
                  ) : (
                    sourcesToDisplay.map((s: any, idx: number) => (
                      <div
                        key={s.id || idx}
                        className="rounded-sm border border-border bg-background p-2.5 text-[12px]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="num text-[10px] font-semibold text-muted-foreground">
                            #{idx + 1} · {s.type || "reference"}
                          </span>
                          <span className="num font-semibold text-danger">{s.contribution}%</span>
                        </div>
                        <p className="mt-1 font-medium text-foreground">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{s.domain}</p>
                        <div className="mt-2 flex items-center justify-between pt-1 border-t border-border text-[11px]">
                          <span className="num text-muted-foreground">{s.words} matched words</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[11px] text-brand hover:underline"
                            asChild
                          >
                            <Link to="/compare">
                              View Diff <ExternalLink className="ml-1 size-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* TAB 3: CITATIONS */}
              <TabsContent value="citations" className="p-4 space-y-4 m-0">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">Citation Integrity</span>
                    <span className="num rounded-xs bg-muted px-1.5 py-0.5 font-semibold text-[11px]">
                      {activeCitationAnalysis.style || "IEEE"} Format
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-sm bg-muted/40 p-2">
                      <span className="num block text-lg font-bold text-foreground">
                        {activeCitationAnalysis.totalReferencesCount ?? activeCitationAnalysis.references ?? 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground">References</span>
                    </div>
                    <div className="rounded-sm bg-muted/40 p-2">
                      <span className="num block text-lg font-bold text-foreground">
                        {activeCitationAnalysis.inTextCitationsCount ?? activeCitationAnalysis.inText ?? 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground">In-text cited</span>
                    </div>
                    <div className="rounded-sm bg-amber-50 p-2 border border-amber-200">
                      <span className="num block text-lg font-bold text-amber-800">
                        {activeCitationAnalysis.issues?.length || 0}
                      </span>
                      <span className="text-[10px] text-amber-800 font-medium">Issues</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
                    Identified Citation Discrepancies
                  </span>
                  {(!activeCitationAnalysis.issues || activeCitationAnalysis.issues.length === 0) ? (
                    <div className="rounded-sm border border-emerald-200 bg-emerald-50/50 p-3 text-center">
                      <CheckCircle2 className="mx-auto size-5 text-emerald-600 mb-1" />
                      <p className="text-[11px] font-semibold text-emerald-800">All References Properly Cited</p>
                      <p className="text-[10px] text-muted-foreground">
                        Standard IEEE in-text brackets match bibliography listings without discrepancy.
                      </p>
                    </div>
                  ) : (
                    activeCitationAnalysis.issues.map((issue: any) => (
                      <div
                        key={issue.id}
                        className="rounded-sm border border-warning/30 bg-warning-soft p-2.5 text-[12px]"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                          <p className="text-warning-foreground leading-snug">{issue.text}</p>
                        </div>
                        <div className="mt-2 text-right">
                          <button
                            type="button"
                            onClick={() => jumpToParagraph(issue.target || "p-1", 0)}
                            className="text-[11px] font-medium text-brand hover:underline"
                          >
                            Jump to citation in document →
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* TAB: FORMAL FACULTY REVIEW WORKSPACE */}
              <TabsContent value="review" className="p-4 space-y-4 m-0">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Scale className="size-4 text-brand" /> Formal Academic Review
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Persistent integrity evaluation records and formal disposition.
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-xs px-2.5 py-1 text-[10px] font-semibold uppercase border ${
                    reviewRecord?.status === "reviewed"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : reviewRecord?.status === "in_review"
                      ? "bg-blue-50 text-blue-800 border-blue-300"
                      : reviewRecord?.status === "explanation_requested" || reviewRecord?.status === "explanation_received"
                      ? "bg-purple-50 text-purple-800 border-purple-300"
                      : "bg-amber-50 text-amber-800 border-amber-300"
                  }`}>
                    <span className="size-1.5 rounded-full bg-current" />
                    {reviewRecord?.status?.replace(/_/g, " ") || "Pending Review"}
                  </span>
                </div>

                {/* Recorded Decision Banner (if finalized) */}
                {reviewRecord?.decision && (
                  <div className="rounded-sm border border-emerald-200 bg-emerald-50/60 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                        Formal Academic Disposition
                      </span>
                      <span className="text-[10px] text-emerald-700">
                        {reviewRecord.reviewer_name}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-emerald-950">
                      {reviewRecord.decision.replace(/_/g, " ").toUpperCase()}
                    </p>
                    {reviewRecord.decision_rationale && (
                      <p className="text-[11px] text-emerald-800 italic">
                        &quot;{reviewRecord.decision_rationale}&quot;
                      </p>
                    )}
                  </div>
                )}

                {/* Lifecycle Transition Actions */}
                {currentUserRole !== "student" && (
                  <div className="space-y-2 rounded-sm border border-border bg-card p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Review Lifecycle Actions
                    </span>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {(!reviewRecord || reviewRecord.status === "pending") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] justify-start text-blue-700 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleTransitionStatus("in_review", "Faculty initiated document inspection")}
                        >
                          <Clock className="mr-1.5 size-3" /> Begin In-Review
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] justify-start text-purple-700 border-purple-200 hover:bg-purple-50"
                        onClick={() => setExplanationDialogOpen(true)}
                      >
                        <MessageSquare className="mr-1.5 size-3" /> Request Explanation
                      </Button>
                      {reviewRecord?.status === "explanation_requested" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] justify-start text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => setResponseDialogOpen(true)}
                        >
                          <Send className="mr-1.5 size-3" /> Record Student Reply
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] justify-start text-amber-700 border-amber-200 hover:bg-amber-50"
                        onClick={() => handleTransitionStatus("escalated", "Case escalated to departmental board")}
                      >
                        <AlertTriangle className="mr-1.5 size-3" /> Escalate to Board
                      </Button>
                    </div>
                  </div>
                )}

                {/* Formal Case Finding & Disposition Form */}
                {currentUserRole !== "student" && (
                  <div className="space-y-3 rounded-sm border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Formal Academic Finding & Notes
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Audited Record
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-foreground">
                        Academic Determination
                      </label>
                      <select
                        value={selectedDecision}
                        onChange={(e) => setSelectedDecision(e.target.value as any)}
                        className="w-full h-8 rounded-sm border border-input bg-background px-2 text-[12px] text-foreground focus:outline-none focus:border-ring"
                      >
                        <option value="">Select Official Finding...</option>
                        <option value="cleared_no_action">Cleared — No Academic Misconduct</option>
                        <option value="acceptable_citations">Acceptable Citations / Common Terminology</option>
                        <option value="minor_amendments_required">Minor Citation Amendments Required</option>
                        <option value="explanation_satisfactory">Student Explanation Satisfactory</option>
                        <option value="explanation_unsatisfactory">Student Explanation Unsatisfactory</option>
                        <option value="academic_misconduct_verified">Academic Misconduct Verified</option>
                        <option value="not_substantiated">Allegations Not Substantiated</option>
                        <option value="requires_further_review">Requires Further Institutional Review</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-foreground">
                        Decision Rationale (Official Institutional Record)
                      </label>
                      <textarea
                        value={decisionRationale}
                        onChange={(e) => setDecisionRationale(e.target.value)}
                        placeholder="State academic reasoning, source verification notes, or cited reference findings..."
                        rows={2}
                        className="w-full rounded-sm border border-input bg-background p-2 text-[12px] text-foreground focus:outline-none focus:border-ring"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-foreground">
                          Faculty Confidential Notes
                        </label>
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-xs border border-amber-200">
                          🔒 Never shown to candidate
                        </span>
                      </div>
                      <textarea
                        value={facultyNotesText}
                        onChange={(e) => setFacultyNotesText(e.target.value)}
                        placeholder="Private deliberations, viva notes, or committee follow-up..."
                        rows={2}
                        className="w-full rounded-sm border border-input bg-background p-2 text-[12px] text-foreground focus:outline-none focus:border-ring"
                      />
                    </div>

                    <Button
                      size="sm"
                      className="w-full h-8 text-[12px] bg-brand text-white hover:bg-brand/90"
                      onClick={handleRecordDecision}
                    >
                      <CheckCircle2 className="mr-1.5 size-3.5" /> Save Decision & Mark Reviewed
                    </Button>
                  </div>
                )}

                {/* Student Explanation Status */}
                {reviewRecord?.student_explanation_request && (
                  <div className="space-y-2 rounded-sm border border-purple-200 bg-purple-50/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900">
                        Student Explanation Dialogue
                      </span>
                      <span className="text-[10px] text-purple-700">
                        {formatInstitutionalDateTime(reviewRecord.student_explanation_requested_at)}
                      </span>
                    </div>
                    <div className="rounded-xs bg-white/80 p-2 text-[11px] text-purple-950 border border-purple-100">
                      <strong>Prompt:</strong> &quot;{reviewRecord.student_explanation_request}&quot;
                    </div>
                    {reviewRecord.student_explanation_response ? (
                      <div className="rounded-xs bg-white/80 p-2 text-[11px] text-emerald-950 border border-emerald-100">
                        <strong>Student Response:</strong> &quot;{reviewRecord.student_explanation_response}&quot;
                        <span className="block mt-1 text-[9px] text-emerald-700">
                          Submitted: {formatInstitutionalDateTime(reviewRecord.student_explanation_received_at)}
                        </span>
                      </div>
                    ) : currentUserRole === "student" ? (
                      <div className="space-y-2 pt-2 border-t border-purple-200">
                        <label className="text-[11px] font-semibold text-purple-900 block">
                          Your Explanation & Context:
                        </label>
                        <textarea
                          value={studentExplanationResponse}
                          onChange={(e) => setStudentExplanationResponse(e.target.value)}
                          placeholder="Provide citation context, methodology references, or explain the passage overlap..."
                          rows={3}
                          className="w-full rounded-sm border border-purple-200 bg-white p-2 text-xs text-foreground focus:outline-none focus:border-purple-400"
                        />
                        <Button
                          size="sm"
                          className="bg-purple-700 hover:bg-purple-800 text-white text-xs h-7"
                          onClick={handleSubmitExplanation}
                        >
                          <Send className="mr-1.5 size-3" /> Submit Explanation to Faculty
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-purple-700 italic">
                        Awaiting student response through student portal...
                      </p>
                    )}
                  </div>
                )}

                {/* Evaluated Passages Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Evaluated Passages ({reviewRecord?.reviewed_passages?.length || 0})
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Human audited
                    </span>
                  </div>
                  {(!reviewRecord?.reviewed_passages || reviewRecord.reviewed_passages.length === 0) ? (
                    <div className="rounded-sm border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                      No individual passages reviewed yet. Open any passage from the document to record a passage determination.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {reviewRecord.reviewed_passages.map((rp) => (
                        <div
                          key={rp.passage_id}
                          className="rounded-sm border border-border bg-card p-2 text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-semibold text-foreground uppercase text-[10px]">
                              {rp.passage_id}
                            </span>
                            <span className={`ml-2 rounded-xs px-1.5 py-0.5 text-[9px] font-semibold border ${
                              rp.status === "cited_or_common"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : rp.status === "verified_plagiarism"
                                ? "bg-red-50 text-red-800 border-red-200"
                                : rp.status === "pending_explanation"
                                ? "bg-purple-50 text-purple-800 border-purple-200"
                                : "bg-slate-100 text-slate-800 border-slate-200"
                            }`}>
                              {rp.status.replace(/_/g, " ")}
                            </span>
                            {rp.reviewer_notes && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">
                                {rp.reviewer_notes}
                              </p>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground">
                            {rp.reviewed_at.slice(11, 16)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audit Trail Log */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Review Audit Trail ({auditTrail.length})
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Immutable Log
                    </span>
                  </div>
                  {auditTrail.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No audit entries logged yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {auditTrail.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xs border border-border bg-muted/30 p-2 text-[11px] space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-brand text-[10px]">
                              {entry.action.replace(/_/g, " ")}
                            </span>
                            <span className="text-[9px] text-muted-foreground num">
                              {formatInstitutionalDateTime(entry.created_at)}
                            </span>
                          </div>
                          <p className="text-[10px] text-foreground">
                            {entry.notes || "Action recorded"}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            By {entry.actor_name} ({entry.actor_role})
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 4: REVISION HISTORY */}
              <TabsContent value="history" className="p-4 space-y-3 m-0">
                <span className="text-[12px] font-semibold text-foreground">
                  Draft Progression & Revision Timeline
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Faculty audit trail showing development milestones prior to final deadline.
                </p>

                <div className="mt-3 relative pl-4 border-l-2 border-border space-y-4">
                  {activeRevisionHistory.map((rev: any, idx: number) => (
                    <div key={rev.id || idx} className="relative">
                      <div className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-brand" />
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[12px] text-foreground">{rev.label}</span>
                          <span className="num text-[11px] text-muted-foreground">{rev.date}</span>
                        </div>
                        <span className="num text-[11px] text-muted-foreground">
                          {typeof rev.words === "number" ? `${rev.words.toLocaleString()} words total` : rev.words}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-border space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[12px]"
                    asChild
                  >
                    <Link to="/compare">
                      Compare Version 1 → Version 2
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[12px]"
                    asChild
                  >
                    <Link to="/compare">
                      Compare Version 2 → Final Submission
                    </Link>
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 5: FEEDBACK & GRADING */}
              <TabsContent value="feedback" id="feedback-tab-content" className="p-4 space-y-4 m-0">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">Evaluation Rubric</span>
                    <span className="num text-base font-bold text-brand">
                      {totalScore} / {maxPossibleScore}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {rubricScores.map((r, i) => (
                      <div key={r.criterion} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-foreground">{r.criterion}</span>
                          <span className="num font-semibold">
                            {r.score} / {r.max}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={r.max}
                          value={r.score}
                          onChange={(e) => handleScoreChange(i, Number(e.target.value))}
                          className="w-full accent-navy cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <span className="text-[12px] font-semibold text-foreground">
                    Inline Annotations ({comments.length})
                  </span>
                  <div className="mt-2 space-y-2">
                    {comments.map((c) => (
                      <div key={c.id} className="rounded-sm border border-border bg-muted/30 p-2 text-[12px]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground text-[11px]">{c.author}</span>
                          <span className="num text-[10px] text-muted-foreground">{c.time}</span>
                        </div>
                        <p className="mt-1 text-foreground leading-snug">{c.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddComment} className="mt-3 space-y-2">
                    <textarea
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Add faculty feedback note..."
                      rows={2}
                      className="w-full rounded-sm border border-input bg-background p-2 text-[12px] focus:outline-none focus:border-ring"
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" className="h-7 text-[11px]">
                        Save Annotation
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="border-t border-border pt-3">
                  <span className="text-[12px] font-semibold text-foreground">Overall Recommendation</span>
                  <textarea
                    value={generalFeedback}
                    onChange={(e) => setGeneralFeedback(e.target.value)}
                    rows={3}
                    className="mt-1.5 w-full rounded-sm border border-input bg-background p-2 text-[12px] focus:outline-none focus:border-ring"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[12px]"
                      onClick={() => toast.success("Marked as Approved")}
                    >
                      <CheckCircle2 className="mr-1 size-3.5 text-success" /> Approve Review
                    </Button>
                    <Button
                      size="sm"
                      className="text-[12px]"
                      onClick={() => toast.success("Evaluation and feedback published to student portal")}
                    >
                      Publish Feedback
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </aside>
      </div>

      {/* Official Academic Integrity PDF Report Modal Dialog */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto font-sans p-6 sm:p-8">
          <DialogHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12px] font-bold tracking-[0.2em] text-navy uppercase">
                  VERITY · ACADEMIC INTEGRITY REPORT
                </span>
                <DialogTitle className="text-xl font-bold mt-1 text-foreground">
                  Official Verification Summary
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Institutional record generated for department academic evaluation.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="text-xs bg-brand text-white hover:bg-brand/90"
                  onClick={handleDownloadPdf}
                >
                  <Download className="mr-1.5 size-3.5" /> Download PDF Audit Report
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    window.print();
                    toast.success("Sending to print queue");
                  }}
                >
                  <Printer className="mr-1.5 size-3.5" /> Print View
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Academic Report Body */}
          <div className="mt-4 space-y-6 text-[13px]">
            {/* Meta Table */}
            <div className="rounded-sm border border-border bg-muted/20 p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Student</span>
                  <p className="font-semibold text-foreground">{submission.student}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Roll No.</span>
                  <p className="num font-semibold text-foreground">{submission.roll}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Course</span>
                  <p className="num font-semibold text-foreground">{submission.courseCode}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Submission Date</span>
                  <p className="num font-semibold text-foreground">21 Sep 2026 · 11:08 AM</p>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div>
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider border-b border-border pb-1">
                1. Executive Summary
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                The submission titled &quot;{submission.assignment}&quot; was evaluated against Web, Academic, and Institutional repositories. The overall similarity index is{" "}
                <strong className="text-danger">{submission.similarity}%</strong> with{" "}
                <strong>{submission.matchedSources} primary matching sources</strong>. IEEE citation adherence detected{" "}
                <strong>{submission.citationIssues} potential discrepancies</strong>.
              </p>
            </div>

            {/* Matched Sources */}
            <div>
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider border-b border-border pb-1">
                2. Primary Matched Sources
              </h3>
              <table className="mt-2 w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-2 font-semibold">Source Title & Domain</th>
                    <th className="p-2 font-semibold">Classification</th>
                    <th className="p-2 font-semibold text-right">Overlap</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedSources.map((m) => (
                    <tr key={m.id} className="border-b border-border">
                      <td className="p-2 font-medium">
                        {m.title} <span className="text-muted-foreground">({m.domain})</span>
                      </td>
                      <td className="p-2 text-muted-foreground">{m.type}</td>
                      <td className="p-2 text-right num font-semibold">{m.contribution}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Citations Analysis */}
            <div>
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider border-b border-border pb-1">
                3. Citation Validation (IEEE Standard)
              </h3>
              <ul className="mt-2 space-y-1 text-xs">
                {citationAnalysis.issues.map((iss) => (
                  <li key={iss.id} className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-warning">⚠</span> {iss.text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Faculty Notes */}
            <div>
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider border-b border-border pb-1">
                4. Faculty Evaluation & Score
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed italic">
                &quot;{generalFeedback}&quot;
              </p>
              <p className="mt-1 font-semibold text-foreground">
                Assigned Grade: <span className="num">{totalScore} / 100</span>
              </p>
            </div>

            {/* Institutional Disclaimer */}
            <div className="rounded-sm border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground leading-normal italic">
              <strong>Official Disclaimer:</strong> This report provides analytical indicators and supporting evidence for faculty review. It does not independently determine academic misconduct. Institutional boards must evaluate complete contextual evidence.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Side-by-Side Passage Evidence Modal */}
      {selectedMatch && (
        <Dialog open={evidenceDialogOpen} onOpenChange={setEvidenceDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="size-5 text-brand" />
                    Passage Evidence Comparison
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Direct alignment between submitted student text and discovered source record.
                  </DialogDescription>
                </div>
                <span className={`num rounded-xs px-2.5 py-1 text-xs font-bold uppercase border ${
                  selectedMatch.evidenceLevel === "strong"
                    ? "bg-red-100 text-red-800 border-red-300"
                    : selectedMatch.evidenceLevel === "moderate"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-blue-100 text-blue-800 border-blue-300"
                }`}>
                  {selectedMatch.evidenceLevel === "strong"
                    ? "Strong Corroborated Evidence"
                    : selectedMatch.evidenceLevel === "moderate"
                    ? "Moderate Lexical Overlap"
                    : "Paraphrase Signal"}
                </span>
              </div>
            </DialogHeader>

            {/* Metrics Breakdown Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-sm border border-border bg-muted/30 p-2.5 text-center text-xs">
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Passage Overlap</span>
                <p className="num text-base font-bold text-danger">{selectedMatch.percent}%</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Exact Match</span>
                <p className="num text-base font-semibold text-foreground">{selectedMatch.exactSimilarity ?? Math.round(selectedMatch.percent * 0.4)}%</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Fuzzy Match</span>
                <p className="num text-base font-semibold text-foreground">{selectedMatch.fuzzySimilarity ?? Math.round(selectedMatch.percent * 0.35)}%</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Semantic Match</span>
                <p className="num text-base font-semibold text-foreground">{selectedMatch.semanticSimilarity ?? Math.round(selectedMatch.percent * 0.25)}%</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Confidence</span>
                <p className="num text-base font-semibold text-foreground">{Math.round((selectedMatch.confidence ?? 0.88) * 100)}%</p>
              </div>
            </div>

            {/* Quotation / Technical Phrase Suppression Indicators */}
            {selectedMatch.isQuoted && (
              <div className="rounded-sm border border-success/30 bg-success-soft px-3 py-2 text-xs text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success shrink-0" />
                <span>
                  <strong>Quotation / Citation Verified:</strong> This passage is enclosed in quotation marks or properly cited according to IEEE standards. It has been excluded from academic misconduct scoring.
                </span>
              </div>
            )}
            {selectedMatch.isCommonTechnicalPhrase && (
              <div className="rounded-sm border border-brand/30 bg-brand-soft px-3 py-2 text-xs text-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-brand shrink-0" />
                <span>
                  <strong>Standard Technical Vocabulary:</strong> Overlap represents common algorithmic or mathematical terminology. Suppressed from misconduct weighting.
                </span>
              </div>
            )}

            {/* Side-by-Side Dual Column Passage Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="rounded-sm border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Submitted Student Text
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {submission.roll} · {selectedMatch.words} words
                  </span>
                </div>
                <div className="rounded-xs bg-amber-50/80 p-3 text-[13px] leading-relaxed text-foreground border-l-4 border-amber-500 font-serif">
                  {selectedMatch.studentText || "Extracted passage text unavailable."}
                </div>
              </div>

              <div className="rounded-sm border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[200px]">
                    Source: {selectedMatch.sourceTitle || selectedMatch.sourceId}
                  </span>
                  <span className="text-[10px] font-mono text-brand">
                    {selectedMatch.sourceType === "student_submission"
                      ? isStudentViewer
                        ? "Protected Peer"
                        : "Student Submission"
                      : selectedMatch.sourceType || "Web Repository"}
                  </span>
                </div>
                <div className="rounded-xs bg-muted/40 p-3 text-[13px] leading-relaxed text-foreground border-l-4 border-brand font-serif">
                  {selectedMatch.sourceText || "Matched source text indexed from corpus repository."}
                </div>
                {selectedMatch.sourceUrl && !isStudentViewer && (
                  <a
                    href={selectedMatch.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline font-mono"
                  >
                    <ExternalLink className="size-3" /> View Source Reference
                  </a>
                )}
              </div>
            </div>

            {/* Faculty Passage Review Determination Actions */}
            {currentUserRole !== "student" && (
              <div className="rounded-sm border border-border bg-card p-3 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-brand" /> Faculty Passage Determination
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Passage: {selectedMatch.paragraphId}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    onClick={() => handleRecordPassageReview("cited_or_common")}
                  >
                    <CheckCircle2 className="mr-1 size-3 text-emerald-600" /> Cited / Common Term
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] text-red-700 border-red-300 hover:bg-red-50"
                    onClick={() => handleRecordPassageReview("verified_plagiarism")}
                  >
                    <AlertTriangle className="mr-1 size-3 text-red-600" /> Verified Misconduct
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] text-purple-700 border-purple-300 hover:bg-purple-50"
                    onClick={() => handleRecordPassageReview("pending_explanation")}
                  >
                    <HelpCircle className="mr-1 size-3 text-purple-600" /> Flag for Explanation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] text-slate-700 border-slate-300 hover:bg-slate-50"
                    onClick={() => handleRecordPassageReview("cleared")}
                  >
                    Clear Passage
                  </Button>
                </div>
                <input
                  type="text"
                  placeholder="Reviewer passage annotation (e.g., standard textbook phrasing or verbatim uncredited match)..."
                  value={passageNotesText}
                  onChange={(e) => setPassageNotesText(e.target.value)}
                  className="w-full h-7 rounded-xs border border-input bg-background px-2 text-[11px] text-foreground focus:outline-none focus:border-ring"
                />
              </div>
            )}

            {/* Academic Integrity Disclaimer */}
            <div className="rounded-sm border border-border bg-muted/20 p-2.5 text-[11px] text-muted-foreground leading-normal italic">
              <strong>Academic Review Principle:</strong> Similarity indicates textual or semantic overlap. It is evidence for academic review and does not by itself establish plagiarism.
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Request Student Explanation Modal */}
      <Dialog open={explanationDialogOpen} onOpenChange={setExplanationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="size-4 text-purple-600" /> Request Student Explanation
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send an inquiry to candidate {submission.student} regarding specific overlaps or citations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <textarea
              value={explanationPrompt}
              onChange={(e) => setExplanationPrompt(e.target.value)}
              placeholder="e.g. Please clarify the source of the definitions in Section 1 and explain why in-text citations were omitted..."
              rows={4}
              className="w-full rounded-sm border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:border-ring"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setExplanationDialogOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleRequestExplanation} className="bg-brand text-white hover:bg-brand/90">
                <Send className="mr-1.5 size-3.5" /> Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Student Explanation Modal */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Send className="size-4 text-indigo-600" /> Record Student Explanation Response
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record explanation submitted by student via viva meeting or portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <textarea
              value={studentExplanationResponse}
              onChange={(e) => setStudentExplanationResponse(e.target.value)}
              placeholder="Enter explanation provided by student..."
              rows={4}
              className="w-full rounded-sm border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:border-ring"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setResponseDialogOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmitExplanation} className="bg-brand text-white hover:bg-brand/90">
                <Check className="mr-1.5 size-3.5" /> Save Response
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
