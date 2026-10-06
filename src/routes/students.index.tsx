import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Plus, Search, UserCheck } from "lucide-react";
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
import {
  students as initialStudents,
  courses,
  INSTITUTIONAL_DEPARTMENTS,
} from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";
import { toast } from "sonner";

export const Route = createFileRoute("/students/")({
  head: () => ({
    meta: [
      { title: "Students Directory — Verity" },
      {
        name: "description",
        content: "Engineering students roster with institutional department, section, batch, and integrity records.",
      },
      { property: "og:title", content: "Students Directory — Verity" },
    ],
  }),
  component: StudentsPage,
});

const DEFAULT_BATCHES = ["Batch 1", "Batch 2", "Batch 3"];

function formatAutoEmail(fullName: string): string {
  const parts = fullName.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.replace(/[^a-z0-9]/g, "");
    const last = parts[parts.length - 1]?.replace(/[^a-z0-9]/g, "");
    return `${first}.${last}@vit.edu.in`;
  } else if (parts.length === 1) {
    const single = parts[0]?.replace(/[^a-z0-9]/g, "");
    return `${single}@vit.edu.in`;
  }
  return "";
}

function StudentsPage() {
  const [departmentFilter, setDepartmentFilter] = useState("All departments");
  const [courseFilter, setCourseFilter] = useState("All courses");
  const [batchFilter, setBatchFilter] = useState("All batches");
  const [searchQuery, setSearchQuery] = useState("");
  const [studentsList, setStudentsList] = useState(initialStudents);

  // Add Student Modal State
  const [openAdd, setOpenAdd] = useState(false);
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [email, setEmail] = useState("");
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
  const [selectedDeptCode, setSelectedDeptCode] = useState("EXCS");
  const [selectedCourseCode, setSelectedCourseCode] = useState("EXCS-B");
  const [selectedBatch, setSelectedBatch] = useState("Batch 3");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);

  // Auto-generate email from student name if not manually overridden
  const handleNameChange = (val: string) => {
    setName(val);
    if (!emailManuallyEdited) {
      setEmail(formatAutoEmail(val));
    }
  };

  // When department changes in modal, update available course codes
  const handleDeptChange = (deptCode: string) => {
    setSelectedDeptCode(deptCode);
    const validCourses = courses.filter((c) => c.departmentCode === deptCode);
    if (validCourses.length > 0) {
      const match = validCourses.find((c) => c.section === "B") || validCourses[0];
      setSelectedCourseCode(match?.code || `${deptCode}-A`);
    } else {
      setSelectedCourseCode(`${deptCode}-A`);
    }
  };

  useEffect(() => {
    verityApi.students.list().then((dbStudents) => {
      if (dbStudents && dbStudents.length > 0) {
        const mapped = dbStudents.map((p) => {
          const existing = initialStudents.find(
            (s) => s.roll === p.roll_number || s.id === p.id
          );
          const deptMatch = INSTITUTIONAL_DEPARTMENTS.find(
            (d) =>
              d.name.toLowerCase() === (p.department_name || "").toLowerCase() ||
              d.code.toLowerCase() === (p.department_code || "").toLowerCase()
          );

          const courseCode = p.course_code || existing?.courseCode || "EXCS-B";
          const section = p.section || (courseCode.includes("-") ? courseCode.split("-")[1] : "B") || "B";
          const batch = p.batch || existing?.batch || "Batch 3";
          const department = p.department_name || deptMatch?.name || "Electronics and Computer Science Engineering";
          const departmentCode = p.department_code || deptMatch?.code || (courseCode.includes("-") ? courseCode.split("-")[0] : "EXCS") || "EXCS";

          return {
            id: p.id,
            name: p.full_name,
            roll: p.roll_number || "25108B0071",
            email: p.email || `${p.full_name.toLowerCase().replace(/\s+/g, ".")}@vit.edu.in`,
            department,
            departmentCode,
            courseCode,
            section,
            batch,
            submissions: existing?.submissions ?? 1,
            avgSimilarity: existing?.avgSimilarity ?? 10,
            flagged: existing?.flagged ?? 0,
            status: "active" as const,
          };
        });

        // Merge, keeping mock ones with matching rolls
        const dbRolls = new Set(mapped.map((m) => m.roll.toUpperCase()));
        const merged = [
          ...mapped,
          ...initialStudents.filter((s) => !dbRolls.has(s.roll.toUpperCase())),
        ];
        setStudentsList(merged);
      }
    });
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please provide student's full name");
      return;
    }
    if (!roll.trim()) {
      toast.error("Please provide student's institutional roll number");
      return;
    }
    if (!email.trim()) {
      toast.error("Please provide student's institutional email");
      return;
    }

    const deptObj = INSTITUTIONAL_DEPARTMENTS.find((d) => d.code === selectedDeptCode);
    const sectionVal = selectedCourseCode.includes("-") ? selectedCourseCode.split("-")[1] || "B" : "B";

    setIsSubmitting(true);
    try {
      const created = await verityApi.students.create({
        full_name: name.trim(),
        roll_number: roll.trim(),
        email: email.trim().toLowerCase(),
        department_name: deptObj?.name || "Electronics and Computer Science Engineering",
        department_code: selectedDeptCode,
        course_code: selectedCourseCode,
        section: sectionVal,
        batch: selectedBatch,
      });

      const newStudentEntry = {
        id: created.id,
        name: created.full_name,
        roll: created.roll_number || roll.trim(),
        email: created.email,
        department: deptObj?.name || "Electronics and Computer Science Engineering",
        departmentCode: selectedDeptCode,
        courseCode: selectedCourseCode,
        section: sectionVal,
        batch: selectedBatch,
        submissions: 0,
        avgSimilarity: 0,
        flagged: 0,
        status: "active" as const,
      };

      setStudentsList((prev) => [newStudentEntry, ...prev]);
      setCreatedSuccess(true);
      toast.success("Student successfully enrolled in institutional dataset!");
      setTimeout(() => {
        setCreatedSuccess(false);
        setOpenAdd(false);
        setName("");
        setRoll("");
        setEmail("");
        setEmailManuallyEdited(false);
      }, 1000);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create student");
    } finally {
      setIsSubmitting(false);
    }
  };

  const departmentOptions = ["All departments", ...INSTITUTIONAL_DEPARTMENTS.map((d) => d.name)];
  const courseOptions = ["All courses", ...courses.map((c) => c.code)];
  const batchOptions = ["All batches", "Batch 1", "Batch 2", "Batch 3"];

  const filtered = studentsList.filter((s) => {
    if (departmentFilter !== "All departments") {
      const deptObj = INSTITUTIONAL_DEPARTMENTS.find((d) => d.name === departmentFilter);
      if (s.department !== departmentFilter && s.departmentCode !== deptObj?.code) {
        return false;
      }
    }
    if (courseFilter !== "All courses" && s.courseCode !== courseFilter) {
      return false;
    }
    if (batchFilter !== "All batches" && s.batch !== batchFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !s.name.toLowerCase().includes(q) &&
        !s.roll.toLowerCase().includes(q) &&
        !s.email.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <AppShell>
      <PageHeader
        title="Students Directory"
        subtitle="Institutional students roster organized by Department, Course Section, and Practical Batch."
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
            { label: "Active Departments", value: "5" },
            { label: "Practical Batches", value: "3 Per Section" },
            { label: "Mean Similarity", value: "11.2%" },
            { label: "Integrity Adherence", value: "98.6%", tone: "success" },
          ]}
        />
      </div>

      <div className="mt-5">
        <FilterBar>
          <SelectFilter
            label="Department"
            options={departmentOptions}
            value={departmentFilter}
            onChange={setDepartmentFilter}
          />
          <SelectFilter
            label="Course / Section"
            options={courseOptions}
            value={courseFilter}
            onChange={setCourseFilter}
          />
          <SelectFilter
            label="Batch"
            options={batchOptions}
            value={batchFilter}
            onChange={setBatchFilter}
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

      <TableShell className="mt-3" caption="Enrolled engineering students directory">
        <thead>
          <tr>
            <Th>Student</Th>
            <Th>Roll Number</Th>
            <Th>Email</Th>
            <Th>Department</Th>
            <Th>Section</Th>
            <Th>Batch</Th>
            <Th numeric>Submissions</Th>
            <Th numeric>Avg. Similarity</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <Tr>
              <Td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                No students found matching the selected filters.
              </Td>
            </Tr>
          ) : (
            filtered.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <Link
                    to="/students/$studentId"
                    params={{ studentId: s.id }}
                    className="font-medium text-foreground hover:text-brand hover:underline"
                  >
                    {s.name}
                  </Link>
                </Td>
                <Td className="num text-muted-foreground font-medium">{s.roll}</Td>
                <Td className="text-xs text-muted-foreground">{s.email}</Td>
                <Td className="text-xs text-foreground/90">
                  <span className="font-semibold text-brand mr-1">
                    {s.departmentCode || (s.courseCode.includes("-") ? s.courseCode.split("-")[0] : "EXCS")}
                  </span>
                  · {s.department || "Electronics & Computer Science"}
                </Td>
                <Td className="text-xs">
                  <span className="inline-block rounded-xs bg-muted px-2 py-0.5 font-medium text-foreground">
                    {s.courseCode} (Section {s.section || "B"})
                  </span>
                </Td>
                <Td className="text-xs">
                  <span className="inline-block rounded-xs bg-brand/10 px-2 py-0.5 font-semibold text-brand">
                    {s.batch || "Batch 3"}
                  </span>
                </Td>
                <Td numeric className="num text-xs">
                  {s.submissions}
                </Td>
                <Td numeric>
                  <SimilarityValue value={s.avgSimilarity} />
                </Td>
                <Td className="text-right">
                  <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-[12px]">
                    <Link to="/students/$studentId" params={{ studentId: s.id }}>
                      View Profile
                    </Link>
                  </Button>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </TableShell>

      {/* Add Student Modal */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>
              Register an engineering student using institutional formatting and assign Department, Section, and Batch.
            </DialogDescription>
          </DialogHeader>

          {createdSuccess ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="size-12 text-success" />
              <p className="mt-3 text-sm font-medium text-foreground">Student Registered Successfully</p>
              <p className="text-xs text-muted-foreground">Persisted to institutional database and student session roster.</p>
            </div>
          ) : (
            <form onSubmit={handleAddStudent} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground" htmlFor="student-name">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="student-name"
                  type="text"
                  required
                  placeholder="e.g. Aditya Gupta"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-8 w-full rounded-sm border border-input bg-background px-2.5 text-[12px] text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-foreground" htmlFor="student-roll">
                    Roll Number <span className="text-danger">*</span>
                  </label>
                  <input
                    id="student-roll"
                    type="text"
                    required
                    placeholder="e.g. 25108B0071"
                    value={roll}
                    onChange={(e) => setRoll(e.target.value)}
                    className="num h-8 w-full rounded-sm border border-input bg-background px-2.5 text-[12px] text-foreground focus:border-ring focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-foreground" htmlFor="student-email">
                    Institutional Email <span className="text-danger">*</span>
                  </label>
                  <input
                    id="student-email"
                    type="email"
                    required
                    placeholder="name.surname@vit.edu.in"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailManuallyEdited(true);
                    }}
                    className="h-8 w-full rounded-sm border border-input bg-background px-2.5 text-[12px] text-foreground focus:border-ring focus:outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground">Auto-generated as name.surname@vit.edu.in</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-foreground" htmlFor="student-dept">
                    Department <span className="text-danger">*</span>
                  </label>
                  <select
                    id="student-dept"
                    value={selectedDeptCode}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="h-8 w-full rounded-sm border border-input bg-background px-2 text-[12px] text-foreground focus:border-ring focus:outline-none"
                  >
                    {INSTITUTIONAL_DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-foreground" htmlFor="student-course">
                    Course / Section <span className="text-danger">*</span>
                  </label>
                  <select
                    id="student-course"
                    value={selectedCourseCode}
                    onChange={(e) => setSelectedCourseCode(e.target.value)}
                    className="h-8 w-full rounded-sm border border-input bg-background px-2 text-[12px] text-foreground focus:border-ring focus:outline-none"
                  >
                    {courses
                      .filter((c) => c.departmentCode === selectedDeptCode)
                      .map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-foreground" htmlFor="student-batch">
                    Batch <span className="text-danger">*</span>
                  </label>
                  <select
                    id="student-batch"
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="h-8 w-full rounded-sm border border-input bg-background px-2 text-[12px] text-foreground focus:border-ring focus:outline-none"
                  >
                    {DEFAULT_BATCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xs bg-muted/60 p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
                <UserCheck className="size-4 text-brand shrink-0" />
                <span>
                  Hierarchy: Department ({selectedDeptCode}) → Course ({selectedCourseCode}) → {selectedBatch}
                </span>
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
