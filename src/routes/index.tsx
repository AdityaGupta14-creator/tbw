import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  FileText,
  GitCompare,
  History,
  MessageSquare,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Verity — Academic Integrity Platform for Engineering Education" },
      {
        name: "description",
        content:
          "Review technical reports, assignments, research papers, and project submissions with clear evidence for faculty review.",
      },
      { property: "og:title", content: "Verity — Academic Integrity Platform" },
      {
        property: "og:description",
        content:
          "Similarity analysis, source comparison, citation checks, and revision history for engineering faculty.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: FileText,
    title: "Similarity Analysis",
    body: "Percentage breakdown across web, academic, and institutional sources, with every matched passage traceable in the document.",
  },
  {
    icon: GitCompare,
    title: "Source Comparison",
    body: "Side-by-side viewer with synchronised scrolling for student submissions against a matched source.",
  },
  {
    icon: BookOpen,
    title: "Citation Analysis",
    body: "IEEE, APA, MLA, and Chicago checks for uncited references, missing in-text citations, and malformed entries.",
  },
  {
    icon: Users,
    title: "Student Comparison",
    body: "Identify substantial textual overlap between submissions within a section or across cohorts.",
  },
  {
    icon: History,
    title: "Revision History",
    body: "Draft-by-draft word counts and timestamps so faculty can see how a report developed.",
  },
  {
    icon: MessageSquare,
    title: "Faculty Feedback",
    body: "Inline comments, rubric scoring, and returned feedback in the same workspace as the analysis.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <div>
            <span className="text-[15px] font-semibold tracking-[0.18em] text-foreground">VERITY</span>
            <span className="ml-2 hidden border-l border-border pl-2 text-[11px] text-muted-foreground sm:inline">
              Academic Integrity Platform
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              to="/student"
              className="hidden rounded-sm px-2.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground sm:block"
            >
              Student Portal
            </Link>
            <Link
              to="/admin"
              className="hidden rounded-sm px-2.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground sm:block"
            >
              Institution
            </Link>
            <Button asChild size="sm">
              <Link to="/dashboard">Faculty Sign In</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-brand uppercase">
              For engineering colleges
            </p>
            <h1 className="mt-3 max-w-xl text-3xl leading-tight font-semibold text-foreground sm:text-4xl">
              Academic integrity analysis for engineering education.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Review technical reports, assignments, research papers, and project submissions with
              clear evidence for faculty review.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Button asChild>
                <Link to="/dashboard">Get Started</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/submissions/$submissionId" params={{ submissionId: "SUB-2026-09124" }}>
                  View Demo
                </Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                ["426", "Submissions this term"],
                ["18", "Active assignments"],
                ["5", "Departments"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd>
                    <span className="num block text-xl font-semibold text-foreground">{v}</span>
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">{l}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-md border border-border bg-background p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-2 text-[12px]">
              <span className="num text-muted-foreground">22CSE057 · Technical Report 02</span>
              <span className="rounded-sm border border-warning/30 bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                Requires Review
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 border-b border-border pb-3">
              {[
                ["Similarity", "27%"],
                ["Sources", "6"],
                ["Citation issues", "2"],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{l}</p>
                  <p className="num mt-0.5 text-base font-semibold text-foreground">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2 text-[12px] leading-relaxed text-foreground">
              <p className="font-medium">1. Introduction</p>
              <p>
                Balanced search trees provide an efficient method for maintaining ordered collections
                under dynamic insertion and deletion.
              </p>
              <p>
                <mark className="bg-highlight-match px-0.5 text-foreground">
                  A binary search tree degrades to linear search behaviour when keys arrive in sorted
                  order. Self-balancing variants restore logarithmic height by performing local
                  rotations after each structural modification.
                </mark>
              </p>
              <p className="num border-t border-border pt-2 text-[11px] text-muted-foreground">
                Matched: example.edu · 8.4% · 42 words
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-lg font-semibold text-foreground">Evidence-based review, end to end</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Every indicator links back to the passage, source, or draft it came from, so faculty can
          make their own judgement on the complete submission.
        </p>
        <div className="mt-7 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-card p-5">
              <f.icon className="size-4.5 text-brand" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-card px-5 py-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-0.5 size-4.5 text-brand" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Engineering-focused workflows</h3>
              <p className="mt-1 max-w-xl text-[13px] text-muted-foreground">
                Lab reports, technical reports, project reports, theses, and code submissions —
                organised by department, course, and section.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/courses">Browse courses</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-6 text-[12px] text-muted-foreground">
          <p>
            Verity reports provide analytical indicators and supporting evidence for faculty review.
            They do not independently determine academic misconduct.
          </p>
          <p className="mt-2">© 2026 ABC Institute of Technology · Demonstration data is fictional.</p>
        </div>
      </footer>
    </div>
  );
}
