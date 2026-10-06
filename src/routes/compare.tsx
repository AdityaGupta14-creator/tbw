import { useState, useRef, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  GitCompare,
  Info,
  Lock,
  RotateCcw,
  Unlock,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { submissions, courses, matchedSources, students as mockStudents } from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";
import type { ComparisonResult } from "@/lib/backend/similarity-engine";
import { compareTwoDocuments } from "@/lib/backend/similarity-engine";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Document Comparison — Verity" },
      {
        name: "description",
        content: "Synchronized dual-column document comparison for student-to-student, source, and draft diff analysis.",
      },
      { property: "og:title", content: "Document Comparison — Verity" },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const [mode, setMode] = useState<"student-source" | "student-student" | "draft-final">("student-student");
  const [syncScroll, setSyncScroll] = useState(true);

  const initialStudents = mockStudents.map(s => ({
    id: s.id,
    name: s.name,
    roll: s.roll,
    dept: s.courseCode
  }));

  const [studentOptions, setStudentOptions] = useState<{ id: string; name: string; roll: string; dept: string }[]>(initialStudents);
  const [studentA, setStudentA] = useState(initialStudents[0]?.id || "");
  const [studentB, setStudentB] = useState(initialStudents[1]?.id || "");
  
  const [selectedSource, setSelectedSource] = useState(matchedSources[0]?.id ?? "src-01");
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  useEffect(() => {
    verityApi.students.list().then((list) => {
      if (list && list.length > 0) {
        setStudentOptions(
          list.map((s) => ({
            id: s.id,
            name: s.full_name,
            roll: s.roll_number || "22CSE",
            dept: s.department_name || "ENG-CSE-301",
          }))
        );
      }
    });
  }, []);

  // Synchronized scroll refs
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (mode === "student-student") {
      verityApi.compare.compareStudents(studentA, studentB).then((res) => {
        if (isMounted) setComparisonResult(res);
      });
    } else if (mode === "student-source") {
      const sourceObj = matchedSources.find((s) => s.id === selectedSource);
      const textStudent = "Ohm's law states that the current through a conductor between two points is directly proportional to the voltage across the two points. Introducing the constant of proportionality, the resistance, one arrives at the usual mathematical equation that describes this relationship: I = V/R. This experiment verifies Ohm's law using a standard resistor network and precision multimeters.";
      const textSource = "Ohm's law states that the current through a conductor between two points is directly proportional to the voltage across the two points. Introducing the constant of proportionality, the resistance, one arrives at the usual mathematical equation that describes this relationship: I = V/R.";
      const res = compareTwoDocuments(textStudent, textSource, sourceObj?.title || "External Source", "web");
      if (isMounted) setComparisonResult(res);
    } else {
      const textDraft = "Ohm's law states that the current is proportional to the voltage. The mathematical equation that describes this relationship is I = V/R. This experiment verifies it.";
      const textFinal = "Ohm's law states that the current through a conductor between two points is directly proportional to the voltage across the two points. The mathematical equation that describes this relationship is I = V/R. This experiment verifies it using a standard resistor network.";
      const res = compareTwoDocuments(textDraft, textFinal, "Draft Milestone", "internal_document");
      if (isMounted) setComparisonResult(res);
    }

    return () => {
      isMounted = false;
    };
  }, [mode, studentA, studentB, selectedSource]);

  const handleLeftScroll = () => {
    if (!syncScroll || isSyncingLeft.current) return;
    isSyncingRight.current = true;
    if (rightRef.current && leftRef.current) {
      rightRef.current.scrollTop = leftRef.current.scrollTop;
    }
    setTimeout(() => {
      isSyncingRight.current = false;
    }, 50);
  };

  const handleRightScroll = () => {
    if (!syncScroll || isSyncingRight.current) return;
    isSyncingLeft.current = true;
    if (leftRef.current && rightRef.current) {
      leftRef.current.scrollTop = rightRef.current.scrollTop;
    }
    setTimeout(() => {
      isSyncingLeft.current = false;
    }, 50);
  };

  return (
    <AppShell>
      <PageHeader
        title="Document Comparison"
        subtitle="Side-by-side textual diff with synchronized scrolling and overlap highlighting."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-[12px]"
              onClick={() => setSyncScroll(!syncScroll)}
            >
              {syncScroll ? (
                <>
                  <Lock className="mr-1.5 size-3.5 text-brand" /> Sync Scroll ON
                </>
              ) : (
                <>
                  <Unlock className="mr-1.5 size-3.5 text-muted-foreground" /> Sync Scroll OFF
                </>
              )}
            </Button>
            <Button asChild size="sm" variant="outline" className="text-[12px]">
              <Link to="/submissions">Back to Submissions</Link>
            </Button>
          </div>
        }
      />

      {/* Mode Selection Tabs */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-auto">
          <TabsList className="h-8 bg-muted/70 p-0.5 text-[12px]">
            <TabsTrigger value="student-student" className="rounded-xs text-[12px]">
              Student vs Student
            </TabsTrigger>
            <TabsTrigger value="student-source" className="rounded-xs text-[12px]">
              Student vs Matched Source
            </TabsTrigger>
            <TabsTrigger value="draft-final" className="rounded-xs text-[12px]">
              Draft vs Final Submission
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-amber-200 border border-amber-400" />
            Matching Overlap
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-green-100 border border-green-400" />
            Added Text
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-red-100 border border-red-400" />
            Removed / Replaced
          </span>
        </div>
      </div>

      {/* Comparison Statistics Bar */}
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-border bg-card p-3 sm:grid-cols-4">
        <div className="border-r border-border pr-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Shared Overlap
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="num text-2xl font-bold text-danger">
              {comparisonResult ? `${comparisonResult.overallOverlap}%` : "31%"}
            </span>
            <span className="text-[11px] text-muted-foreground">Unique overlap</span>
          </div>
        </div>

        <div className="border-r border-border px-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Matched Words
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="num text-2xl font-semibold text-foreground">
              {comparisonResult ? comparisonResult.matchedWords : "182"}
            </span>
            <span className="text-[11px] text-muted-foreground">Non-redundant</span>
          </div>
        </div>

        <div className="border-r border-border px-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Sections Affected
          </span>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="num text-2xl font-semibold text-foreground">
              {comparisonResult ? comparisonResult.sectionsAffected : "4"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {comparisonResult?.passages?.length ? `${comparisonResult.passages.length} passages` : "Methodology, Results"}
            </span>
          </div>
        </div>

        <div className="pl-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Analytical Assessment
          </span>
          <p className="mt-1 text-[12px] font-medium text-warning-foreground leading-snug">
            {comparisonResult?.evidenceSummary && comparisonResult.evidenceSummary.length > 0
              ? comparisonResult.evidenceSummary.slice(0, 2).join(". ")
              : "Substantial textual overlap detected between student pair."}
          </p>
        </div>
      </div>

      {/* Multi-Layer Evidence Signals Bar */}
      {comparisonResult?.evidenceBreakdown && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-[11px]">
          <span className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
            Evidence Signals:
          </span>
          <span className="rounded-xs bg-red-100 px-2 py-0.5 font-medium text-red-800 border border-red-200">
            Strong Verbatim: {comparisonResult.evidenceBreakdown.strong_percentage}%
          </span>
          <span className="rounded-xs bg-amber-100 px-2 py-0.5 font-medium text-amber-800 border border-amber-200">
            Moderate Lexical: {comparisonResult.evidenceBreakdown.moderate_percentage}%
          </span>
          <span className="rounded-xs bg-blue-100 px-2 py-0.5 font-medium text-blue-800 border border-blue-200">
            Semantic Paraphrase: {comparisonResult.evidenceBreakdown.semantic_percentage}%
          </span>
          <span className="rounded-xs bg-muted px-2 py-0.5 font-medium text-muted-foreground border border-border">
            Structural Alignment: {comparisonResult.structuralSimilarity || 65}%
          </span>
        </div>
      )}

      {/* Selectors Bar */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            {mode === "draft-final" ? "Earlier Milestone:" : "Student Submission:"}
          </span>
          {mode === "draft-final" ? (
            <span className="text-[12px] font-semibold text-foreground">Version 1 (18 Sep 2026 · 1,284 words)</span>
          ) : (
            <select
              value={studentA}
              onChange={(e) => setStudentA(e.target.value)}
              className="h-8 rounded-sm border border-input bg-card px-2.5 text-[12px] font-medium text-foreground"
            >
              {studentOptions.map((s) => (
                <option key={s.id} value={s.roll || s.id}>
                  {s.name} ({s.roll || "ID"} · {s.dept})
                </option>
              ))}
            </select>
          )}
        </div>

        <ArrowRightLeft className="size-4 text-muted-foreground hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Comparing Against:</span>
          {mode === "student-student" ? (
            <select
              value={studentB}
              onChange={(e) => setStudentB(e.target.value)}
              className="h-8 rounded-sm border border-input bg-card px-2.5 text-[12px] font-medium text-foreground"
            >
              {studentOptions.map((s) => (
                <option key={s.id} value={s.roll || s.id}>
                  {s.name} ({s.roll || "ID"} · {s.dept})
                </option>
              ))}
            </select>
          ) : mode === "student-source" ? (
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="h-8 rounded-sm border border-input bg-card px-2.5 text-[12px] font-medium text-foreground"
            >
              {matchedSources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.domain} · {s.contribution}%)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-[12px] font-semibold text-foreground">Final Copy (21 Sep 2026 · 1,638 words)</span>
          )}
        </div>
      </div>

      {/* Dual Column Document Comparison View */}
      <div className="mt-3.5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Column: Student Submission A */}
        <div className="rounded-md border border-border bg-card shadow-xs">
          <div className="border-b border-border bg-muted/50 px-4 py-2.5 flex items-center justify-between">
            <div>
              <span className="num font-bold text-foreground">
                {mode === "draft-final" ? "Version 1 Draft (18 Sep)" : `${studentOptions.find(s => s.roll === studentA || s.id === studentA)?.name || "Target Student"} · ${studentA}`}
              </span>
              <p className="text-[11px] text-muted-foreground">Electrical Assignment 01 · Section A</p>
            </div>
            <span className="rounded-xs bg-card px-2 py-0.5 text-[11px] font-semibold border border-border">
              {mode === "draft-final" ? "1,284 words" : "Target Document"}
            </span>
          </div>

          <div
            ref={leftRef}
            onScroll={handleLeftScroll}
            className="h-[620px] overflow-y-auto p-5 text-[13px] leading-relaxed space-y-4"
          >
            <div>
              <h4 className="font-bold text-foreground mb-1 text-[13px]">1. Introduction</h4>
              <p className="text-muted-foreground">
                Electrical circuit analysis provides an efficient method for determining voltages and currents under dynamic configurations.
              </p>
            </div>

            <div className="rounded-sm bg-amber-50/80 p-2.5 border-l-4 border-amber-500">
              <span className="num text-[10px] font-bold uppercase text-amber-800 tracking-wider block mb-1">
                Matching Passage #1 · 42 Overlapping Words
              </span>
              <p className="text-foreground">
                <mark className="bg-amber-200/70 text-foreground px-0.5">
                  Ohm's law states that the current through a conductor between two points is directly proportional to the voltage across the two points. Introducing the constant of proportionality, the resistance, one arrives at the usual mathematical equation that describes this relationship: I = V/R.
                </mark>
              </p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-1 text-[13px]">2. Methodology</h4>
              <p className="text-muted-foreground">
                The circuits were constructed using standard breadboards with identical resistor components. Measurements were taken ten times on an isolated bench; the reported figures are medians. Components were drawn from three ranges: uniform resistors, variable potentiometers, and a set of inductors.
              </p>
            </div>

            <div className="rounded-sm bg-amber-50/80 p-2.5 border-l-4 border-amber-500">
              <span className="num text-[10px] font-bold uppercase text-amber-800 tracking-wider block mb-1">
                Matching Passage #2 · 31 Overlapping Words
              </span>
              <p className="text-foreground">
                <mark className="bg-amber-200/70 text-foreground px-0.5">
                  Voltage drops were instrumented directly across the parallel branches. Current was sampled after every 10 adjustments. Resistance was calculated with a precision multimeter over batches of 100 randomly selected nodes.
                </mark>
              </p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-1 text-[13px]">3. Results</h4>
              <p className="text-muted-foreground">
                For uniform circuits, Nodal analysis maintained a faster solution time against Mesh analysis. The stricter Kirchhoff's Current Law criterion produced roughly 38% more equations during setup.
              </p>
            </div>

            <div className="rounded-sm bg-amber-50/80 p-2.5 border-l-4 border-amber-500">
              <span className="num text-[10px] font-bold uppercase text-amber-800 tracking-wider block mb-1">
                Matching Passage #3 · 28 Overlapping Words
              </span>
              <p className="text-foreground">
                <mark className="bg-amber-200/70 text-foreground px-0.5">
                  Under complex interconnected topologies the difference widened. Nodal methods completed the calculation phase 14% faster owing to fewer unknown variables, while Mesh methods retained a simpler formulation.
                </mark>
              </p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-1 text-[13px]">4. Discussion</h4>
              <p className="text-muted-foreground">
                The results support the conventional guidance that Nodal analysis is preferable for node-dominated circuits while Mesh analysis suits planar networks.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Comparison Document */}
        <div className="rounded-md border border-border bg-card shadow-xs">
          <div className="border-b border-border bg-muted/50 px-4 py-2.5 flex items-center justify-between">
            <div>
              <span className="num font-bold text-foreground">
                {mode === "student-student"
                  ? `${studentOptions.find(s => s.roll === studentB || s.id === studentB)?.name || "Comparison Student"} · ${studentB}`
                  : mode === "student-source"
                  ? "Course Notes (physics.edu)"
                  : "Final Submission (21 Sep)"}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {mode === "student-student"
                  ? "Electrical Assignment 01 · Section A"
                  : mode === "student-source"
                  ? "External Reference Library"
                  : "Final Evaluated Milestone"}
              </p>
            </div>
            <span className="rounded-xs bg-card px-2 py-0.5 text-[11px] font-semibold border border-border">
              {mode === "draft-final" ? "1,638 words" : "Comparison Reference"}
            </span>
          </div>

          <div
            ref={rightRef}
            onScroll={handleRightScroll}
            className="h-[620px] overflow-y-auto p-5 text-[13px] leading-relaxed space-y-4"
          >
            <div>
              <h4 className="font-bold text-foreground mb-1 text-[13px]">1. Introduction</h4>
              <p className="text-muted-foreground">
                Electrical circuit analysis represents a core engineering mechanism for keeping electrical data accessible within specified limits.
              </p>
            </div>

            <div className="rounded-sm bg-amber-50/80 p-2.5 border-l-4 border-amber-500">
              <span className="num text-[10px] font-bold uppercase text-amber-800 tracking-wider block mb-1">
                Matching Passage #1 · Shared Sequence
              </span>
              <p className="text-foreground">
                <mark className="bg-amber-200/70 text-foreground px-0.5">
                  Ohm's law states that the current through a conductor between two points is directly proportional to the voltage across the two points. Introducing the constant of proportionality, the resistance, one arrives at the usual mathematical equation that describes this relationship: I = V/R.
                </mark>
              </p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-1 text-[13px]">2. Methodology</h4>
              <p className="text-muted-foreground">
                Experiments were created in labs with equal multimeter calibrations and conducted using identical voltage sources. All execution trials ran on single breadboard layouts.
              </p>
            </div>

            <div className="rounded-sm bg-amber-50/80 p-2.5 border-l-4 border-amber-500">
              <span className="num text-[10px] font-bold uppercase text-amber-800 tracking-wider block mb-1">
                Matching Passage #2 · Shared Sequence
              </span>
              <p className="text-foreground">
                <mark className="bg-amber-200/70 text-foreground px-0.5">
                  Voltage drops were instrumented directly across the parallel branches. Current was sampled after every 10 adjustments. Resistance was calculated with a precision multimeter over batches of 100 randomly selected nodes.
                </mark>
              </p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-1 text-[13px]">3. Results</h4>
              <p className="text-muted-foreground">
                Under randomized input sequences, Nodal methods yielded 1.19 V against 1.34 V for the Mesh structure.
              </p>
            </div>

            <div className="rounded-sm bg-amber-50/80 p-2.5 border-l-4 border-amber-500">
              <span className="num text-[10px] font-bold uppercase text-amber-800 tracking-wider block mb-1">
                Matching Passage #3 · Shared Sequence
              </span>
              <p className="text-foreground">
                <mark className="bg-amber-200/70 text-foreground px-0.5">
                  Under complex interconnected topologies the difference widened. Nodal methods completed the calculation phase 14% faster owing to fewer unknown variables, while Mesh methods retained a simpler formulation.
                </mark>
              </p>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-1 text-[13px]">4. Discussion</h4>
              <p className="text-muted-foreground">
                Experimental results validate theoretical predictions: Nodal models yield superior analysis speed while Mesh models outperform when node volume dominates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
