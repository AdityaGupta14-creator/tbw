import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  FileUp,
  ShieldCheck,
  UploadCloud,
  UserCheck,
  Users,
  X,
  Loader2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TableShell, Th, Td, Tr } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { assignments as mockAssignments, type Assignment as MockAssignment } from "@/lib/mock-data";
import { useStudentSession } from "@/lib/student-session";
import { verityApi } from "@/services/verity-api";
import { StudentSwitcherDialog } from "@/components/student-switcher-dialog";
import { formatInstitutionalDateTime } from "@/lib/formatters";
import type { Submission } from "@/types/database";

export const Route = createFileRoute("/student/assignments")({
  head: () => ({
    meta: [
      { title: "Student Assignments — Verity" },
      {
        name: "description",
        content: "View active academic coursework and submit laboratory reports, technical analyses, and research papers.",
      },
      { property: "og:title", content: "Assignments — Student Portal" },
    ],
  }),
  component: StudentAssignmentsPage,
});

type DisplayAssignment = {
  id: string;
  courseCode: string;
  title: string;
  subject: string;
  type: string;
  due: string;
  submitted: number;
  total: number;
  avgSimilarity: number;
  pending: number;
  citationStyle: string;
  // Submission status specific to active student
  studentSubmission?: {
    id: string;
    submittedAt: string;
    similarity: number;
    status: "Submitted" | "Under Review" | "Reviewed";
    rawStatus: string;
  } | undefined;
};

interface SubmittedReceiptData {
  id: string;
  rawId?: string;
  time: string;
  similarity: number;
  matchedCount: number;
  citationIssues: number;
  fileName: string;
  studentName: string;
  studentRoll: string;
}

function StudentAssignmentsPage() {
  const navigate = useNavigate();
  const { currentStudent } = useStudentSession();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [assignmentList, setAssignmentList] = useState<DisplayAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<DisplayAssignment | null>(null);
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("Analyzing document...");
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<SubmittedReceiptData | null>(null);

  // Load assignments and match with student's persisted submissions
  const loadData = async () => {
    try {
      const [list, subs] = await Promise.all([
        verityApi.assignments.list(),
        verityApi.submissions.list(),
      ]);

      const studentSubs = (subs || []).filter((s) => {
        const matchesId = !s.student_id || s.student_id === currentStudent.id;
        const matchesRoll =
          !s.student_roll ||
          !currentStudent.roll_number ||
          s.student_roll.trim().toLowerCase() === currentStudent.roll_number.trim().toLowerCase();
        
        const hasExplicitMatch =
          (s.student_id && s.student_id === currentStudent.id) ||
          (s.student_roll &&
            currentStudent.roll_number &&
            s.student_roll.trim().toLowerCase() === currentStudent.roll_number.trim().toLowerCase());

        return hasExplicitMatch && matchesId && matchesRoll;
      });

      const sourceList: any[] = list && list.length > 0 ? list : mockAssignments;

      const mapped: DisplayAssignment[] = sourceList.map((a) => {
        const rawDue = a.due_date || a.due || "05 Oct 2026, 11:59 PM";
        let formattedDue = rawDue;
        const parsed = Date.parse(rawDue);
        if (!isNaN(parsed)) {
          const d = new Date(parsed);
          formattedDue = d.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        }

        // Find if student submitted this assignment
        const existingSub = studentSubs.find(
          (s) =>
            s.assignment_id?.toLowerCase() === a.id?.toLowerCase() ||
            (s.assignment_title || (s as any).assignment)?.trim().toLowerCase() ===
              a.title?.trim().toLowerCase()
        );

        let studentSubmission: DisplayAssignment["studentSubmission"] | undefined;
        if (existingSub) {
          let displayStatus: "Submitted" | "Under Review" | "Reviewed" = "Submitted";
          if (existingSub.status === "reviewed") {
            displayStatus = "Reviewed";
          } else if (existingSub.status === "needs_review" || (existingSub.status as string) === "in_review") {
            displayStatus = "Under Review";
          }
          studentSubmission = {
            id: existingSub.submission_code || existingSub.id,
            submittedAt: formatInstitutionalDateTime(existingSub.submitted_at),
            similarity: existingSub.similarity_percentage ?? 0,
            status: displayStatus,
            rawStatus: existingSub.status,
          };
        }

        return {
          id: a.id,
          courseCode: a.course_code || a.courseCode || "EXCS-B",
          title: a.title,
          subject: a.subject || "Technical and Business Writing",
          type: a.assignment_type || a.type || "Technical Report",
          due: formattedDue,
          submitted: a.submitted_count ?? a.submitted ?? 0,
          total: a.total_students ?? a.total ?? 5,
          avgSimilarity: a.avg_similarity ?? a.avgSimilarity ?? 12,
          pending: a.pending_count ?? a.pending ?? 1,
          citationStyle: a.citation_style || a.citationStyle || "Normal",
          studentSubmission,
        };
      });

      setAssignmentList(mapped);
    } catch (e) {
      console.warn("Could not load student assignments list:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentStudent.id, currentStudent.roll_number]);

  const handleOpenSubmit = (a: DisplayAssignment) => {
    setSelectedAssignment(a);
    setFileSelected(null);
    setDeclarationChecked(false);
    setSubmissionSuccess(false);
    setSubmittedReceipt(null);
    setProcessingStage("Analyzing document...");
  };

  const handleCreateSamplePdf = () => {
    const sampleText =
      `VIDYALANKAR INSTITUTE OF TECHNOLOGY · DEPARTMENT OF ELECTRONICS AND COMPUTER SCIENCE\n` +
      `Course: ${selectedAssignment?.courseCode || "EXCS-B"} (Section B, Batch 3)\n` +
      `Subject: ${selectedAssignment?.subject || "Technical and Business Writing"}\n` +
      `Assignment: ${selectedAssignment?.title || "Technical Report"}\n` +
      `Student Author: ${currentStudent.full_name} · Roll No: ${currentStudent.roll_number}\n` +
      `Institutional Email: ${currentStudent.email}\n\n` +
      `1. Introduction & Theoretical Context\n` +
      `Modern engineering systems demand rigorous verification and analytical synthesis across both hardware and software domains.\n` +
      `This report documents the structural specifications, experimental methodology, and empirical trade-offs evaluated.\n\n` +
      `2. Design Methodology & Experimental Procedure\n` +
      `We implemented and simulated the architecture across standard bench test conditions. Signals and parameters were acquired\n` +
      `with precision sampling intervals to establish repeatability and measure divergence against canonical theoretical expectations.\n\n` +
      `3. Empirical Results & Findings\n` +
      `The observed metrics demonstrate high fidelity with minimal distortion. Boundary conditions were verified and validated\n` +
      `under variable load profiles.\n\n` +
      `4. References & Bibliography\n` +
      `[1] A. V. Oppenheim and R. W. Schafer, Discrete-Time Signal Processing, 3rd ed.\n` +
      `[2] T. H. Cormen, C. E. Leiserson, R. L. Rivest, and C. Stein, Introduction to Algorithms, 3rd ed.`;

    const sampleFile = new File(
      [sampleText],
      `${(selectedAssignment?.title || "Technical_Report").replace(/\s+/g, "_")}_${currentStudent.roll_number}.txt`,
      { type: "text/plain" }
    );
    setFileSelected(sampleFile);
    toast.success("Institutional sample report loaded for submission!");
  };

  const handleRealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declarationChecked) {
      toast.error("You must confirm the academic integrity declaration");
      return;
    }

    if (!fileSelected) {
      toast.error("Please select or generate a document file first");
      return;
    }

    setIsProcessing(true);
    setProcessingStage("Extracting text and validating document...");
    try {
      const studentRoll = currentStudent.roll_number || "25108B0071";
      const studentName = currentStudent.full_name || "Aditya Gupta";

      const result = await verityApi.submissions.submit({
        assignmentId: selectedAssignment?.id || "asg-excs-tbw",
        file: fileSelected,
        studentId: currentStudent.id,
        studentRoll,
        studentName,
        onProgress: (stage) => setProcessingStage(stage),
      });

      const receiptId = result.submission_code || result.id;
      setSubmittedReceipt({
        id: receiptId,
        rawId: result.id,
        time: result.submitted_at ? formatInstitutionalDateTime(result.submitted_at) : "Just now",
        similarity: result.similarity_percentage ?? 0,
        matchedCount: result.matched_source_count || 0,
        citationIssues: result.citation_issue_count || 0,
        fileName: fileSelected.name,
        studentName,
        studentRoll,
      });

      setSubmissionSuccess(true);
      toast.success("Document analyzed and archived successfully!", {
        description: `Receipt: ${receiptId} · Similarity: ${result.similarity_percentage ?? 0}%`,
      });

      // Reload assignments to instantly reflect the submitted state
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to process document");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppShell role="student">
      <PageHeader
        title="Active Assignments"
        subtitle="Coursework, laboratory reports, and technical papers assigned for academic evaluation."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSwitcherOpen(true)}
            className="text-xs"
          >
            <Users className="mr-1.5 size-3.5 text-brand" />
            Active: {currentStudent.full_name.split(" ")[0]} ({currentStudent.roll_number})
          </Button>
        }
      />

      {/* Active Student Notice Banner */}
      <div className="mt-5 rounded-md border border-brand/20 bg-brand-soft/30 p-3.5 text-xs text-brand">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <UserCheck className="size-4 shrink-0 text-brand" />
            <span className="font-semibold text-foreground">
              Submitting as: {currentStudent.full_name} ({currentStudent.roll_number}) · {currentStudent.course_code || "EXCS-B"} ({currentStudent.batch || "Batch 3"})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            className="font-medium text-brand hover:underline self-start sm:self-auto"
          >
            Switch student profile →
          </button>
        </div>
      </div>

      <div className="mt-5">
        <TableShell caption="Student active assignments table">
          <thead>
            <tr>
              <Th>Assignment</Th>
              <Th>Subject</Th>
              <Th>Course</Th>
              <Th>Deadline</Th>
              <Th>Citation Style</Th>
              <Th>Submission Status</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {assignmentList.map((a) => {
              const isSubmitted = !!a.studentSubmission;

              return (
                <Tr key={a.id}>
                  <Td className="font-semibold text-foreground text-xs">
                    {a.title}
                    <div className="text-[11px] font-normal text-muted-foreground">{a.type}</div>
                  </Td>
                  <Td className="text-xs text-foreground font-medium">
                    {a.subject}
                  </Td>
                  <Td className="text-xs num text-brand font-semibold">
                    {a.courseCode}
                  </Td>
                  <Td className="num text-muted-foreground whitespace-nowrap text-xs">
                    {a.due}
                  </Td>
                  <Td className="text-xs">
                    <span
                      className={`rounded-xs px-1.5 py-0.5 text-[11px] font-medium border ${
                        a.citationStyle === "Normal"
                          ? "bg-muted text-foreground border-border"
                          : "bg-brand/10 text-brand border-brand/20"
                      }`}
                    >
                      {a.citationStyle}
                    </span>
                  </Td>
                  <Td className="text-xs">
                    {isSubmitted ? (
                      <span
                        className={`inline-block rounded-xs px-2 py-0.5 text-[10px] font-semibold border ${
                          a.studentSubmission?.status === "Reviewed"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {a.studentSubmission?.status} ({a.studentSubmission?.similarity}%)
                      </span>
                    ) : (
                      <span className="inline-block rounded-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                        Upcoming
                      </span>
                    )}
                  </Td>
                  <Td className="text-right">
                    {isSubmitted ? (
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <Link
                          to="/submissions/$submissionId"
                          params={{ submissionId: a.studentSubmission!.id }}
                        >
                          <Eye className="mr-1 size-3 text-brand" /> View Submission
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleOpenSubmit(a)}
                      >
                        <FileUp className="mr-1 size-3" /> Submit Work
                      </Button>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableShell>
      </div>

      {/* Student Submission Upload Modal Dialog */}
      {selectedAssignment && (
        <Dialog
          open={!!selectedAssignment}
          onOpenChange={(open) => !open && setSelectedAssignment(null)}
        >
          <DialogContent className="max-w-lg p-6 font-sans">
            <DialogHeader className="border-b border-border pb-3">
              <DialogTitle className="text-lg font-bold text-foreground">
                {submissionSuccess ? "Submission Receipt & Similarity Audit" : "Submit Coursework"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {selectedAssignment.title} · {selectedAssignment.subject} · <span className="num">{selectedAssignment.courseCode}</span>
              </DialogDescription>
            </DialogHeader>

            {isProcessing ? (
              <div className="mt-4 space-y-4 py-6 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand animate-pulse">
                  <Loader2 className="size-6 animate-spin text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Academic Integrity Verification in Progress
                  </h3>
                  <p className="mt-1 text-xs font-mono text-muted-foreground">
                    {processingStage}
                  </p>
                </div>
                <div className="mx-auto max-w-sm rounded-sm border border-border bg-muted/30 p-3 text-left text-[11px] text-muted-foreground space-y-1.5">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <span className="size-1.5 rounded-full bg-brand animate-ping" />
                    Multi-Corpus Evaluation Active
                  </div>
                  <p className="leading-relaxed">
                    Verity is checking exact, fuzzy lexical, and semantic token alignment across internal student archives, reference materials, and academic publications.
                  </p>
                </div>
              </div>
            ) : submissionSuccess && submittedReceipt ? (
              <div className="mt-4 space-y-5 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/20 text-success">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Submission Verified & Archived</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your document has been verified against institutional archives and recorded in the database.
                  </p>
                </div>

                <div className="rounded-sm border border-border bg-muted/30 p-3.5 text-xs space-y-2.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receipt Number:</span>
                    <span className="num font-bold text-foreground">{submittedReceipt.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Student:</span>
                    <span className="font-medium text-foreground">
                      {submittedReceipt.studentName} ({submittedReceipt.studentRoll})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subject / Course:</span>
                    <span className="font-medium text-foreground">
                      {selectedAssignment.subject} · {selectedAssignment.courseCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uploaded Document:</span>
                    <span className="font-mono text-[11px] text-foreground">{submittedReceipt.fileName}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-border pt-2">
                    <span className="text-muted-foreground">Overall Similarity Score:</span>
                    <span
                      className={`num font-bold px-2 py-0.5 rounded-xs text-xs ${
                        submittedReceipt.similarity > 25
                          ? "bg-danger-soft text-danger"
                          : "bg-success-soft text-success"
                      }`}
                    >
                      {submittedReceipt.similarity}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Matched Sources:</span>
                    <span className="font-medium text-foreground">
                      {submittedReceipt.matchedCount} reference sources
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-2 pt-2">
                  <Button
                    asChild
                    size="sm"
                    className="text-xs bg-brand hover:bg-brand/90 text-brand-foreground"
                  >
                    <Link
                      to="/submissions/$submissionId"
                      params={{ submissionId: submittedReceipt.id }}
                    >
                      <Eye className="mr-1.5 size-3.5" /> Open Plagiarism Report
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      toast.success(`Official receipt ${submittedReceipt.id} downloaded`);
                    }}
                  >
                    <Download className="mr-1.5 size-3.5" /> Download Slip
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setSelectedAssignment(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRealSubmit} className="mt-4 space-y-4 text-xs">
                {/* Active Student Confirmation */}
                <div className="rounded-sm border border-brand/20 bg-brand-soft/20 p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground text-[11px]">Submitting on behalf of:</span>
                    <p className="font-semibold text-foreground text-xs">
                      {currentStudent.full_name} ({currentStudent.roll_number}) · {selectedAssignment.courseCode} ({currentStudent.batch || "Batch 3"})
                    </p>
                  </div>
                  <span className="rounded-xs bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                    Active Session
                  </span>
                </div>

                {/* File Upload Area */}
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground block">
                    Upload Document File (PDF, DOCX, TXT)
                  </label>
                  <div className="flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-border p-6 hover:border-brand/50 transition-colors bg-muted/20">
                    <UploadCloud className="size-8 text-muted-foreground mb-2" />
                    <p className="text-xs font-medium text-foreground">
                      Drag and drop your final coursework file here
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Accepts academic PDF, Word documents, or UTF-8 plain text (up to 25 MB)
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <label className="cursor-pointer rounded-sm bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">
                        Browse Files
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setFileSelected(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCreateSamplePdf}
                        className="text-xs h-7"
                      >
                        Load Sample Document
                      </Button>
                    </div>
                  </div>

                  {fileSelected && (
                    <div className="mt-2 flex items-center justify-between rounded-sm border border-border bg-card p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <FileCheck className="size-4 text-brand" />
                        <span className="font-mono text-[11px] text-foreground">
                          {fileSelected.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({(fileSelected.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFileSelected(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Academic Integrity Declaration */}
                <div className="rounded-sm border border-border bg-card p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="size-4 text-brand shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground text-xs">
                        Institutional Academic Integrity Declaration
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        I confirm this submission represents my original intellectual work. All external sources have been appropriately cited.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                      className="size-3.5 rounded-xs border-input text-brand focus:ring-brand"
                    />
                    <span className="text-[11px] font-medium text-foreground">
                      I agree and confirm this declaration
                    </span>
                  </label>
                </div>

                {/* Submit Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAssignment(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!fileSelected || !declarationChecked}
                  >
                    Submit for Analysis
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}

      <StudentSwitcherDialog
        open={switcherOpen}
        onOpenChange={setSwitcherOpen}
      />
    </AppShell>
  );
}
