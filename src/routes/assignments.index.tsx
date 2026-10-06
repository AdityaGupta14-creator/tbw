import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
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
        courseCode: a.course_code || "EXCS-B",
        title: a.title,
        subject: a.subject || "Technical and Business Writing",
        type: a.assignment_type || "Technical Report",
        due: formatDue(a.due_date),
        submitted: a.submitted_count || 0,
        total: a.total_students || 5,
        avgSimilarity: a.avg_similarity || 0,
        pending: a.pending_count || 0,
        citationStyle: a.citation_style || "Normal",
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
          department: c.department_name || "Electronics and Computer Science Engineering",
          section: c.section || "B",
          students: c.student_count || 5,
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
            : "05 Oct 2026, 11:59 PM";

          return {
            id: a.id,
            courseCode: a.course_code || "EXCS-B",
            title: a.title,
            subject: a.subject || "Technical and Business Writing",
            type: a.assignment_type || "Technical Report",
            due: formattedDue,
            submitted: a.submitted_count || 0,
            total: a.total_students || 5,
            avgSimilarity: a.avg_similarity || 0,
            pending: a.pending_count || 0,
            citationStyle: a.citation_style || "Normal",
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
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm("Are you sure you want to delete this assignment?")) {
      try {
        await verityApi.assignments.delete(id);
        setAssignmentList((prev) => prev.filter((a) => a.id !== id));
      } catch (err) {
        console.error("Failed to delete assignment", err);
        alert("Failed to delete assignment");
      }
    }
  };


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
            <Th>Subject</Th>
            <Th>Course</Th>
            <Th>Due Date</Th>
            <Th>Citation Style</Th>
            <Th numeric>Submissions</Th>
            <Th numeric>Similarity</Th>
            <Th numeric>Pending</Th>
            <Th></Th>
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
                <div className="text-[11px] text-muted-foreground">{a.type}</div>
              </Td>
              <Td className="text-xs text-foreground font-medium">{a.subject || "Technical and Business Writing"}</Td>
              <Td className="num text-muted-foreground font-semibold">{a.courseCode}</Td>
              <Td className="num text-muted-foreground text-xs whitespace-nowrap">{a.due}</Td>
              <Td className="text-xs">
                <span
                  className={`rounded-xs px-1.5 py-0.5 font-medium border text-[11px] ${
                    a.citationStyle === "Normal"
                      ? "bg-muted text-foreground border-border"
                      : "bg-brand/10 text-brand border-brand/20"
                  }`}
                >
                  {a.citationStyle}
                </span>
              </Td>
              <Td numeric className="num">
                {a.submitted} / {a.total}
              </Td>
              <Td numeric>
                <SimilarityValue value={a.avgSimilarity} />
              </Td>
              <Td numeric className="num">
                {a.pending}
              </Td>
              <Td>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-danger" onClick={(e) => handleDelete(a.id, e)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>
    </AppShell>
  );
}
