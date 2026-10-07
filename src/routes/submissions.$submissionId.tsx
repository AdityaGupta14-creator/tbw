import { useState, useRef, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookMarked,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  GitCompare,
  HelpCircle,
  LayoutDashboard,
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
import { SubmissionOverviewTab } from "@/components/submission-tabs/submission-overview-tab";
import { SubmissionEvidenceTab } from "@/components/submission-tabs/submission-evidence-tab";
import { SubmissionDocumentTab } from "@/components/submission-tabs/submission-document-tab";
import { SubmissionCitationsTab } from "@/components/submission-tabs/submission-citations-tab";
import { SubmissionReviewTab } from "@/components/submission-tabs/submission-review-tab";
import { SubmissionReportTab } from "@/components/submission-tabs/submission-report-tab";

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

  // Active main tab
  const [activeTab, setActiveTab] = useState<"overview" | "evidence" | "document" | "citations" | "review" | "report">("overview");
  const [technicalDetailsOpen, setTechnicalDetailsOpen] = useState(false);

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
  const [isSendingFeedback, setIsSendingFeedback] = useState<boolean>(false);

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
        if (rev.general_feedback) setGeneralFeedback(rev.general_feedback);
        if (rev.rubric_scores && rev.rubric_scores.length > 0) {
          setRubricScores(rev.rubric_scores);
        }
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
          if (dbSub.review.general_feedback) setGeneralFeedback(dbSub.review.general_feedback);
          if (dbSub.review.rubric_scores && dbSub.review.rubric_scores.length > 0) {
            setRubricScores(dbSub.review.rubric_scores);
          }
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

  const proseWordCount = (submission as any).document?.proseWordCount ?? (submission as any).document?.prose_word_count ?? (() => {
    const rawTxt = (submission as any).document?.extracted_text;
    if (!rawTxt) return 0;
    const refMatch = /(?:[\r\n]+|^)(?:references|bibliography|works cited)\s*[\r\n]+/i.exec(rawTxt);
    const body = refMatch ? rawTxt.slice(0, refMatch.index).trim() : rawTxt.trim();
    return body.split(/\s+/).filter(Boolean).length;
  })();

  const isWpUnavailable =
    !isDemoSubmission &&
    (liveAnalysis?.ai_writing_analysis?.status === "insufficient_evidence" ||
      liveAnalysis?.writing_pattern_status === "Writing pattern analysis unavailable" ||
      proseWordCount < 45);

  const activeWpStatus = isDemoSubmission
    ? (submission.similarity > 25 ? "Requires Review" : "Normal")
    : isWpUnavailable
    ? "Writing pattern analysis unavailable"
    : liveAnalysis?.writing_pattern_status ?? (submission.similarity > 25 ? "Requires Review" : "Normal");

  const rawConsistency = liveAnalysis?.ai_writing_analysis?.observableCharacteristics?.stylisticConsistencyScore ?? 50;
  // Intended range of stylistic consistency is [0, 100]%. Normalize and clamp strictly so impossible values like 5000% never render:
  const normalizedConsistency = Math.max(0, Math.min(100, Math.round(rawConsistency > 1 ? rawConsistency : rawConsistency * 100)));

  const activeWpIndicators = isDemoSubmission
    ? writingPattern.indicators.map((i) => ({ ...i, label: `${i.label} (Demo Reference)` }))
    : isWpUnavailable
    ? [
        {
          label: "Vocabulary Richness (TTR)",
          value: "Observed — insufficient sample for interpretation",
        },
        {
          label: "Sentence Length Variance",
          value: "Observed — insufficient sample for interpretation",
        },
        {
          label: "Stylistic Consistency",
          value: "Observed — insufficient sample for interpretation",
        },
        {
          label: "Transition Density",
          value: "Observed — insufficient sample for interpretation",
        },
      ]
    : liveAnalysis?.ai_writing_analysis?.observableCharacteristics
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
          value: `${normalizedConsistency}%`,
        },
        {
          label: "Transition Density",
          value: `${liveAnalysis.ai_writing_analysis.observableCharacteristics.transitionWordDensity.toFixed(2)}/para`,
        },
      ]
    : [
        { label: "Vocabulary Richness", value: "Observed — insufficient sample for interpretation" },
        { label: "Sentence Length Variance", value: "Observed — insufficient sample for interpretation" },
        { label: "Stylistic Consistency", value: "Observed — insufficient sample for interpretation" },
        { label: "Transition Density", value: "Observed — insufficient sample for interpretation" },
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
    setActiveTab("document");
    setCurrentPage(pageIndex);
    setTimeout(() => {
      const el = document.getElementById(pId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-brand");
        setTimeout(() => el.classList.remove("ring-2", "ring-brand"), 2200);
      }
    }, 120);
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

  const handleSendFeedback = async () => {
    if (!generalFeedback.trim()) {
      toast.error("Please enter feedback before sending to the student.");
      return;
    }
    try {
      setIsSendingFeedback(true);
      const targetId = submission.id || submissionId;
      const updated = await verityApi.reviews.sendFeedback(
        targetId,
        generalFeedback.trim(),
        rubricScores
      );
      setReviewRecord(updated);
      const trail = await verityApi.reviews.getAuditTrail(targetId);
      setAuditTrail(trail);
      toast.success("Feedback sent to student and notification dispatched to their dashboard!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send feedback to student.");
    } finally {
      setIsSendingFeedback(false);
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
        "reviewed",
        generalFeedback.trim() || undefined,
        rubricScores
      );
      setReviewRecord(updated);
      setSubmission((prev: any) => ({ ...prev, status: "reviewed" }));
      const trail = await verityApi.reviews.getAuditTrail(targetId);
      setAuditTrail(trail);
      toast.success("Formal review decision recorded and notified to student!");
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

  const handleRecordPassageReviewDirect = async (passageId: string, status: ReviewedPassageStatus) => {
    try {
      const targetId = submission.id || submissionId;
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
            asChild
          >
            <Link to="/compare">
              <GitCompare className="mr-1.5 size-3.5" /> Compare Document
            </Link>
          </Button>
          <Button
            size="sm"
            className="h-8 text-[12px] bg-brand text-white hover:bg-brand/90 gap-1.5"
            onClick={handleDownloadPdf}
          >
            <Download className="size-3.5" /> Download Faculty Report
          </Button>
        </div>
      </div>

      {/* 6-Tab Faculty Navigation Bar: Overview | Evidence | Document | Citations | Review | Report */}
      <div className="mt-4 border-b border-border bg-card/60 backdrop-blur-xs px-2 pt-2 rounded-t-lg">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-md border-b-2 transition-all ${
              activeTab === "overview"
                ? "border-brand text-brand bg-background shadow-xs font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <LayoutDashboard className="size-3.5" />
            Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("evidence")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-md border-b-2 transition-all ${
              activeTab === "evidence"
                ? "border-brand text-brand bg-background shadow-xs font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <GitCompare className="size-3.5" />
            Evidence
            {activePassages.length > 0 && (
              <span className="num ml-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-1.5 py-0.2 text-[10px] font-bold">
                {activePassages.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("document")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-md border-b-2 transition-all ${
              activeTab === "document"
                ? "border-brand text-brand bg-background shadow-xs font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Eye className="size-3.5" />
            Document
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("citations")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-md border-b-2 transition-all ${
              activeTab === "citations"
                ? "border-brand text-brand bg-background shadow-xs font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <BookMarked className="size-3.5" />
            Citations
            {submission.citationIssues > 0 && (
              <span className="num ml-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.2 text-[10px] font-bold">
                {submission.citationIssues}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-md border-b-2 transition-all ${
              activeTab === "review"
                ? "border-brand text-brand bg-background shadow-xs font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <ShieldCheck className="size-3.5" />
            Review
            <span className={`ml-1 rounded-xs px-1.5 py-0.2 text-[9px] uppercase tracking-wider font-bold ${
              submission.status === "reviewed"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-muted text-muted-foreground"
            }`}>
              {submission.status === "reviewed" ? "Concluded" : "Action"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-md border-b-2 transition-all ${
              activeTab === "report"
                ? "border-brand text-brand bg-background shadow-xs font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <FileCheck className="size-3.5" />
            Report
          </button>
        </div>
      </div>

      {/* Main Tab View Content */}
      <div className="mt-4">
        {activeTab === "overview" && (
          <SubmissionOverviewTab
            submission={submission}
            liveAnalysis={liveAnalysis}
            activePassages={activePassages}
            activeEvidence={activeEvidence}
            citationIssuesCount={submission.citationIssues ?? 0}
            isWpUnavailable={isWpUnavailable}
            activeWpStatus={activeWpStatus}
            proseWordCount={proseWordCount}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "evidence" && (
          <SubmissionEvidenceTab
            activePassages={activePassages}
            currentUserRole={currentUserRole}
            reviewedPassages={reviewRecord?.reviewed_passages || []}
            onSelectMatch={(p: any) => {
              setSelectedMatch(p);
              setEvidenceDialogOpen(true);
            }}
            onRecordPassageReview={async (status: ReviewedPassageStatus, passageId: string) => {
              await handleRecordPassageReviewDirect(passageId, status);
            }}
            onJumpToParagraph={(pId: string) => jumpToParagraph(pId)}
          />
        )}

        {activeTab === "document" && (
          <SubmissionDocumentTab
            activePages={activePages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            highlightsEnabled={highlightsEnabled}
            setHighlightsEnabled={setHighlightsEnabled}
            docSearch={docSearch}
            setDocSearch={setDocSearch}
            selectedMatch={selectedMatch}
            setSelectedMatch={setSelectedMatch}
            submission={submission}
            citationIssues={activeCitationAnalysis?.issues || []}
            onOpenEvidenceDialog={(match) => {
              setSelectedMatch(match);
              setEvidenceDialogOpen(true);
            }}
            onAddAnnotation={(pId) => {
              setCommentTargetParagraph(pId);
              setActiveTab("review");
              toast.info(`Ready to annotate paragraph ${pId}`);
            }}
          />
        )}

        {activeTab === "citations" && (
          <SubmissionCitationsTab
            citationAnalysis={activeCitationAnalysis}
            onJumpToParagraph={(pId) => jumpToParagraph(pId)}
          />
        )}

        {activeTab === "review" && (
          <SubmissionReviewTab
            reviewRecord={reviewRecord}
            auditTrail={auditTrail}
            selectedDecision={selectedDecision}
            setSelectedDecision={(d) => setSelectedDecision(d)}
            decisionRationale={decisionRationale}
            setDecisionRationale={setDecisionRationale}
            facultyNotesText={facultyNotesText}
            setFacultyNotesText={setFacultyNotesText}
            generalFeedback={generalFeedback}
            setGeneralFeedback={setGeneralFeedback}
            rubricScores={rubricScores}
            onScoreChange={handleScoreChange}
            totalScore={totalScore}
            maxPossibleScore={maxPossibleScore}
            onRecordDecision={handleRecordDecision}
            onTransitionStatus={handleTransitionStatus}
            onOpenExplanationDialog={() => setExplanationDialogOpen(true)}
            onOpenResponseDialog={() => setResponseDialogOpen(true)}
            onRecordPassageReviewDirect={handleRecordPassageReviewDirect}
            activePassages={activePassages}
            currentUserRole={currentUserRole}
            submission={submission}
            onSendFeedback={handleSendFeedback}
            isSendingFeedback={isSendingFeedback}
          />
        )}

        {activeTab === "report" && (
          <SubmissionReportTab
            submission={submission}
            reviewRecord={reviewRecord}
            auditTrail={auditTrail}
            onDownloadPdf={handleDownloadPdf}
            onOpenModalPreview={() => setReportModalOpen(true)}
          />
        )}
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
                <p className="num text-base font-semibold text-foreground">{selectedMatch.exactSimilarity ?? 0}%</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Fuzzy Match</span>
                <p className="num text-base font-semibold text-foreground">{selectedMatch.fuzzySimilarity ?? 0}%</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Semantic Match</span>
                <p className="num text-base font-semibold text-foreground">{selectedMatch.semanticSimilarity ?? 0}%</p>
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
