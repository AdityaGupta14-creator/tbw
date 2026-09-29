import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Download,
  Eye,
  FileCheck,
  FileText,
  Printer,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TableShell, Th, Td, Tr, FilterBar, SelectFilter } from "@/components/data-table";
import { StatBar } from "@/components/stat-bar";
import { StatusBadge, SimilarityValue } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  submissions,
  courses,
  assignments,
  semesters,
  matchedSources,
  citationAnalysis,
  writingPattern,
  revisionHistory,
  type Submission,
} from "@/lib/mock-data";
import { generateAcademicAuditReportPdf } from "@/lib/backend/reports/pdf-audit-report-generator";
import { db } from "@/lib/backend/db";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Academic Integrity Reports — Verity" },
      {
        name: "description",
        content: "Institutional integrity reports, archival records, and similarity documentation for engineering faculty.",
      },
      { property: "og:title", content: "Reports — Verity" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [courseFilter, setCourseFilter] = useState("All courses");
  const [semesterFilter, setSemesterFilter] = useState("2026–27");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedReport, setSelectedReport] = useState<Submission | null>(null);

  const courseOptions = ["All courses", ...courses.map((c) => c.code)];
  const statusOptions = ["All statuses", "Requires Review", "High Similarity", "Reviewed", "Pending"];

  const filtered = submissions.filter((s) => {
    if (courseFilter !== "All courses" && s.courseCode !== courseFilter) return false;
    if (statusFilter === "Requires Review" && s.status !== "review") return false;
    if (statusFilter === "High Similarity" && s.status !== "flagged") return false;
    if (statusFilter === "Reviewed" && s.status !== "reviewed") return false;
    if (statusFilter === "Pending" && s.status !== "pending") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.student.toLowerCase().includes(q) && !s.roll.toLowerCase().includes(q) && !s.assignment.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const handleDownloadReport = async (s: Submission) => {
    try {
      const dbSub = db.getSubmissionById(s.id);
      const now = new Date().toISOString();
      const finalSub: any = dbSub || {
        id: s.id,
        submission_code: s.id,
        assignment_id: "asg-301-02",
        assignment_title: s.assignment,
        course_id: "eng-cse-301",
        course_code: s.courseCode,
        student_id: s.roll.toLowerCase(),
        student_name: s.student,
        student_roll: s.roll,
        version_number: 1,
        status: s.status === "review" ? "needs_review" : s.status === "flagged" ? "needs_review" : "reviewed",
        submitted_at: now,
        is_final: true,
        similarity_percentage: s.similarity,
        matched_source_count: s.matchedSources ?? 0,
        citation_issue_count: s.citationIssues,
        drafts_count: s.drafts,
        created_at: now,
        updated_at: now,
      };

      const pdfBytes = generateAcademicAuditReportPdf(finalSub);

      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `VERITY-AUDIT-REPORT-${s.roll}-${s.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      toast.success(`Integrity Audit Report PDF downloaded for ${s.student} (${s.roll})`);
    } catch (err: any) {
      toast.error(`Download failed: ${err.message}`);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Academic Integrity Reports"
        subtitle="Archival reports, source breakdowns, and faculty evaluation summaries."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="text-[12px]"
            onClick={() => toast.success("Batch export initialized for all verified reports")}
          >
            <Download className="mr-1.5 size-3.5" /> Batch Export All
          </Button>
        }
      />

      <div className="mt-5">
        <StatBar
          stats={[
            { label: "Archived Reports", value: "426" },
            { label: "Reviewed & Cleared", value: "394", tone: "success" },
            { label: "Pending Adjudication", value: "18", tone: "warning" },
            { label: "Department Flags", value: "14", tone: "danger" },
            { label: "Audit Integrity", value: "100%", hint: "Cryptographic hash" },
          ]}
        />
      </div>

      <div className="mt-5">
        <FilterBar>
          <SelectFilter
            label="Semester"
            options={semesters}
            value={semesterFilter}
            onChange={setSemesterFilter}
          />
          <SelectFilter
            label="Course"
            options={courseOptions}
            value={courseFilter}
            onChange={setCourseFilter}
          />
          <SelectFilter
            label="Status"
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="report-search"
              className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              Search
            </label>
            <div className="relative">
              <input
                id="report-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Student, roll, or assignment..."
                className="h-8 w-56 rounded-sm border border-input bg-background pl-7 pr-2 text-[12px] text-foreground focus:border-ring focus:outline-none"
              />
              <Search className="pointer-events-none absolute top-2 left-2 size-3.5 text-muted-foreground" />
            </div>
          </div>
          <span className="num ml-auto text-[12px] text-muted-foreground">
            {filtered.length} reports
          </span>
        </FilterBar>
      </div>

      <TableShell className="mt-3" caption="Integrity reports list">
        <thead>
          <tr>
            <Th>Student</Th>
            <Th>Roll No.</Th>
            <Th>Course</Th>
            <Th>Assignment</Th>
            <Th numeric>Similarity</Th>
            <Th numeric>Citations</Th>
            <Th>Status</Th>
            <Th className="text-right">Report Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <Tr key={s.id}>
              <Td className="font-medium text-foreground">{s.student}</Td>
              <Td className="num text-muted-foreground">{s.roll}</Td>
              <Td className="num text-muted-foreground">{s.courseCode}</Td>
              <Td className="text-foreground">{s.assignment}</Td>
              <Td numeric>
                <SimilarityValue value={s.similarity} />
              </Td>
              <Td numeric className="num text-muted-foreground">
                {s.citationIssues > 0 ? (
                  <span className="font-semibold text-warning-foreground">{s.citationIssues}</span>
                ) : (
                  "0"
                )}
              </Td>
              <Td>
                <StatusBadge status={s.status} />
              </Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[12px]"
                    onClick={() => setSelectedReport(s)}
                  >
                    <Eye className="mr-1 size-3.5" /> View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[12px] text-muted-foreground hover:text-foreground"
                    onClick={() => handleDownloadReport(s)}
                  >
                    <Download className="size-3.5" />
                  </Button>
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>

      {/* Official PDF Document View Modal */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto font-sans p-6 sm:p-10">
            <DialogHeader className="border-b border-border pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[12px] font-bold tracking-[0.2em] text-navy uppercase">
                    VERITY · ACADEMIC INTEGRITY REPORT
                  </span>
                  <DialogTitle className="text-xl font-bold mt-1 text-foreground">
                    Institutional Record & Analytical Summary
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Accredited document analysis report generated for faculty & board review.
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      window.print();
                      toast.success("Printing report document");
                    }}
                  >
                    <Printer className="mr-1.5 size-3.5" /> Print
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs"
                    onClick={() => handleDownloadReport(selectedReport)}
                  >
                    <Download className="mr-1.5 size-3.5" /> Download PDF
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* University Document Report Sheet */}
            <div className="mt-4 space-y-6 text-[13px] leading-relaxed text-foreground">
              {/* Institutional Banner */}
              <div className="rounded-sm border border-border bg-muted/30 p-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Student Name
                    </span>
                    <p className="font-semibold text-foreground text-sm">{selectedReport.student}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Roll Number
                    </span>
                    <p className="num font-semibold text-foreground text-sm">{selectedReport.roll}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Course & Section
                    </span>
                    <p className="num font-semibold text-foreground text-sm">
                      {selectedReport.courseCode} · Sec A
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Submission Date
                    </span>
                    <p className="num font-semibold text-foreground text-sm">21 Sep 2026 · 11:08 AM</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Assignment Title
                    </span>
                    <p className="font-medium text-foreground">{selectedReport.assignment}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Receipt Identifier
                    </span>
                    <p className="num text-foreground">{selectedReport.id}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Integrity Index
                    </span>
                    <p className="num font-bold text-danger">{selectedReport.similarity}% Similarity</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Review Status
                    </span>
                    <div className="mt-0.5">
                      <StatusBadge status={selectedReport.status} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. Executive Summary */}
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider border-b border-border pb-1">
                  1. Executive Summary
                </h3>
                <p className="mt-2 text-muted-foreground">
                  The document was processed through the institutional verification engine against 4.8 billion indexed web pages, 82 million academic articles, and the ABC Institute of Technology internal archive. The overall textual similarity is calculated at{" "}
                  <strong className="text-foreground">{selectedReport.similarity}%</strong>. Analysis reveals{" "}
                  <strong className="text-foreground">{selectedReport.matchedSources} primary matched sources</strong>, with{" "}
                  <strong className="text-foreground">{selectedReport.citationIssues} potential IEEE citation discrepancies</strong> identified.
                </p>
              </div>

              {/* 2. Similarity Analysis Breakdown */}
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider border-b border-border pb-1">
                  2. Similarity Analysis Breakdown
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-sm border border-border bg-card p-3">
                    <span className="text-[11px] text-muted-foreground">Internet & Web Archives</span>
                    <p className="num text-xl font-bold text-foreground mt-1">15.0%</p>
                    <span className="text-[10px] text-muted-foreground">Course materials & portals</span>
                  </div>
                  <div className="rounded-sm border border-border bg-card p-3">
                    <span className="text-[11px] text-muted-foreground">Academic Publications</span>
                    <p className="num text-xl font-bold text-foreground mt-1">4.0%</p>
                    <span className="text-[10px] text-muted-foreground">Journals & conference papers</span>
                  </div>
                  <div className="rounded-sm border border-border bg-card p-3">
                    <span className="text-[11px] text-muted-foreground">Institutional Cohort Overlap</span>
                    <p className="num text-xl font-bold text-foreground mt-1">8.0%</p>
                    <span className="text-[10px] text-muted-foreground">Peer submissions in cohort</span>
                  </div>
                </div>
              </div>

              {/* 3. Primary Matched Sources */}
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider border-b border-border pb-1">
                  3. Matched Sources Summary
                </h3>
                <table className="mt-2 w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="p-2 font-semibold">Matched Source</th>
                      <th className="p-2 font-semibold">Domain / Host</th>
                      <th className="p-2 font-semibold">Classification</th>
                      <th className="p-2 font-semibold text-right">Words</th>
                      <th className="p-2 font-semibold text-right">Overlap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedSources.map((m) => (
                      <tr key={m.id} className="border-b border-border">
                        <td className="p-2 font-medium">{m.title}</td>
                        <td className="p-2 text-muted-foreground num">{m.domain}</td>
                        <td className="p-2 text-muted-foreground">{m.type}</td>
                        <td className="p-2 text-right num">{m.words}</td>
                        <td className="p-2 text-right num font-semibold">{m.contribution}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 4. Citation Analysis */}
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider border-b border-border pb-1">
                  4. Citation Analysis (IEEE Format)
                </h3>
                <div className="mt-2 space-y-1.5 text-xs">
                  {citationAnalysis.issues.map((issue) => (
                    <div key={issue.id} className="flex items-start gap-2 text-muted-foreground">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                      <span>{issue.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Writing Pattern Analysis */}
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider border-b border-border pb-1">
                  5. Writing Pattern Analysis
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                  {writingPattern.indicators.slice(0, 4).map((i) => (
                    <div key={i.label} className="rounded-xs bg-muted/30 p-2 border border-border">
                      <span className="block text-[10px] text-muted-foreground">{i.label}</span>
                      <span className="num font-semibold text-foreground">{i.value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground italic">
                  Note: Writing-pattern analysis provides indicators for faculty review and should not be treated as proof of AI use.
                </p>
              </div>

              {/* 6. Revision History */}
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider border-b border-border pb-1">
                  6. Revision History
                </h3>
                <div className="mt-2 flex flex-wrap gap-4 text-xs">
                  {revisionHistory.map((rev) => (
                    <div key={rev.id} className="rounded-sm border border-border p-2 min-w-[130px]">
                      <span className="font-semibold block">{rev.label}</span>
                      <span className="num text-[11px] text-muted-foreground block">{rev.date}</span>
                      <span className="num text-[11px] font-medium block">{rev.words} words</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Faculty Notes */}
              <div>
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider border-b border-border pb-1">
                  7. Faculty Reviewer Evaluation
                </h3>
                <div className="mt-2 rounded-sm border border-border bg-muted/20 p-3 text-xs leading-relaxed italic text-muted-foreground">
                  &quot;Good experimental comparison of tree balance performance under skewed access. The student must revise paragraph 2 to rephrase standard definitions in their own academic style and correct uncited reference [8] before archive submission.&quot;
                  <div className="mt-2 text-right not-italic font-medium text-foreground">
                    — Dr. P. Kulkarni, Faculty Guide
                  </div>
                </div>
              </div>

              {/* Official Institutional Footer Disclaimer */}
              <div className="mt-6 border-t border-border pt-4 text-center text-[11px] text-muted-foreground italic">
                This report provides analytical indicators and supporting evidence for faculty review. It does not independently determine academic misconduct. ABC Institute of Technology Academic Integrity Committee guidelines apply.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}
