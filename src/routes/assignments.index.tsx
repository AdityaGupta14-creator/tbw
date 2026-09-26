import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TableShell, Th, Td, Tr, FilterBar, SelectFilter } from "@/components/data-table";
import { SimilarityValue } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { assignments, courses } from "@/lib/mock-data";

export const Route = createFileRoute("/assignments/")({
  head: () => ({
    meta: [
      { title: "Assignments — Verity" },
      {
        name: "description",
        content: "Technical reports, lab reports, and research papers with submission and review status.",
      },
      { property: "og:title", content: "Assignments — Verity" },
      {
        property: "og:description",
        content: "Track submissions, similarity averages, and pending reviews per assignment.",
      },
    ],
  }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const [course, setCourse] = useState("All courses");
  const [type, setType] = useState("All types");

  const courseOptions = ["All courses", ...courses.map((c) => c.code)];
  const typeOptions = ["All types", ...new Set(assignments.map((a) => a.type))];
  const rows = assignments.filter(
    (a) =>
      (course === "All courses" || a.courseCode === course) &&
      (type === "All types" || a.type === type),
  );

  return (
    <AppShell>
      <PageHeader
        title="Assignments"
        subtitle="All assignments across your courses for the current semester."
        actions={
          <Button asChild size="sm">
            <Link to="/assignments/new">
              <Plus className="size-3.5" /> New Assignment
            </Link>
          </Button>
        }
      />

      <div className="mt-4">
        <FilterBar>
          <SelectFilter label="Course" options={courseOptions} value={course} onChange={setCourse} />
          <SelectFilter label="Type" options={typeOptions} value={type} onChange={setType} />
          <span className="num ml-auto text-[12px] text-muted-foreground">{rows.length} assignments</span>
        </FilterBar>
      </div>

      <TableShell className="mt-3" caption="Assignments">
        <thead>
          <tr>
            <Th>Assignment</Th>
            <Th>Course</Th>
            <Th>Type</Th>
            <Th>Due</Th>
            <Th numeric>Submissions</Th>
            <Th numeric>Similarity</Th>
            <Th numeric>Pending</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
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
              <Td className="num text-muted-foreground">{a.courseCode}</Td>
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
    </AppShell>
  );
}
