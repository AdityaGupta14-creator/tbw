import { useState } from "react";
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
import { courses } from "@/lib/mock-data";

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
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(checks.map((c) => [c.id, true])),
  );

  return (
    <AppShell>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.success("Assignment created", { description: "Technical Report 03 · ENG-CSE-301" });
          navigate({ to: "/assignments" });
        }}
      >
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
                onClick={() => toast("Draft saved", { description: "You can resume this assignment later." })}
              >
                Save Draft
              </Button>
              <Button type="submit" size="sm">
                Create Assignment
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
                    <Input id="title" defaultValue="Technical Report 03" required />
                  </Field>
                </div>
                <Field label="Course" htmlFor="course">
                  <select
                    id="course"
                    className="h-9 w-full rounded-sm border border-input bg-background px-2 text-[13px]"
                    defaultValue={courses[0]?.code ?? ""}
                  >
                    {courses.map((c) => (
                      <option key={c.id}>{`${c.code} — ${c.title}`}</option>
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
                  <select id="type" className="h-9 w-full rounded-sm border border-input bg-background px-2 text-[13px]">
                    {["Technical Report", "Lab Report", "Research Paper", "Project Report", "Thesis", "Code Submission"].map(
                      (t) => (
                        <option key={t}>{t}</option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label="Citation Style" htmlFor="citation">
                  <select id="citation" className="h-9 w-full rounded-sm border border-input bg-background px-2 text-[13px]">
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
                      defaultValue="Submit a technical report comparing two data structures of your choice. Include methodology, measured results, and an IEEE-formatted reference list."
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-md border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Submission requirements</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Due Date" htmlFor="due">
                  <Input id="due" type="date" defaultValue="2026-10-08" />
                </Field>
                <Field label="Maximum Marks" htmlFor="marks">
                  <Input id="marks" type="number" defaultValue={100} />
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
