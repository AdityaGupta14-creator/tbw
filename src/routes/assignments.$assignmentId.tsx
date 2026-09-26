import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatBar } from "@/components/stat-bar";
import { TableShell, Th, Td, Tr } from "@/components/data-table";
import { StatusBadge, SimilarityValue } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { findAssignment, submissions } from "@/lib/mock-data";

export const Route = createFileRoute("/assignments/$assignmentId")({
  loader: ({ params }) => {
    const assignment = findAssignment(params.assignmentId);
    if (!assignment) throw notFound();
    return { assignment };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Assignment unavailable — Verity" }, { name: "robots", content: "noindex" }],
      };
    }
    const { assignment } = loaderData;
    const title = `${assignment.title} — ${assignment.courseCode} — Verity`;
    const description = `Review workspace for ${assignment.title} (${assignment.type}), due ${assignment.due}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: AssignmentDetail,
});

function AssignmentDetail() {
  const { assignment } = Route.useLoaderData();
  const rows = submissions.filter(
    (s) => s.assignmentId === assignment.id || s.courseCode === assignment.courseCode,
  );

  return (
    <AppShell>
      <PageHeader
        title={assignment.title}
        subtitle={`${assignment.courseCode} · ${assignment.type} · Due ${assignment.due} · Citation style ${assignment.citationStyle}`}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link to="/compare">Compare submissions</Link>
            </Button>
            <Button size="sm">Review queue</Button>
          </>
        }
      />

      <div className="mt-5">
        <StatBar
          stats={[
            { label: "Submitted", value: `${assignment.submitted} / ${assignment.total}` },
            { label: "Avg. Similarity", value: `${assignment.avgSimilarity}%` },
            { label: "Pending Review", value: String(assignment.pending), tone: "warning" },
            { label: "Citation Issues", value: "4", tone: "warning" },
            { label: "High Similarity", value: "2", tone: "danger" },
          ]}
        />
      </div>

      <h2 className="mt-5 text-sm font-semibold">Submissions</h2>
      <TableShell className="mt-2" caption={`Submissions for ${assignment.title}`}>
        <thead>
          <tr>
            <Th>Student</Th>
            <Th>Roll No.</Th>
            <Th>Submitted</Th>
            <Th numeric>Similarity</Th>
            <Th numeric>Sources</Th>
            <Th numeric>Citation issues</Th>
            <Th numeric>Drafts</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
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
              <Td className="num text-muted-foreground">{s.submitted}</Td>
              <Td numeric>
                <SimilarityValue value={s.similarity} />
              </Td>
              <Td numeric className="num">
                {s.matchedSources}
              </Td>
              <Td numeric className="num">
                {s.citationIssues}
              </Td>
              <Td numeric className="num">
                {s.drafts}
              </Td>
              <Td>
                <StatusBadge status={s.status} />
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>
    </AppShell>
  );
}
