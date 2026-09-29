import { useState, useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { TableShell, Th, Td, Tr } from "@/components/data-table";
import { StatBar } from "@/components/stat-bar";
import { StatusBadge, SimilarityValue } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  assignments,
  findCourse,
  similarityDistribution,
  students,
  submissionActivity,
  submissions,
  type ReviewStatus,
} from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";

export const Route = createFileRoute("/courses/$courseId")({
  loader: ({ params }) => {
    const course = findCourse(params.courseId);
    if (!course) throw notFound();
    return { course };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Course unavailable — Verity" }, { name: "robots", content: "noindex" }],
      };
    }
    const { course } = loaderData;
    const title = `${course.code} ${course.title} — Verity`;
    const description = `Submissions, assignments, and integrity analysis for ${course.title}, Section ${course.section}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CourseDetail,
});

function CourseDetail() {
  const { course } = Route.useLoaderData();
  const [courseAssignments, setCourseAssignments] = useState(
    assignments.filter((a) => a.courseCode === course.code),
  );
  const [courseSubmissions, setCourseSubmissions] = useState(
    submissions.filter((s) => s.courseCode === course.code),
  );
  const courseStudents = students.filter((s) => s.courseCode === course.code);

  useEffect(() => {
    verityApi.assignments.list(course.id).then((dbList) => {
      if (dbList && dbList.length > 0) {
        const mapped = dbList.map((a) => ({
          id: a.id,
          courseCode: a.course_code || course.code,
          title: a.title,
          type: a.assignment_type || "Technical Report",
          due: a.due_date ? new Date(a.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "24 Oct 2026",
          submitted: a.submitted_count || 0,
          total: a.total_students || 64,
          avgSimilarity: 12,
          pending: 1,
          citationStyle: a.citation_style || "IEEE",
        }));
        setCourseAssignments(mapped);
      }
    });

    verityApi.submissions.list({ courseCode: course.code }).then((dbSubs) => {
      if (dbSubs && dbSubs.length > 0) {
        const mapped = dbSubs.map((s) => ({
          id: s.submission_code || s.id,
          student: s.student_name || "Student",
          roll: s.student_roll || "22CSE",
          courseCode: s.course_code || course.code,
          assignmentId: s.assignment_id,
          assignment: s.assignment_title || "Technical Report",
          submitted: s.submitted_at || "Today",
          similarity: s.similarity_percentage ?? 0,
          citationIssues: s.citation_issue_count ?? 0,
          status: (s.status === "needs_review" ? "review" : s.status === "reviewed" ? "reviewed" : "pending") as ReviewStatus,
          drafts: s.drafts_count ?? 1,
          matchedSources: s.matched_source_count ?? 4,
        }));
        setCourseSubmissions(mapped);
      }
    });
  }, [course.id, course.code]);

  return (
    <AppShell>
      <PageHeader
        title={`${course.code} · ${course.title}`}
        subtitle={`${course.department} · Section ${course.section} · ${course.students} students`}
      />

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList className="h-9 rounded-sm bg-muted p-0.5">
          {["overview", "students", "assignments", "submissions", "reports"].map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-xs text-[13px] capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-5">
          <StatBar
            stats={[
              { label: "Students", value: String(course.students) },
              { label: "Assignments", value: String(course.assignments) },
              { label: "Submissions", value: "212" },
              { label: "Pending Review", value: String(course.pending), tone: "warning" },
              { label: "Citation Issues", value: "6", tone: "warning" },
            ]}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-md border border-border bg-card p-4">
              <SectionTitle>Submission activity</SectionTitle>
              <div className="mt-3 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={submissionActivity} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 4,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                      }}
                    />
                    <Line type="monotone" dataKey="submissions" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="flagged" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-md border border-border bg-card p-4">
              <SectionTitle>Similarity distribution</SectionTitle>
              <div className="mt-3 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={similarityDistribution} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="band" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                    <Tooltip
                      cursor={{ fill: "var(--muted)" }}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 4,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                      }}
                    />
                    <Bar dataKey="count" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="students" className="mt-4">
          <TableShell caption="Students enrolled">
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Roll No.</Th>
                <Th>Section</Th>
                <Th numeric>Submissions</Th>
                <Th numeric>Avg. similarity</Th>
                <Th numeric>Requires review</Th>
              </tr>
            </thead>
            <tbody>
              {courseStudents.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: s.id }}
                      className="font-medium text-brand hover:underline"
                    >
                      {s.name}
                    </Link>
                  </Td>
                  <Td className="num text-muted-foreground">{s.roll}</Td>
                  <Td className="num text-muted-foreground">{s.section}</Td>
                  <Td numeric className="num">
                    {s.submissions}
                  </Td>
                  <Td numeric>
                    <SimilarityValue value={s.avgSimilarity} />
                  </Td>
                  <Td numeric className="num">
                    {s.flagged}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <TableShell caption="Course assignments">
            <thead>
              <tr>
                <Th>Assignment</Th>
                <Th>Type</Th>
                <Th>Due</Th>
                <Th numeric>Submissions</Th>
                <Th numeric>Similarity</Th>
                <Th numeric>Pending</Th>
              </tr>
            </thead>
            <tbody>
              {courseAssignments.map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <Link
                      to="/assignments/$assignmentId"
                      params={{ assignmentId: a.id }}
                      className="font-medium text-brand hover:underline"
                    >
                      {a.title}
                    </Link>
                  </Td>
                  <Td className="text-muted-foreground">{a.type}</Td>
                  <Td className="num text-muted-foreground">{a.due}</Td>
                  <Td numeric className="num">
                    {a.submitted} / {a.total}
                  </Td>
                  <Td numeric>
                    <SimilarityValue value={a.avgSimilarity} />
                  </Td>
                  <Td numeric className="num">
                    {a.pending}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        </TabsContent>

        <TabsContent value="submissions" className="mt-4">
          <TableShell caption="Course submissions">
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Roll No.</Th>
                <Th>Assignment</Th>
                <Th>Submitted</Th>
                <Th numeric>Similarity</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {courseSubmissions.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <Link
                      to="/submissions/$submissionId"
                      params={{ submissionId: s.id }}
                      className="font-medium text-brand hover:underline"
                    >
                      {s.student}
                    </Link>
                  </Td>
                  <Td className="num text-muted-foreground">{s.roll}</Td>
                  <Td>{s.assignment}</Td>
                  <Td className="num text-muted-foreground">{s.submitted}</Td>
                  <Td numeric>
                    <SimilarityValue value={s.similarity} />
                  </Td>
                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <div className="rounded-md border border-border bg-card p-5">
            <SectionTitle>Course reports</SectionTitle>
            <p className="mt-1.5 max-w-2xl text-[13px] text-muted-foreground">
              Generate an integrity summary for {course.code}, covering similarity distribution,
              citation issues, and review status for the selected assignment period.
            </p>
            <div className="mt-4">
              <Link
                to="/reports"
                className="inline-flex h-8 items-center rounded-sm bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                Open Reports
              </Link>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
