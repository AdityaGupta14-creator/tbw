import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TableShell, Th, Td, Tr, FilterBar, SelectFilter } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { courses as defaultCourses, type Course as MockCourse } from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";

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
  const [coursesList, setCoursesList] = useState<MockCourse[]>(defaultCourses);
  const [dept, setDept] = useState("All departments");
  const [query, setQuery] = useState("");

  // Create course form state
  const [openCreate, setOpenCreate] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseDept, setCourseDept] = useState("Computer Engineering");
  const [courseSection, setCourseSection] = useState("A");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);

  useEffect(() => {
    verityApi.courses.list().then((dbCourses) => {
      if (dbCourses && dbCourses.length > 0) {
        const mapped: MockCourse[] = dbCourses.map((c) => ({
          id: c.id,
          code: c.course_code,
          title: c.name,
          department: c.department_name || "Engineering",
          section: c.section || "A",
          students: c.student_count || 64,
          assignments: c.assignment_count || 0,
          pending: c.pending_reviews || c.pending_count || 0,
        }));
        setCoursesList(mapped);
      }
    });
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !courseName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await verityApi.courses.create({
        course_code: courseCode.trim().toUpperCase(),
        name: courseName.trim(),
        section: courseSection,
        semester: "Autumn",
        academic_year: "2026–27",
      });

      const newCourse: MockCourse = {
        id: created.id,
        code: created.course_code,
        title: created.name,
        department: created.department_name || courseDept,
        section: created.section,
        students: 64,
        assignments: 0,
        pending: 0,
      };

      setCoursesList((prev) => [newCourse, ...prev]);
      setCreatedSuccess(true);
      setTimeout(() => {
        setCreatedSuccess(false);
        setOpenCreate(false);
        setCourseCode("");
        setCourseName("");
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  const departments = ["All departments", ...new Set(coursesList.map((c) => c.department))];
  const rows = coursesList.filter(
    (c) =>
      (dept === "All departments" || c.department === dept) &&
      (query === "" || `${c.code} ${c.title}`.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <AppShell>
      <PageHeader
        title="Courses"
        subtitle="Courses assigned to you for the current semester."
        actions={
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-3.5" /> Create Course
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogDescription>
                  Set up a new engineering course module for integrity tracking and assignment submissions.
                </DialogDescription>
              </DialogHeader>

              {createdSuccess ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle2 className="size-10 text-success" />
                  <p className="mt-2 text-sm font-medium text-foreground">Course created successfully</p>
                  <p className="text-xs text-muted-foreground">{courseCode} is now active</p>
                </div>
              ) : (
                <form onSubmit={handleCreateCourse} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="code" className="text-xs">
                        Course Code
                      </Label>
                      <Input
                        id="code"
                        placeholder="e.g. ENG-CSE-401"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        required
                        className="h-8 text-xs uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="section" className="text-xs">
                        Section
                      </Label>
                      <Input
                        id="section"
                        placeholder="e.g. A"
                        value={courseSection}
                        onChange={(e) => setCourseSection(e.target.value)}
                        required
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-xs">
                      Course Title
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g. Distributed Systems & Cloud Computing"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dept" className="text-xs">
                      Department
                    </Label>
                    <select
                      id="dept"
                      value={courseDept}
                      onChange={(e) => setCourseDept(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-xs"
                    >
                      <option value="Computer Engineering">CMPN — Computer Engineering</option>
                      <option value="Information Technology Engineering">IT — Information Technology Engineering</option>
                      <option value="Electronics and Computer Science Engineering">EXCS — Electronics and Computer Science Engineering</option>
                      <option value="Electronics and Telecommunication">EXTC — Electronics and Telecommunication</option>
                      <option value="Biomedical Engineering">BIO — Biomedical Engineering</option>
                    </select>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenCreate(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Save Course"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        }
      />

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
            <Th>Batches</Th>
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
              <Td className="text-foreground font-medium">{c.title}</Td>
              <Td className="text-muted-foreground text-xs">{c.department}</Td>
              <Td className="num text-muted-foreground font-semibold">Section {c.section}</Td>
              <Td className="text-xs">
                <span className="rounded-xs bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                  Batch 1, 2, 3
                </span>
              </Td>
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
