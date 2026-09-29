import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpDown, Download, Filter, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TableShell, Th, Td, Tr, FilterBar, SelectFilter } from "@/components/data-table";
import { StatBar } from "@/components/stat-bar";
import { StatusBadge, SimilarityValue } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { submissions as defaultMockSubmissions, courses as defaultMockCourses } from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";
import { filterSubmissionsForUser } from "@/lib/backend/authorization";
import { formatInstitutionalDateTime } from "@/lib/formatters";

const SESSION_FILTER_KEY = "verity_faculty_review_filters_v2";

function loadSavedFilters() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_FILTER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to restore saved filters:", e);
  }
  return null;
}

export const Route = createFileRoute("/submissions/")({
  head: () => ({
    meta: [
      { title: "Submissions — Verity" },
      {
        name: "description",
        content: "Faculty review workspace for academic submissions with evidence and review status filters.",
      },
      { property: "og:title", content: "Submissions — Verity" },
      {
        property: "og:description",
        content: "Review student technical reports, multi-layer evidence breakdowns, and audit trails.",
      },
    ],
  }),
  component: SubmissionsPage,
});

function SubmissionsPage() {
  const navigate = useNavigate();
  const saved = loadSavedFilters();

  const [courseFilter, setCourseFilter] = useState<string>(saved?.courseFilter || "All courses");
  const [assignmentFilter, setAssignmentFilter] = useState<string>(saved?.assignmentFilter || "All assignments");
  const [statusFilter, setStatusFilter] = useState<string>(saved?.statusFilter || "All statuses");
  const [evidenceFilter, setEvidenceFilter] = useState<string>(saved?.evidenceFilter || "All evidence levels");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>(saved?.reviewStatusFilter || "All review statuses");
  const [searchQuery, setSearchQuery] = useState<string>(saved?.searchQuery || "");
  const [sortField, setSortField] = useState<"submitted" | "similarity" | "student">(saved?.sortField || "similarity");
  const [sortAsc, setSortAsc] = useState<boolean>(saved?.sortAsc || false);

  const [items, setItems] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [availableAssignments, setAvailableAssignments] = useState<string[]>([]);

  // Persist filter state across navigation so returning to the list preserves filters
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          SESSION_FILTER_KEY,
          JSON.stringify({
            courseFilter,
            assignmentFilter,
            statusFilter,
            evidenceFilter,
            reviewStatusFilter,
            searchQuery,
            sortField,
            sortAsc,
          })
        );
      } catch (e) {
        console.warn("Failed to persist filter state:", e);
      }
    }
  }, [courseFilter, assignmentFilter, statusFilter, evidenceFilter, reviewStatusFilter, searchQuery, sortField, sortAsc]);

  useEffect(() => {
    async function loadData() {
      try {
        const [currentUser, dbList, coursesList] = await Promise.all([
          verityApi.auth.getCurrentUser(),
          verityApi.submissions.list(),
          verityApi.courses.list(),
        ]);

        // Filter submissions to user's authorized courses if faculty
        const authorizedSubmissions = currentUser.role === "admin"
          ? dbList
          : filterSubmissionsForUser(currentUser, dbList, coursesList);

        const mapped = authorizedSubmissions.map((s) => {
          const sim = s.similarity_percentage ?? s.analysis?.similarity_percentage ?? 0;
          const evLevel = sim === 0
            ? "none"
            : (s.analysis?.matches?.[0]?.evidence_level || (sim >= 40 ? "strong" : sim >= 20 ? "moderate" : "weak")).toLowerCase();
          const rStatus = s.review?.status || (s.status === "reviewed" ? "reviewed" : "pending");

          return {
            id: s.submission_code || s.id,
            dbId: s.id,
            student: s.student_name || "Student",
            roll: s.student_roll || "22CSE",
            courseCode: s.course_code || "ENG-CSE-301",
            assignment: s.assignment_title || "Technical Report",
            submitted: formatInstitutionalDateTime(s.submitted_at),
            similarity: sim,
            evidenceLevel: evLevel,
            reviewStatus: rStatus,
            reviewDecision: s.review?.decision,
            citationIssues: s.citation_issue_count ?? s.analysis?.citation_issue_count ?? 0,
            status: s.status === "needs_review" ? "review" : s.status === "reviewed" ? "reviewed" : s.status === "processing" ? "pending" : "review",
            drafts: s.drafts_count ?? 1,
            matchedSources: s.matched_source_count ?? s.analysis?.matched_source_count ?? 0,
          };
        });

        setItems(mapped);

        // Populate dynamic filter options
        const uniqueCourses = Array.from(new Set(mapped.map((m) => m.courseCode).filter(Boolean)));
        setAvailableCourses(["All courses", ...uniqueCourses]);

        const uniqueAssignments = Array.from(new Set(mapped.map((m) => m.assignment).filter(Boolean)));
        setAvailableAssignments(["All assignments", ...uniqueAssignments]);
      } catch (e) {
        console.error("Failed to load submissions:", e);
      }
    }

    loadData();
  }, []);

  const courseOptions = availableCourses.length > 0 ? availableCourses : ["All courses", ...defaultMockCourses.map((c) => c.code)];
  const assignmentOptions = availableAssignments.length > 0 ? availableAssignments : ["All assignments", "Technical Report 02", "Lab Report 04"];
  const statusOptions = ["All statuses", "Requires Review", "Reviewed", "Pending Processing"];
  const evidenceOptions = ["All evidence levels", "Strong Evidence", "Moderate Evidence", "Weak / Low Overlap"];
  const reviewStatusOptions = ["All review statuses", "Pending", "In Review", "Explanation Requested", "Explanation Received", "Reviewed"];

  const hasActiveFilters =
    courseFilter !== "All courses" ||
    assignmentFilter !== "All assignments" ||
    statusFilter !== "All statuses" ||
    evidenceFilter !== "All evidence levels" ||
    reviewStatusFilter !== "All review statuses" ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setCourseFilter("All courses");
    setAssignmentFilter("All assignments");
    setStatusFilter("All statuses");
    setEvidenceFilter("All evidence levels");
    setReviewStatusFilter("All review statuses");
    setSearchQuery("");
  };

  const filtered = items.filter((s) => {
    if (courseFilter !== "All courses" && s.courseCode !== courseFilter) return false;
    if (assignmentFilter !== "All assignments" && s.assignment !== assignmentFilter) return false;

    if (statusFilter === "Requires Review" && s.status !== "review") return false;
    if (statusFilter === "Reviewed" && s.status !== "reviewed") return false;
    if (statusFilter === "Pending Processing" && s.status !== "pending") return false;

    if (evidenceFilter === "Strong Evidence" && s.evidenceLevel !== "strong") return false;
    if (evidenceFilter === "Moderate Evidence" && s.evidenceLevel !== "moderate") return false;
    if (evidenceFilter === "Weak / Low Overlap" && s.evidenceLevel !== "weak" && s.evidenceLevel !== "ignored") return false;

    if (reviewStatusFilter === "Pending" && s.reviewStatus !== "pending") return false;
    if (reviewStatusFilter === "In Review" && s.reviewStatus !== "in_review") return false;
    if (reviewStatusFilter === "Explanation Requested" && s.reviewStatus !== "explanation_requested") return false;
    if (reviewStatusFilter === "Explanation Received" && s.reviewStatus !== "explanation_received") return false;
    if (reviewStatusFilter === "Reviewed" && s.reviewStatus !== "reviewed") return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        s.student.toLowerCase().includes(q) ||
        s.roll.toLowerCase().includes(q) ||
        s.assignment.toLowerCase().includes(q) ||
        s.courseCode.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortField === "similarity") {
      return sortAsc ? a.similarity - b.similarity : b.similarity - a.similarity;
    }
    if (sortField === "student") {
      return sortAsc ? a.student.localeCompare(b.student) : b.student.localeCompare(a.student);
    }
    return sortAsc ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
  });

  const toggleSort = (field: "submitted" | "similarity" | "student") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Faculty Review Workspace"
        subtitle="Manage and evaluate academic submissions, passage evidence signals, and persistent review records across authorized courses."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="text-[12px]"
              onClick={() => {
                const csv = [
                  ["ID", "Student", "Roll", "Course", "Assignment", "Similarity", "Evidence", "Review Status", "Citations"].join(","),
                  ...sorted.map((s) =>
                    [
                      s.id,
                      `"${s.student}"`,
                      s.roll,
                      s.courseCode,
                      `"${s.assignment}"`,
                      `${s.similarity}%`,
                      s.evidenceLevel,
                      s.reviewStatus,
                      s.citationIssues,
                    ].join(",")
                  ),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `verity-faculty-review-audit-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
              }}
            >
              <Download className="mr-1.5 size-3.5" /> Export Audit CSV
            </Button>
            <Button asChild size="sm">
              <Link to="/compare">
                Compare Submissions
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-5">
        <StatBar
          stats={[
            { label: "Authorized Submissions", value: String(items.length) },
            {
              label: "Pending Review",
              value: String(items.filter((i) => i.reviewStatus === "pending" || i.reviewStatus === "in_review").length),
              tone: "warning",
            },
            {
              label: "High Similarity (≥30%)",
              value: String(items.filter((i) => i.similarity >= 30).length),
              tone: "danger",
            },
            {
              label: "Explanation Active",
              value: String(items.filter((i) => i.reviewStatus === "explanation_requested" || i.reviewStatus === "explanation_received").length),
              tone: "warning",
            },
            {
              label: "Cases Reviewed",
              value: String(items.filter((i) => i.reviewStatus === "reviewed").length),
              tone: "success",
            },
          ]}
        />
      </div>

      {/* Filter and Query Control Workspace */}
      <div className="mt-5 space-y-2.5">
        <FilterBar>
          <SelectFilter
            label="Course"
            options={courseOptions}
            value={courseFilter}
            onChange={setCourseFilter}
          />
          <SelectFilter
            label="Assignment"
            options={assignmentOptions}
            value={assignmentFilter}
            onChange={setAssignmentFilter}
          />
          <SelectFilter
            label="Submission"
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <SelectFilter
            label="Evidence"
            options={evidenceOptions}
            value={evidenceFilter}
            onChange={setEvidenceFilter}
          />
          <SelectFilter
            label="Review"
            options={reviewStatusOptions}
            value={reviewStatusFilter}
            onChange={setReviewStatusFilter}
          />

          <div className="flex items-center gap-1.5">
            <label
              htmlFor="submission-search"
              className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              Search
            </label>
            <div className="relative">
              <input
                id="submission-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Student, roll, ID..."
                className="h-8 w-44 rounded-sm border border-input bg-background pl-7 pr-2 text-[12px] text-foreground focus:border-ring focus:outline-none"
              />
              <Search className="pointer-events-none absolute top-2 left-2 size-3.5 text-muted-foreground" />
            </div>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="mr-1 size-3" /> Reset
            </Button>
          )}

          <span className="num ml-auto text-[12px] text-muted-foreground">
            {sorted.length} of {items.length} {sorted.length === 1 ? "submission" : "submissions"}
          </span>
        </FilterBar>
      </div>

      <TableShell className="mt-3" caption="Authorized course submissions and faculty review queue">
        <thead>
          <tr>
            <Th>
              <button
                type="button"
                onClick={() => toggleSort("student")}
                className="flex items-center gap-1 hover:text-foreground"
              >
                Student <ArrowUpDown className="size-3" />
              </button>
            </Th>
            <Th>Roll No.</Th>
            <Th>Course</Th>
            <Th>Assignment</Th>
            <Th>Submitted</Th>
            <Th numeric>
              <button
                type="button"
                onClick={() => toggleSort("similarity")}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                Similarity <ArrowUpDown className="size-3" />
              </button>
            </Th>
            <Th>Evidence Level</Th>
            <Th>Review Status</Th>
            <Th numeric>Sources</Th>
            <Th className="text-right">Action</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                <div className="mx-auto max-w-sm space-y-2">
                  <p className="font-semibold text-foreground">No submissions found</p>
                  <p className="text-xs text-muted-foreground">No submissions match the current filters. Adjust your course, assignment, or review status filters above.</p>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                      Reset All Filters
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            sorted.map((s) => (
              <Tr
                key={s.id}
                className="cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() =>
                  navigate({
                    to: "/submissions/$submissionId",
                    params: { submissionId: s.id },
                  })
                }
              >
                <Td>
                  <Link
                    to="/submissions/$submissionId"
                    params={{ submissionId: s.id }}
                    className="font-medium text-foreground hover:text-brand hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {s.student}
                  </Link>
                </Td>
                <Td className="num text-muted-foreground">{s.roll}</Td>
                <Td className="num text-muted-foreground">{s.courseCode}</Td>
                <Td className="max-w-[200px] truncate text-foreground">{s.assignment}</Td>
                <Td className="num text-muted-foreground whitespace-nowrap">{s.submitted}</Td>
                <Td numeric>
                  <SimilarityValue value={s.similarity} />
                </Td>
                <Td>
                  <span className={`inline-flex items-center rounded-xs px-2 py-0.5 text-[10px] font-semibold uppercase border ${
                    s.evidenceLevel === "strong"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : s.evidenceLevel === "moderate"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {s.evidenceLevel}
                  </span>
                </Td>
                <Td>
                  <span className={`inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-[10px] font-semibold border ${
                    s.reviewStatus === "reviewed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : s.reviewStatus === "in_review"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : s.reviewStatus === "explanation_requested" || s.reviewStatus === "explanation_received"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                    <span className="size-1.5 rounded-full bg-current" />
                    {s.reviewStatus === "reviewed"
                      ? "Reviewed"
                      : s.reviewStatus === "in_review"
                      ? "In Review"
                      : s.reviewStatus === "explanation_requested"
                      ? "Explanation Req."
                      : s.reviewStatus === "explanation_received"
                      ? "Explanation Recv."
                      : "Pending"}
                  </span>
                </Td>
                <Td numeric className="num text-muted-foreground">
                  {s.matchedSources}
                </Td>
                <Td className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] font-semibold text-brand hover:text-brand-dark"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate({
                        to: "/submissions/$submissionId",
                        params: { submissionId: s.id },
                      });
                    }}
                  >
                    Inspect
                  </Button>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </TableShell>
    </AppShell>
  );
}

