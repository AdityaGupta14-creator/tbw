import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TableShell, Th, Td, Tr, FilterBar, SelectFilter } from "@/components/data-table";
import { courses } from "@/lib/mock-data";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Courses — Verity" },
      {
        name: "description",
        content: "Engineering courses, sections, enrolment, and pending academic integrity reviews.",
      },
      { property: "og:title", content: "Courses — Verity" },
      {
        property: "og:description",
        content: "Course list with sections, students, assignments, and pending reviews.",
      },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const [dept, setDept] = useState("All departments");
  const [query, setQuery] = useState("");

  const departments = ["All departments", ...new Set(courses.map((c) => c.department))];
  const rows = courses.filter(
    (c) =>
      (dept === "All departments" || c.department === dept) &&
      (query === "" ||
        `${c.code} ${c.title}`.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <AppShell>
      <PageHeader title="Courses" subtitle="Courses assigned to you for the current semester." />

      <div className="mt-4">
        <FilterBar>
          <SelectFilter label="Department" options={departments} value={dept} onChange={setDept} />
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="course-search"
              className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              Search
            </label>
            <input
              id="course-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Course code or title"
              className="h-8 w-56 rounded-sm border border-input bg-background px-2 text-[12px]"
            />
          </div>
          <span className="num ml-auto text-[12px] text-muted-foreground">{rows.length} courses</span>
        </FilterBar>
      </div>

      <TableShell className="mt-3" caption="Courses">
        <thead>
          <tr>
            <Th>Course Code</Th>
            <Th>Course</Th>
            <Th>Department</Th>
            <Th>Section</Th>
            <Th numeric>Students</Th>
            <Th numeric>Assignments</Th>
            <Th numeric>Pending</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <Tr key={c.id}>
              <Td className="num">
                <Link
                  to="/courses/$courseId"
                  params={{ courseId: c.id }}
                  className="font-medium text-brand hover:underline"
                >
                  {c.code}
                </Link>
              </Td>
              <Td className="text-foreground">{c.title}</Td>
              <Td className="text-muted-foreground">{c.department}</Td>
              <Td className="num text-muted-foreground">{c.section}</Td>
              <Td numeric className="num">
                {c.students}
              </Td>
              <Td numeric className="num">
                {c.assignments}
              </Td>
              <Td numeric className="num font-medium">
                {c.pending}
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>
    </AppShell>
  );
}
