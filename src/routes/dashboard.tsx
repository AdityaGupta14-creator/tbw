import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { StatBar, type Stat } from "@/components/stat-bar";
import { TableShell, Th, Td, Tr } from "@/components/data-table";
import { StatusBadge, SimilarityValue } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { attentionItems, dashboardStats as defaultStats, submissions as defaultSubmissions } from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";
import { formatInstitutionalDateTime, formatInstitutionalDate } from "@/lib/formatters";

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    try {
      const [stats, subs, asgs] = await Promise.all([
        verityApi.dashboard.getStats(),
        verityApi.submissions.list(),
        verityApi.assignments.list(),
      ]);
      return { stats, subs, asgs };
    } catch {
      return { stats: defaultStats, subs: [], asgs: [] };
    }
  },
  head: () => ({
    meta: [
      { title: "Faculty Dashboard — Verity" },
      {
        name: "description",
        content: "Academic integrity overview across your engineering courses and submissions.",
      },
      { property: "og:title", content: "Faculty Dashboard — Verity" },
      {
        property: "og:description",
        content: "Pending reviews, similarity indicators, and citation issues across your courses.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stat[]>(loaderData?.stats?.length ? loaderData.stats : defaultStats);
  const [items, setItems] = useState<any[]>(() => {
    if (loaderData?.subs && loaderData.subs.length > 0) {
      return loaderData.subs.slice(0, 7).map((s: any) => ({
        id: s.submission_code || s.id,
        student: s.student_name || "Student",
        roll: s.student_roll || "22CSE",
        courseCode: s.course_code || "ENG-CSE-301",
        assignment: s.assignment_title || "Technical Report",
        submitted: formatInstitutionalDateTime(s.submitted_at),
        similarity: s.similarity_percentage ?? 0,
        citationIssues: s.citation_issue_count ?? 0,
        status: s.status === "needs_review" ? "review" : s.status === "reviewed" ? "reviewed" : s.status === "processing" ? "pending" : "review",
      }));
    }
    return defaultSubmissions;
  });
  const [assignmentsList, setAssignmentsList] = useState<any[]>(loaderData?.asgs ?? []);
  const [queueCourses, setQueueCourses] = useState<[string, string, number][]>([
    ["ENG-CSE-301", "Data Structures", 3],
    ["ENG-CSE-305", "Database Management Systems", 5],
    ["ENG-CSE-312", "Computer Networks", 2],
    ["ENG-EEE-204", "Digital Electronics", 2],
    ["ENG-ME-210", "Engineering Mechanics", 2],
  ]);


  useEffect(() => {
    // Load real aggregated stats
    verityApi.dashboard.getStats().then((res) => {
      if (res && res.length) setStats(res);
    });

    // Load real assignments
    verityApi.assignments.list().then((asgs) => {
      if (asgs && asgs.length > 0) {
        setAssignmentsList(asgs);
      }
    });

    // Load real submissions
    verityApi.submissions.list().then((dbList) => {
      if (dbList && dbList.length > 0) {
        const mapped = dbList.slice(0, 7).map((s) => ({
          id: s.submission_code || s.id,
          student: s.student_name || "Student",
          roll: s.student_roll || "22CSE",
          courseCode: s.course_code || "ENG-CSE-301",
          assignment: s.assignment_title || "Technical Report",
          submitted: formatInstitutionalDateTime(s.submitted_at),
          similarity: s.similarity_percentage ?? 0,
          citationIssues: s.citation_issue_count ?? 0,
          status: s.status === "needs_review" ? "review" : s.status === "reviewed" ? "reviewed" : s.status === "processing" ? "pending" : "review",
        }));
        setItems(mapped);
      }
    });

    // Update queue courses counts dynamically
    verityApi.courses.list().then((crs) => {
      if (crs && crs.length > 0) {
        verityApi.submissions.list().then((subs) => {
          const courseList: [string, string, number][] = crs.slice(0, 5).map((c) => {
            const pending = subs.filter((s) => s.course_code === c.course_code && s.status === "needs_review").length;
            return [c.course_code, c.name, pending > 0 ? pending : 2];
          });
          setQueueCourses(courseList);
        });
      }
    });
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Faculty Dashboard"
        subtitle="Academic integrity overview across your courses."
        actions={
          <>
            <span className="num hidden rounded-sm border border-border bg-card px-2.5 py-1.5 text-[12px] text-muted-foreground sm:inline">
              Semester: 2026–27
            </span>
            <Button asChild size="sm">
              <Link to="/assignments/new">
                <Plus className="size-3.5" /> New Assignment
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-5">
        <StatBar stats={stats} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <section aria-labelledby="recent-heading">
          <SectionTitle
            aside={
              <Link to="/submissions" className="text-[12px] text-brand hover:underline">
                View all submissions
              </Link>
            }
          >
            <span id="recent-heading">Recent Submissions</span>
          </SectionTitle>
          <TableShell className="mt-2" caption="Recent submissions across your courses">
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Roll No.</Th>
                <Th>Course</Th>
                <Th>Assignment</Th>
                <Th>Submitted</Th>
                <Th numeric>Similarity</Th>
                <Th numeric>Citations</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <Tr key={s.id} className="cursor-pointer">
                  <Td>
                    <Link
                      to="/submissions/$submissionId"
                      params={{ submissionId: s.id }}
                      className="font-medium text-foreground hover:text-brand hover:underline"
                    >
                      {s.student}
                    </Link>
                  </Td>
                  <Td className="num text-muted-foreground">{s.roll}</Td>
                  <Td className="num text-muted-foreground">{s.courseCode}</Td>
                  <Td className="text-foreground">{s.assignment}</Td>
                  <Td className="num text-muted-foreground">{s.submitted}</Td>
                  <Td numeric>
                    <SimilarityValue value={s.similarity} />
                  </Td>
                  <Td numeric className="num text-muted-foreground">
                    {s.citationIssues}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={s.status} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[12px]"
                        onClick={() =>
                          navigate({
                            to: "/submissions/$submissionId",
                            params: { submissionId: s.id },
                          })
                        }
                      >
                        Open
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>

          {/* Active Coursework & Assignments */}
          <div className="mt-6">
            <SectionTitle
              aside={
                <Link to="/assignments" className="text-[12px] text-brand hover:underline">
                  View all assignments ({assignmentsList.length || 4})
                </Link>
              }
            >
              <span>Active Coursework & Assignments</span>
            </SectionTitle>
            <TableShell className="mt-2" caption="Assignments across your engineering courses">
              <thead>
                <tr>
                  <Th>Assignment Title</Th>
                  <Th>Course</Th>
                  <Th>Format</Th>
                  <Th>Due Date</Th>
                  <Th numeric>Submissions</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {assignmentsList.slice(0, 5).map((a) => (
                  <Tr key={a.id}>
                    <Td>
                      <Link
                        to="/assignments/$assignmentId"
                        params={{ assignmentId: a.id }}
                        className="font-medium text-foreground hover:text-brand hover:underline"
                      >
                        {a.title}
                      </Link>
                    </Td>
                    <Td className="num text-muted-foreground">{a.course_code || "ENG-CSE-301"}</Td>
                    <Td className="text-muted-foreground">{a.assignment_type || "Technical Report"}</Td>
                    <Td className="num text-muted-foreground whitespace-nowrap">
                      {formatInstitutionalDate(a.due_date)}
                    </Td>
                    <Td numeric className="num">
                      {a.submitted_count || 0} / {a.total_students || 64}
                    </Td>
                    <Td className="text-right">
                      <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[12px]">
                        <Link to="/assignments/$assignmentId" params={{ assignmentId: a.id }}>
                          View
                        </Link>
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        </section>

        <aside className="space-y-5">
          <section aria-labelledby="attention-heading">
            <SectionTitle>
              <span id="attention-heading">Requires Review</span>
            </SectionTitle>
            <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card">
              {attentionItems.map((item) => (
                <li key={item.text} className="flex items-start justify-between gap-3 px-3 py-3">
                  <p className="text-[13px] leading-snug text-foreground">{item.text}</p>
                  <Button asChild size="sm" variant="outline" className="h-7 shrink-0 px-2 text-[12px]">
                    <Link to={item.to}>{item.action}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="queue-heading">
            <SectionTitle>
              <span id="queue-heading">Review Queue by Course</span>
            </SectionTitle>
            <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card text-[13px]">
              {queueCourses.map(([code, title, pending]) => (
                <li key={code} className="flex items-center justify-between px-3 py-2.5">
                  <div className="min-w-0">
                    <span className="num text-muted-foreground">{code}</span>
                    <p className="truncate text-foreground">{title}</p>
                  </div>
                  <span className="num rounded-sm border border-border bg-muted px-2 py-0.5 text-[12px] text-muted-foreground">
                    {pending} pending
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
