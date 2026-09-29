import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TableShell, Th, Td, Tr, FilterBar, SelectFilter } from "@/components/data-table";
import { SimilarityValue } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { assignments as initialAssignments, courses as defaultCourses, type Assignment as MockAssignment } from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";

export const Route = createFileRoute("/assignments/")({
  loader: async () => {
    try {
      const list = await verityApi.assignments.list();
      return { assignments: list };
    } catch {
      return { assignments: [] };
    }
  },
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
  const loaderData = Route.useLoaderData();
  const formatDue = (dateStr?: string) =>
    dateStr
      ? isNaN(Date.parse(dateStr))
        ? dateStr
        : new Date(dateStr).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
      : "24 Oct 2026";

  const getInitialList = () => {
    if (loaderData?.assignments && loaderData.assignments.length > 0) {
      const mapped: MockAssignment[] = loaderData.assignments.map((a: any) => ({
        id: a.id,
        courseCode: a.course_code || "ENG-CSE-301",
        title: a.title,
        type: a.assignment_type || "Technical Report",
        due: formatDue(a.due_date),
        submitted: a.submitted_count || 0,
        total: a.total_students || 64,
        avgSimilarity: a.avg_similarity || 0,
        pending: a.pending_count || 0,
        citationStyle: a.citation_style || "IEEE",
      }));
      const dbTitles = new Set(mapped.map((m) => m.title.trim().toLowerCase()));
      const dbIds = new Set(mapped.map((m) => m.id));
      return [
        ...mapped,
        ...initialAssignments.filter(
          (m) => !dbTitles.has(m.title.trim().toLowerCase()) && !dbIds.has(m.id)
        ),
      ];
    }
    return initialAssignments;
  };

  const [assignmentList, setAssignmentList] = useState<MockAssignment[]>(getInitialList);
  const [coursesList, setCoursesList] = useState(defaultCourses);
  const [course, setCourse] = useState("All courses");
  const [type, setType] = useState("All types");


  useEffect(() => {
    // 1. Fetch courses for filters
    verityApi.courses.list().then((crs) => {
      if (crs && crs.length > 0) {
        setCoursesList(crs.map((c) => ({
          id: c.id,
          code: c.course_code,
          title: c.name,
          department: c.department_name || "Computer Engineering",
          section: c.section || "A",
          students: c.student_count || 64,
          assignments: c.assignment_count || 0,
          pending: c.pending_count || 0,
        })));
      }
    });

    // 2. Fetch assignments from Supabase
    verityApi.assignments.list().then((list) => {
      if (list && list.length > 0) {
        const mapped: MockAssignment[] = list.map((a) => {
          const formattedDue = a.due_date
            ? isNaN(Date.parse(a.due_date))
              ? a.due_date
              : new Date(a.due_date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
            : "24 Oct 2026";

          return {
            id: a.id,
            courseCode: a.course_code || "ENG-CSE-301",
            title: a.title,
            type: a.assignment_type || "Technical Report",
            due: formattedDue,
            submitted: a.submitted_count || 0,
            total: a.total_students || 64,
            avgSimilarity: a.avg_similarity || 0,
            pending: a.pending_count || 0,
            citationStyle: a.citation_style || "IEEE",
          };
        });

        // Merge keeping any mock ones not already present by title or ID
        const dbTitles = new Set(mapped.map((m) => m.title.trim().toLowerCase()));
        const dbIds = new Set(mapped.map((m) => m.id));
        const merged = [
          ...mapped,
          ...initialAssignments.filter(
            (m) => !dbTitles.has(m.title.trim().toLowerCase()) && !dbIds.has(m.id)
          ),
        ];

        setAssignmentList(merged);
      }
    });
  }, []);

  const courseOptions = ["All courses", ...new Set([...coursesList.map((c) => c.code), ...assignmentList.map((a) => a.courseCode)])];
  const typeOptions = ["All types", ...new Set(assignmentList.map((a) => a.type))];
  const rows = assignmentList.filter(
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
