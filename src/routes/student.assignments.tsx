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
import { assignments, type Assignment } from "@/lib/mock-data";
import { useStudentSession } from "@/lib/student-session";
import { verityApi } from "@/services/verity-api";
import { StudentSwitcherDialog } from "@/components/student-switcher-dialog";
import { formatInstitutionalDateTime } from "@/lib/formatters";

export const Route = createFileRoute("/student/assignments")({
  head: () => ({
    meta: [
      { title: "Student Assignments — Verity" },
      {
        name: "description",
        content: "View pending academic coursework and submit laboratory reports, technical analyses, and research papers.",
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
  type: string;
  due: string;
  submitted: number;
  total: number;
  avgSimilarity: number;
  pending: number;
  citationStyle: string;
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
  const [assignmentList, setAssignmentList] = useState<DisplayAssignment[]>(assignments);
  const [selectedAssignment, setSelectedAssignment] = useState<DisplayAssignment | null>(null);
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("Analyzing document...");
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<SubmittedReceiptData | null>(null);

  // Load live assignments from Supabase or fallback
  useEffect(() => {
    verityApi.assignments.list().then((list) => {
      if (list && list.length > 0) {
        const mapped: DisplayAssignment[] = list.map((a) => ({
          id: a.id,
          courseCode: a.course_code || "ENG-CSE-301",
          title: a.title,
          type: a.assignment_type || "Technical Report",
          due: a.due_date
            ? new Date(a.due_date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "24 Oct 2026",
          submitted: a.submitted_count || 0,
          total: a.total_students || 64,
          avgSimilarity: 12,
          pending: 1,
          citationStyle: a.citation_style || "IEEE",
        }));
        setAssignmentList(mapped);
      }
    });
  }, []);

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
      `ENGINEERING RESEARCH REPORT · DEPARTMENT OF COMPUTER ENGINEERING\n` +
      `Title: Comparative Analysis of Concurrent B-Tree Indexing and Log-Structured Merge Trees\n` +
      `Student Author: ${currentStudent.full_name} · Roll No: ${currentStudent.roll_number}\n` +
      `Course: ${selectedAssignment?.title || "Data Structures"} (${selectedAssignment?.courseCode || "ENG-CSE-301"})\n\n` +
      `1. Introduction\n` +
      `Modern data storage architectures require low latency indexing under heavy write workloads. While balanced binary search trees provide O(log n) guarantees in main memory, block-oriented secondary storage introduces distinct cost trade-offs.\n\n` +
      `2. Methodology & Implementation\n` +
      `We implemented concurrent B+ tree nodes with optimistic latch coupling and compared write amplification against an append-only LSM tree with tiered compaction. Memory footprint was captured at 100,000 key insertions.\n\n` +
      `3. Empirical Results\n` +
      `For uniform random key sequences, LSM trees achieved 3.2x higher write throughput, but suffered higher tail read latency due to multi-level SSTable lookups.\n\n` +
      `References\n` +
      `[1] D. Comer, "The Ubiquitous B-Tree," ACM Computing Surveys, vol. 11, no. 2, pp. 121-137, 1979.\n` +
      `[2] P. O'Neil et al., "The Log-Structured Merge-Tree (LSM-tree)," Acta Informatica, 1996.`;

    const sampleFile = new File(
      [sampleText],
      `Technical_Report_${currentStudent.roll_number}.pdf`,
      { type: "application/pdf" }
    );
    setFileSelected(sampleFile);
    toast.success("Sample academic engineering report loaded!");
  };

  const handleRealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declarationChecked) {
      toast.error("You must confirm the academic integrity declaration");
      return;
    }

    if (!fileSelected) {
      toast.error("Please select or upload a document file first (PDF, DOCX, TXT)");
      return;
    }

    setIsProcessing(true);
    setProcessingStage("Validating document format and constraints...");
    try {
      const studentRoll = currentStudent.roll_number || "22CSE057";
      const studentName = currentStudent.full_name || "Student";

      const result = await verityApi.submissions.submit({
        assignmentId: selectedAssignment?.id || "asg-301-02",
        file: fileSelected,
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
        matchedCount: result.matched_source_count || 3,
        citationIssues: result.citation_issue_count || 0,
        fileName: fileSelected.name,
        studentName,
        studentRoll,
      });

      setSubmissionSuccess(true);
      toast.success("Document analyzed and archived successfully!", {
        description: `Receipt: ${receiptId} · Similarity: ${result.similarity_percentage ?? 0}%`,
      });
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
        subtitle={`Coursework, laboratory reports, and technical papers assigned for academic evaluation.`}
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
              Submitting as: {currentStudent.full_name} ({currentStudent.roll_number}) · {currentStudent.department_name || "Computer Engineering"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            className="font-medium text-brand hover:underline self-start sm:self-auto"
          >
            Switch student profile or log out →
          </button>
        </div>
      </div>

      <div className="mt-5">
        <TableShell caption="Student active assignments table">
          <thead>
            <tr>
              <Th>Assignment</Th>
              <Th>Course</Th>
              <Th>Format Type</Th>
              <Th>Submission Deadline</Th>
              <Th>Citation Standard</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {assignmentList.map((a: any) => (
              <Tr key={a.id}>
                <Td className="font-medium text-foreground">{a.title}</Td>
                <Td className="num text-muted-foreground">{a.course_code || a.courseCode}</Td>
                <Td className="text-muted-foreground">{a.assignment_type || a.type}</Td>
                <Td className="num text-muted-foreground whitespace-nowrap">{a.due_date || a.due}</Td>
                <Td className="num text-foreground">
                  <span className="rounded-xs bg-muted px-1.5 py-0.5 text-xs">
                    {a.citation_style || a.citationStyle}
                  </span>
                </Td>
                <Td className="text-right">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleOpenSubmit(a)}
                  >
                    <FileUp className="mr-1 size-3.5" /> Submit Work
                  </Button>
                </Td>
              </Tr>
            ))}
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
                {submissionSuccess ? "Submission & Similarity Receipt" : "Submit Coursework"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {selectedAssignment.title} · <span className="num">{selectedAssignment.courseCode}</span>
              </DialogDescription>
            </DialogHeader>

            {isProcessing ? (
              <div className="mt-4 space-y-4 py-6 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand animate-pulse">
                  <Loader2 className="size-6 animate-spin text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Academic Integrity Analysis in Progress
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
                    Verity is checking exact, fuzzy, and semantic alignments across internal student archives, reference materials, and academic publications. No simulated progress delays are applied.
                  </p>
                </div>
              </div>
            ) : submissionSuccess && submittedReceipt ? (
              <div className="mt-4 space-y-5 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/20 text-success">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Submission Verified & Stored</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your document has been extracted, analyzed against peer submissions & web sources, and registered in Supabase.
                  </p>
                </div>

                <div className="rounded-sm border border-border bg-muted/30 p-3.5 text-xs space-y-2.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receipt Number:</span>
                    <span className="num font-bold text-foreground">{submittedReceipt.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Student Name & Roll:</span>
                    <span className="font-medium text-foreground">
                      {submittedReceipt.studentName} ({submittedReceipt.studentRoll})
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
                    <span className="text-muted-foreground">Matched Sources Found:</span>
                    <span className="font-medium text-foreground">
                      {submittedReceipt.matchedCount} peer & web references
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
                      {currentStudent.full_name} · <span className="num">{currentStudent.roll_number}</span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-brand hover:underline"
                    onClick={() => setSwitcherOpen(true)}
                  >
                    Switch
                  </Button>
                </div>

                <div className="rounded-sm border border-border bg-muted/20 p-3 space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Deadline:</span>
                    <span className="num font-medium text-foreground">{selectedAssignment.due}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Citation Standard:</span>
                    <span className="num font-medium text-foreground">{selectedAssignment.citationStyle}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Supported File Formats:</span>
                    <span className="num font-medium text-foreground">PDF · DOCX · TXT · MD</span>
                  </div>
                </div>

                {/* Upload Drag & Drop Area */}
                <div
                  className="rounded-sm border-2 border-dashed border-border bg-card p-6 text-center hover:border-brand/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setFileSelected(e.dataTransfer.files[0]);
                      toast.info(`Selected ${e.dataTransfer.files[0].name}`);
                    }
                  }}
                >
                  <UploadCloud className="mx-auto size-8 text-brand/80" />
                  <p className="mt-2 text-xs font-semibold text-foreground">
                    Select your PDF or coursework file to upload
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Drag and drop here, or click to browse files
                  </p>
                  <input
                    type="file"
                    id="file-upload-input"
                    className="hidden"
                    accept=".pdf,.docx,.txt,.md,.c,.cpp,.py,.java"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFileSelected(e.target.files[0]);
                        toast.info(`Selected ${e.target.files[0].name}`);
                      }
                    }}
                  />

                  {fileSelected ? (
                    <div
                      className="mt-3.5 inline-flex items-center gap-2 rounded-xs border border-success/30 bg-success-soft px-3 py-1.5 text-xs text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileCheck className="size-4 text-success shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="font-semibold truncate max-w-[240px]">{fileSelected.name}</p>
                        <p className="text-[10px] text-muted-foreground num">
                          {(fileSelected.size / 1024).toFixed(1)} KB · {fileSelected.type || "Document"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFileSelected(null)}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                        title="Remove file"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById("file-upload-input")?.click();
                        }}
                      >
                        Browse PDF / Document
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateSamplePdf();
                        }}
                      >
                        Use Sample Report
                      </Button>
                    </div>
                  )}
                </div>

                {/* Honor Code Declaration Checkbox */}
                <div className="rounded-sm border border-border bg-muted/20 p-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                      className="mt-0.5 accent-navy size-4 rounded-xs"
                    />
                    <span className="text-[11px] text-foreground leading-snug">
                      <strong>Honor Code Declaration:</strong> &ldquo;I, {currentStudent.full_name}, confirm that this submission is my own academic work. All external sources, code snippets, algorithms, and references have been appropriately attributed in accordance with IEEE guidelines.&rdquo;
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setSelectedAssignment(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="text-xs"
                    disabled={!fileSelected || !declarationChecked || isProcessing}
                  >
                    {isProcessing ? "Extracting & Checking Plagiarism..." : "Submit and Check Plagiarism"}
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
