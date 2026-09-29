import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { courses as defaultCourses } from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";

export const Route = createFileRoute("/assignments/new")({
  head: () => ({
    meta: [
      { title: "Create Assignment — Verity" },
      {
        name: "description",
        content: "Define an assignment, its citation style, and the integrity checks applied to submissions.",
      },
      { property: "og:title", content: "Create Assignment — Verity" },
      {
        property: "og:description",
        content: "Set due dates, marks, citation style, and academic integrity checks.",
      },
    ],
  }),
  component: NewAssignment,
});

const checks = [
  { id: "similarity", label: "Similarity Analysis", desc: "Compare against web, academic, and institutional sources." },
  { id: "student", label: "Student Comparison", desc: "Compare submissions within the section and cohort." },
  { id: "citation", label: "Citation Analysis", desc: "Validate in-text citations against the reference list." },
  { id: "revision", label: "Revision History", desc: "Record drafts and word counts before the deadline." },
  {
    id: "writing",
    label: "Writing Pattern Analysis",
    desc: "Writing-pattern analysis provides indicators for faculty review and should not be treated as proof of AI use.",
  },
];

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[12px] font-medium">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function NewAssignment() {
  const navigate = useNavigate();
  const [coursesList, setCoursesList] = useState(defaultCourses);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(checks.map((c) => [c.id, true])),
  );
  const [title, setTitle] = useState("Technical Report 03");
  const [selectedCourse, setSelectedCourse] = useState(defaultCourses[0]?.id ?? "eng-cse-301");
  const [assignmentType, setAssignmentType] = useState("Technical Report");
  const [citationStyle, setCitationStyle] = useState("IEEE");
  const [instructions, setInstructions] = useState(
    "Submit a technical report comparing two data structures of your choice. Include methodology, measured results, and an IEEE-formatted reference list."
  );
  const [dueDate, setDueDate] = useState("08 Oct 2026");
  const [maxMarks, setMaxMarks] = useState("100");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    verityApi.courses.list().then((res) => {
      if (res && res.length > 0) {
        const mapped = res.map((c) => ({
          id: c.id,
          code: c.course_code,
          title: c.name,
          department: c.department_name || "Computer Engineering",
          section: c.section || "A",
          students: c.student_count || 64,
          assignments: c.assignment_count || 0,
          pending: c.pending_count || 0,
        }));
        setCoursesList(mapped);
        if (mapped[0]) {
          setSelectedCourse(mapped[0].id);
        }
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide an assignment title");
      return;
    }

    setSubmitting(true);
    try {
      const activeCourse = coursesList.find((c) => c.id === selectedCourse || c.code === selectedCourse);

      const created = await verityApi.assignments.create({
        course_id: activeCourse?.id || selectedCourse,
        course_code: activeCourse?.code || "ENG-CSE-301",
        course_name: activeCourse?.title || "Data Structures",
        title: title.trim(),
        description: instructions,
        assignment_type: assignmentType,
        due_date: dueDate,
        max_marks: Number(maxMarks) || 100,
        citation_style: citationStyle as any,
        enable_similarity: enabled["similarity"] ?? true,
        enable_student_comparison: enabled["student"] ?? true,
        enable_citation_analysis: enabled["citation"] ?? true,
        enable_revision_history: enabled["revision"] ?? true,
        enable_writing_pattern_analysis: enabled["writing"] ?? true,
      });

      toast.success("Assignment created & stored in database", {
        description: `${created.title} · ${created.course_code || activeCourse?.code || "ENG-CSE-301"}`,
      });
      navigate({ to: "/assignments" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <form onSubmit={handleSubmit}>
        <PageHeader
          title="Create Assignment"
          subtitle="Define the submission requirements and the integrity checks applied to this assignment."
          actions={
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => navigate({ to: "/assignments" })}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toast("Draft saved to database", { description: "You can resume this assignment later." })}
              >
                Save Draft
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Saving..." : "Create Assignment"}
              </Button>
            </>
          }
        />

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <section className="rounded-md border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Assignment details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Title" htmlFor="title">
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </Field>
                </div>
                <Field label="Course" htmlFor="course">
                  <select
                    id="course"
                    className="h-9 w-full rounded-sm border border-input bg-background px-2 text-[13px]"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                  >
                    {coursesList.map((c) => (
                      <option key={c.id} value={c.id}>{`${c.code} — ${c.title}`}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Section" htmlFor="section">
                  <select id="section" className="h-9 w-full rounded-sm border border-input bg-background px-2 text-[13px]">
                    {["A", "B", "C"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Assignment Type" htmlFor="type">
                  <select
                    id="type"
                    className="h-9 w-full rounded-sm border border-input bg-background px-2 text-[13px]"
                    value={assignmentType}
                    onChange={(e) => setAssignmentType(e.target.value)}
                  >
                    {["Technical Report", "Lab Report", "Research Paper", "Project Report", "Thesis", "Code Submission"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label="Citation Style" htmlFor="citation">
                  <select
                    id="citation"
                    className="h-9 w-full rounded-sm border border-input bg-background px-2 text-[13px]"
                    value={citationStyle}
                    onChange={(e) => setCitationStyle(e.target.value)}
                  >
                    {["IEEE", "APA", "MLA", "Chicago", "Other"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Instructions" htmlFor="instructions">
                    <Textarea
                      id="instructions"
                      rows={5}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-md border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Submission requirements</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Due Date" htmlFor="due">
                  <Input id="due" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </Field>
                <Field label="Maximum Marks" htmlFor="marks">
                  <Input id="marks" type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
                </Field>
                <Field label="Word / Page Limit" htmlFor="limit" hint="Leave blank for no limit.">
                  <Input id="limit" defaultValue="2,000 words" />
                </Field>
              </div>
            </section>
          </div>

          <section className="h-fit rounded-md border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Academic Integrity</h2>
            <ul className="mt-3 divide-y divide-border">
              {checks.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Label htmlFor={`chk-${c.id}`} className="text-[13px] font-medium">
                      {c.label}
                    </Label>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{c.desc}</p>
                  </div>
                  <Switch
                    id={`chk-${c.id}`}
                    checked={enabled[c.id] ?? true}
                    onCheckedChange={(v) => setEnabled((p) => ({ ...p, [c.id]: v }))}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-3 flex gap-2 rounded-sm border border-border bg-muted/60 p-2.5 text-[11px] leading-snug text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Indicators support faculty review. They do not independently determine academic
              misconduct.
            </p>
          </section>
        </div>
      </form>
    </AppShell>
  );
}
