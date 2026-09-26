import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { StatBar } from "@/components/stat-bar";
import { TableShell, Th, Td, Tr } from "@/components/data-table";
import { StatusBadge, SimilarityValue } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { attentionItems, dashboardStats, submissions } from "@/lib/mock-data";

export const Route = createFileRoute("/dashboard")({
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
  const navigate = useNavigate();

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
        <StatBar stats={dashboardStats} />
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
              {submissions.map((s) => (
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
              {[
                ["ENG-CSE-301", "Data Structures", 3],
                ["ENG-CSE-305", "Database Management Systems", 5],
                ["ENG-CSE-312", "Computer Networks", 2],
                ["ENG-EEE-204", "Digital Electronics", 2],
                ["ENG-ME-210", "Engineering Mechanics", 2],
              ].map(([code, title, pending]) => (
                <li key={code as string} className="flex items-center justify-between px-3 py-2.5">
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
