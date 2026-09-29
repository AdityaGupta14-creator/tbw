import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpDown, CheckCircle2, Mail, Plus, Search, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TableShell, Th, Td, Tr, FilterBar, SelectFilter } from "@/components/data-table";
import { StatBar } from "@/components/stat-bar";
import { SimilarityValue } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { students as initialStudents, courses } from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";
import { toast } from "sonner";

export const Route = createFileRoute("/students/")({
  head: () => ({
    meta: [
      { title: "Students Directory — Verity" },
      {
        name: "description",
        content: "Engineering students roster with submission tracking, average similarity metrics, and integrity records.",
      },
      { property: "og:title", content: "Students — Verity" },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const [courseFilter, setCourseFilter] = useState("All courses");
  const [sectionFilter, setSectionFilter] = useState("All sections");
  const [searchQuery, setSearchQuery] = useState("");
  const [studentsList, setStudentsList] = useState(initialStudents);

  // Add Student Modal State
  const [openAdd, setOpenAdd] = useState(false);
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("ENG-CSE-301");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);

  useEffect(() => {
    verityApi.students.list().then((dbStudents) => {
      if (dbStudents && dbStudents.length > 0) {
        // Map Supabase profile rows to directory roster format
        const mapped = dbStudents.map((p) => {
          const existing = initialStudents.find(
            (s) => s.roll === p.roll_number || s.id === p.id
          );
          return {
            id: p.id,
            name: p.full_name,
            roll: p.roll_number || "22CSE",
            email: p.email,
            courseCode: existing?.courseCode || "ENG-CSE-301",
            section: existing?.section || "A",
            submissions: existing?.submissions || 1,
            avgSimilarity: existing?.avgSimilarity || 12,
            flagged: existing?.flagged || 0,
            status: "active" as const,
          };
        });

        // Merge keeping any mock ones not in db
        const dbRolls = new Set(mapped.map((m) => m.roll));
        const merged = [...mapped, ...initialStudents.filter((s) => !dbRolls.has(s.roll))];
        setStudentsList(merged);
      }
    });
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roll.trim() || !email.trim()) {
      toast.error("Please provide student name, roll number, and academic email");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await verityApi.students.create({
        full_name: name.trim(),
        roll_number: roll.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        department_name: "Computer Engineering",
      });

      const newStudentEntry = {
        id: created.id,
        name: created.full_name,
        roll: created.roll_number || roll.trim().toUpperCase(),
        email: created.email,
        courseCode: selectedCourse,
        section: "A",
        submissions: 0,
        avgSimilarity: 0,
        flagged: 0,
        status: "active" as const,
      };

      setStudentsList((prev) => [newStudentEntry, ...prev]);
      setCreatedSuccess(true);
      toast.success("Student successfully enrolled in Supabase institutional roster!");
      setTimeout(() => {
        setCreatedSuccess(false);
        setOpenAdd(false);
        setName("");
        setRoll("");
        setEmail("");
      }, 1000);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create student");
    } finally {
      setIsSubmitting(false);
    }
  };

  const courseOptions = ["All courses", ...courses.map((c) => c.code)];
  const sectionOptions = ["All sections", "Section A", "Section B", "Section C"];

  const filtered = studentsList.filter((s) => {
    if (courseFilter !== "All courses" && s.courseCode !== courseFilter) return false;
    if (sectionFilter !== "All sections" && `Section ${s.section}` !== sectionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !s.roll.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <AppShell>
      <PageHeader
        title="Students Directory"
        subtitle="Enrolled engineering students, cohort submission counts, and historical similarity indices."
        actions={
          <Button size="sm" onClick={() => setOpenAdd(true)} className="h-8 text-xs font-medium">
            <Plus className="mr-1.5 size-3.5" /> Add Student
          </Button>
        }
      />

      <div className="mt-5">
        <StatBar
          stats={[
            { label: "Enrolled Students", value: String(studentsList.length) },
            { label: "Active Cohorts", value: "4" },
            { label: "Mean Similarity", value: "14.8%" },
            { label: "High Overlap Records", value: "3", tone: "danger" },
            { label: "Adherence Rate", value: "98.2%", tone: "success" },
          ]}
        />
      </div>

      <div className="mt-5">
        <FilterBar>
          <SelectFilter
            label="Course"
            options={courseOptions}
            value={courseFilter}
            onChange={setCourseFilter}
          />
          <SelectFilter
            label="Section"
            options={sectionOptions}
            value={sectionFilter}
            onChange={setSectionFilter}
          />
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="student-search"
              className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              Search
            </label>
            <div className="relative">
              <input
                id="student-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, roll no, or email..."
                className="h-8 w-56 rounded-sm border border-input bg-background pl-7 pr-2 text-[12px] text-foreground focus:border-ring focus:outline-none"
              />
              <Search className="pointer-events-none absolute top-2 left-2 size-3.5 text-muted-foreground" />
            </div>
          </div>
          <span className="num ml-auto text-[12px] text-muted-foreground">
            {filtered.length} students
          </span>
        </FilterBar>
      </div>

      <TableShell className="mt-3" caption="Enrolled students table">
        <thead>
          <tr>
            <Th>Student Name</Th>
            <Th>Roll No.</Th>
            <Th>Enrolled Course</Th>
            <Th>Section</Th>
            <Th numeric>Submissions</Th>
            <Th numeric>Avg. Similarity</Th>
            <Th numeric>Flagged Reports</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <Tr key={s.id}>
              <Td>
                <Link
                  to="/students/$studentId"
                  params={{ studentId: s.id }}
                  className="font-medium text-foreground hover:text-brand hover:underline"
                >
                  {s.name}
                </Link>
                <div className="text-[11px] text-muted-foreground">{s.email}</div>
              </Td>
              <Td className="num text-muted-foreground">{s.roll}</Td>
              <Td className="num text-muted-foreground">{s.courseCode}</Td>
              <Td className="num text-muted-foreground">Section {s.section}</Td>
              <Td numeric className="num">
                {s.submissions}
              </Td>
              <Td numeric>
                <SimilarityValue value={s.avgSimilarity} />
              </Td>
              <Td numeric className="num">
                {s.flagged > 0 ? (
                  <span className="font-semibold text-danger">{s.flagged}</span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </Td>
              <Td className="text-right">
                <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-[12px]">
                  <Link to="/students/$studentId" params={{ studentId: s.id }}>
                    View Profile
                  </Link>
                </Button>
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>

      {/* Add Student Modal */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll New Student</DialogTitle>
            <DialogDescription>
              Register an engineering student into the institutional repository and Supabase database.
            </DialogDescription>
          </DialogHeader>

          {createdSuccess ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="size-12 text-success" />
              <p className="mt-3 text-sm font-medium text-foreground">Student Enrolled Successfully</p>
              <p className="text-xs text-muted-foreground">Synchronized to Supabase profiles table.</p>
            </div>
          ) : (
            <form onSubmit={handleAddStudent} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground" htmlFor="student-name">
                  Full Name
                </label>
                <input
                  id="student-name"
                  type="text"
                  required
                  placeholder="e.g. Pooja Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 w-full rounded-sm border border-input bg-background px-2.5 text-[12px] text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-foreground" htmlFor="student-roll">
                    Roll Number
                  </label>
                  <input
                    id="student-roll"
                    type="text"
                    required
                    placeholder="e.g. 22CSE088"
                    value={roll}
                    onChange={(e) => setRoll(e.target.value)}
                    className="num h-8 w-full rounded-sm border border-input bg-background px-2.5 text-[12px] text-foreground focus:border-ring focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-foreground" htmlFor="student-course">
                    Primary Course
                  </label>
                  <select
                    id="student-course"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="h-8 w-full rounded-sm border border-input bg-background px-2 text-[12px] text-foreground focus:border-ring focus:outline-none"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground" htmlFor="student-email">
                  Academic Email
                </label>
                <input
                  id="student-email"
                  type="email"
                  required
                  placeholder="e.g. pooja.verma@abcit.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 w-full rounded-sm border border-input bg-background px-2.5 text-[12px] text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenAdd(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Enrolling..." : "Enroll Student"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
