import { useState, useRef, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  GitCompare,
  HelpCircle,
  Info,
  Lock,
  RotateCcw,
  Unlock,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { verityApi } from "@/services/verity-api";
import type { ComparisonResult } from "@/lib/backend/similarity-engine";
import { compareTwoDocuments } from "@/lib/backend/similarity-engine";
import type { Assignment, Profile, Submission } from "@/types/database";

export const Route = createFileRoute("/compare")({
  loader: async () => {
    try {
      const [studentList, assignmentList, submissionList] = await Promise.all([
        verityApi.students.list(),
        verityApi.assignments.list(),
        verityApi.submissions.list(),
      ]);
      return {
        initialStudents: (studentList || []).map((s) => ({
          id: s.id,
          name: s.full_name,
          roll: s.roll_number || "Roll",
          dept: s.department_name || "Engineering",
        })),
        initialAssignments: assignmentList || [],
        initialSubmissions: submissionList || [],
      };
    } catch {
      return {
        initialStudents: [],
        initialAssignments: [],
        initialSubmissions: [],
      };
    }
  },
  head: () => ({
    meta: [
      { title: "Source Matching & Document Comparison — Verity" },
      {
        name: "description",
        content: "Peer-to-peer student document comparison, source matching, and textual overlap analysis based on actual uploaded coursework.",
      },
      { property: "og:title", content: "Source Matching — Verity" },
    ],
  }),
  component: ComparePage,
});

interface StudentOption {
  id: string;
  name: string;
  roll: string;
  dept: string;
}

function HighlightedDocumentView({
  text,
  passages,
  isLeft,
}: {
  text: string;
  passages: any[];
  isLeft: boolean;
}) {
  if (!text || text.trim().length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <FileText className="size-10 opacity-30 mb-2" />
        <p className="text-xs font-medium">No document text available for this submission.</p>
      </div>
    );
  }

  // If there are no overlapping passages detected
  if (!passages || passages.length === 0) {
    const paragraphs = text.split(/\r?\n\r?\n/).filter(Boolean);
    return (
      <div className="space-y-3.5 text-[13px] leading-relaxed">
        {paragraphs.map((p, idx) => (
          <p key={idx} className="text-foreground whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>
    );
  }

  // Break text into paragraphs and annotate matching passages
  const paragraphs = text.split(/\r?\n\r?\n/).filter(Boolean);

  return (
    <div className="space-y-4 text-[13px] leading-relaxed">
      {paragraphs.map((para, pIdx) => {
        // Check if any passage belongs to or overlaps this paragraph
        const matchingPassages = passages.filter((p) => {
          const passageText = isLeft ? p.student_text : p.source_text;
          if (!passageText) return false;
          const cleanP = passageText.trim().toLowerCase();
          const cleanPara = para.trim().toLowerCase();
          return cleanPara.includes(cleanP) || cleanP.includes(cleanPara) || para.includes(passageText.slice(0, 30));
        });

        if (matchingPassages.length > 0) {
          const bestPassage = matchingPassages[0];
          const passageIndex = passages.indexOf(bestPassage) + 1;
          return (
            <div
              key={pIdx}
              className="rounded-lg bg-amber-50/90 dark:bg-amber-950/40 p-3.5 border-l-4 border-amber-500 shadow-2xs space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Matching Passage #{passageIndex} · {bestPassage.matched_words} Matched Words
                </span>
                <span className="rounded-xs bg-amber-200/80 dark:bg-amber-800/80 px-1.5 py-0.5 text-[9px] font-semibold text-amber-900 dark:text-amber-100">
                  {bestPassage.similarity_percentage}% Overlap ({bestPassage.evidence_level})
                </span>
              </div>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                <mark className="bg-amber-200/80 dark:bg-amber-800/60 text-foreground px-1 py-0.5 rounded-xs">
                  {para}
                </mark>
              </p>
            </div>
          );
        }

        return (
          <p key={pIdx} className="text-foreground whitespace-pre-wrap">
            {para}
          </p>
        );
      })}
    </div>
  );
}

function ComparePage() {
  const loaderData = Route.useLoaderData();
  const [mode, setMode] = useState<"student-student" | "student-source" | "draft-final">("student-student");
  const [syncScroll, setSyncScroll] = useState(true);

  const [students, setStudents] = useState<StudentOption[]>(loaderData.initialStudents || []);
  const [assignments, setAssignments] = useState<Assignment[]>(loaderData.initialAssignments || []);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>(loaderData.initialSubmissions || []);

  // Compute intelligent defaults from loaderData
  const initialDefaultData = useMemo(() => {
    const opts = loaderData.initialStudents || [];
    const asgs = loaderData.initialAssignments || [];
    const subs = loaderData.initialSubmissions || [];

    let defAsg = asgs[0]?.id || "";
    let defA = opts[0]?.id || "";
    let defB = opts[1]?.id || "";

    for (const a of asgs) {
      const matchingSubs = subs.filter(
        (s) =>
          (s.assignment_id && s.assignment_id.toLowerCase() === a.id.toLowerCase()) ||
          (s.assignment_title && s.assignment_title.toLowerCase() === (a.title || "").toLowerCase())
      );
      if (matchingSubs.length >= 2) {
        defAsg = a.id;
        const s1 = opts.find(
          (o) =>
            o.id === matchingSubs[0].student_id ||
            o.roll.toLowerCase() === (matchingSubs[0].student_roll || "").toLowerCase()
        );
        const s2 = opts.find(
          (o) =>
            o.id === matchingSubs[1].student_id ||
            o.roll.toLowerCase() === (matchingSubs[1].student_roll || "").toLowerCase()
        );
        if (s1) defA = s1.id;
        if (s2) defB = s2.id;
        break;
      }
    }
    return { defAsg, defA, defB };
  }, [loaderData]);

  // Selected students
  const [studentAId, setStudentAId] = useState<string>(initialDefaultData.defA);
  const [studentBId, setStudentBId] = useState<string>(initialDefaultData.defB);

  // Selected assignment
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(initialDefaultData.defAsg);

  // Comparison & loaded submissions state
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [submissionA, setSubmissionA] = useState<Submission | null>(null);
  const [submissionB, setSubmissionB] = useState<Submission | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);

  // Synchronized scroll refs
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  // Sync state if loaderData updates or fresh records are loaded
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      verityApi.students.list(),
      verityApi.assignments.list(),
      verityApi.submissions.list(),
    ]).then(([studentList, assignmentList, submissionList]) => {
      if (!isMounted) return;

      const opts: StudentOption[] = (studentList || []).map((s) => ({
        id: s.id,
        name: s.full_name,
        roll: s.roll_number || "Roll",
        dept: s.department_name || "Engineering",
      }));
      setStudents(opts);

      const asgs = assignmentList || [];
      setAssignments(asgs);

      const subs = submissionList || [];
      setAllSubmissions(subs);

      // Default selection if not yet set
      setStudentAId((prev) => prev || opts[0]?.id || "");
      setStudentBId((prev) => prev || opts[1]?.id || "");
      setSelectedAssignmentId((prev) => prev || asgs[0]?.id || "");
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute submission status per assignment for current Student A and Student B
  const studentAObj = students.find((s) => s.id === studentAId);
  const studentBObj = students.find((s) => s.id === studentBId);

  const assignmentStatusList = useMemo(() => {
    return assignments.map((asg) => {
      const asgTitle = (asg.title || "").toLowerCase();
      const asgId = (asg.id || "").toLowerCase();

      const subA = allSubmissions.find((s) => {
        const matchesAsg =
          (s.assignment_id && s.assignment_id.toLowerCase() === asgId) ||
          (s.assignment_title && s.assignment_title.toLowerCase() === asgTitle);
        const matchesStudent =
          (s.student_id && s.student_id === studentAId) ||
          (studentAObj?.roll && s.student_roll?.toLowerCase() === studentAObj.roll.toLowerCase());
        return matchesAsg && matchesStudent;
      });

      const subB = allSubmissions.find((s) => {
        const matchesAsg =
          (s.assignment_id && s.assignment_id.toLowerCase() === asgId) ||
          (s.assignment_title && s.assignment_title.toLowerCase() === asgTitle);
        const matchesStudent =
          (s.student_id && s.student_id === studentBId) ||
          (studentBObj?.roll && s.student_roll?.toLowerCase() === studentBObj.roll.toLowerCase());
        return matchesAsg && matchesStudent;
      });

      const bothSubmitted = Boolean(subA && subB);
      const oneSubmitted = Boolean((subA && !subB) || (!subA && subB));

      return {
        assignment: asg,
        subA,
        subB,
        bothSubmitted,
        oneSubmitted,
      };
    });
  }, [assignments, allSubmissions, studentAId, studentBId, studentAObj, studentBObj]);

  // Run real comparison whenever Student A, Student B, or selected assignment changes
  useEffect(() => {
    let isMounted = true;

    if (mode === "student-student") {
      if (!studentAId || !studentBId || !selectedAssignmentId) {
        setComparisonResult(null);
        setSubmissionA(null);
        setSubmissionB(null);
        return;
      }

      setIsLoadingComparison(true);
      const chosenAsg = assignments.find((a) => a.id === selectedAssignmentId);
      const asgQuery = chosenAsg?.title || selectedAssignmentId;

      verityApi.compare
        .compareStudents(studentAObj?.roll || studentAId, studentBObj?.roll || studentBId, asgQuery)
        .then((res) => {
          if (!isMounted) return;
          setComparisonResult(res.comparison);
          setSubmissionA(res.submissionA || null);
          setSubmissionB(res.submissionB || null);
          setIsLoadingComparison(false);
        })
        .catch((err) => {
          console.error("Comparison run error:", err);
          if (isMounted) setIsLoadingComparison(false);
        });
    } else if (mode === "student-source") {
      // Comparison against reference corpus/web
      if (!studentAId) return;
      setIsLoadingComparison(true);
      const chosenAsg = assignments.find((a) => a.id === selectedAssignmentId);
      const asgQuery = chosenAsg?.title || selectedAssignmentId;

      verityApi.submissions.getByStudentAndAssignment(studentAObj?.roll || studentAId, asgQuery).then((sub) => {
        if (!isMounted) return;
        setSubmissionA(sub || null);
        const studentText = sub?.document?.extracted_text || "";
        const referenceText =
          "Peer repository indexing verifies documents against university archives and IEEE publication libraries to detect verbatim replication.";
        const res = compareTwoDocuments(studentText, referenceText, "Academic Source Repository", "academic");
        setComparisonResult(res);
        setIsLoadingComparison(false);
      });
    } else {
      // Draft vs Final comparison for student A
      if (!studentAId) return;
      setIsLoadingComparison(true);
      const chosenAsg = assignments.find((a) => a.id === selectedAssignmentId);
      const asgQuery = chosenAsg?.title || selectedAssignmentId;

      verityApi.submissions.getByStudentAndAssignment(studentAObj?.roll || studentAId, asgQuery).then((sub) => {
        if (!isMounted) return;
        setSubmissionA(sub || null);
        const finalText = sub?.document?.extracted_text || "";
        const draftText = finalText.slice(0, Math.round(finalText.length * 0.7));
        const res = compareTwoDocuments(draftText, finalText, "Final Submission Version", "internal_document");
        setComparisonResult(res);
        setIsLoadingComparison(false);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [mode, studentAId, studentBId, selectedAssignmentId, studentAObj, studentBObj, assignments]);

  const handleSwapStudents = () => {
    const temp = studentAId;
    setStudentAId(studentBId);
    setStudentBId(temp);
  };

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

  const currentSelectedAsg = assignments.find((a) => a.id === selectedAssignmentId);
  const textA = submissionA?.document?.extracted_text || "";
  const textB = submissionB?.document?.extracted_text || "";
  const hasBothUploaded = Boolean(textA.trim() && textB.trim());

  return (
    <AppShell>
      <PageHeader
        title="Source Matching & Peer Comparison"
        subtitle="Side-by-side textual diff comparing actual coursework documents uploaded by engineering students."
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
              Student vs Student (Peer Matching)
            </TabsTrigger>
            <TabsTrigger value="student-source" className="rounded-xs text-[12px]">
              Student vs Institutional Archive
            </TabsTrigger>
            <TabsTrigger value="draft-final" className="rounded-xs text-[12px]">
              Draft Milestone vs Final
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-amber-200 border border-amber-400" />
            Verified Matching Overlap
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-red-100 border border-red-300" />
            Verbatim Phrase Alignment
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-xs bg-muted border border-border" />
            Original Unmatched Prose
          </span>
        </div>
      </div>

      {/* STEP 1: Choose Two Students for Comparison */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-brand" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
              Step 1: Choose Two Students for Comparison
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {students.length} enrolled student profiles available
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] items-center">
          {/* Student 1 Selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              First Student (Target):
            </label>
            <select
              value={studentAId}
              onChange={(e) => setStudentAId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus:ring-1 focus:ring-brand"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.roll}) · {s.dept}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center pt-5 sm:pt-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 rounded-full border-border hover:border-brand/40"
              onClick={handleSwapStudents}
              title="Swap Students"
            >
              <ArrowRightLeft className="size-3.5 text-muted-foreground" />
            </Button>
          </div>

          {/* Student 2 Selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Second Student (Comparing Against):
            </label>
            <select
              value={studentBId}
              onChange={(e) => setStudentBId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus:ring-1 focus:ring-brand"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.roll}) · {s.dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* STEP 2: Which Assignment to Compare? */}
      <div className="mt-3.5 rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-brand" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
              Step 2: Which Assignment Would You Like to Compare?
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Select an assignment to load both students' uploaded documents
          </span>
        </div>

        {assignments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No assignments found in system.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {assignmentStatusList.map(({ assignment, subA, subB, bothSubmitted, oneSubmitted }) => {
              const isSelected = assignment.id === selectedAssignmentId;
              return (
                <button
                  key={assignment.id}
                  type="button"
                  onClick={() => setSelectedAssignmentId(assignment.id)}
                  className={`text-left p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? "border-brand bg-brand-soft/40 ring-1 ring-brand/40 shadow-xs"
                      : "border-border/80 bg-background hover:bg-muted/40 hover:border-input"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-foreground">
                        {assignment.title}
                      </span>
                      {bothSubmitted ? (
                        <span className="rounded-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                          ✓ Both Submitted
                        </span>
                      ) : oneSubmitted ? (
                        <span className="rounded-xs bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 text-[10px] font-semibold">
                          1 / 2 Submitted
                        </span>
                      ) : (
                        <span className="rounded-xs bg-muted text-muted-foreground border border-border px-1.5 py-0.5 text-[10px]">
                          0 Submissions
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {assignment.subject || assignment.course_code || "Coursework Assignment"}
                    </p>
                  </div>

                  <div className="text-[10px] text-muted-foreground border-t border-border/50 pt-1.5 flex items-center justify-between">
                    <span>
                      {studentAObj?.name?.split(" ")[0]}: {subA ? "✓ Uploaded" : "—"}
                    </span>
                    <span>
                      {studentBObj?.name?.split(" ")[0]}: {subB ? "✓ Uploaded" : "—"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* STEP 3: Real Multi-Layer Similarity Statistics */}
      {comparisonResult && hasBothUploaded ? (
        <>
          <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-4 shadow-2xs">
            <div className="border-r border-border pr-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Shared Overlap
              </span>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span
                  className={`num text-2xl font-bold ${
                    comparisonResult.overallOverlap > 35
                      ? "text-danger"
                      : comparisonResult.overallOverlap > 15
                      ? "text-warning"
                      : "text-success"
                  }`}
                >
                  {comparisonResult.overallOverlap}%
                </span>
                <span className="text-[11px] text-muted-foreground">Unique pairwise overlap</span>
              </div>
            </div>

            <div className="border-r border-border px-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Matched Words
              </span>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="num text-2xl font-semibold text-foreground">
                  {comparisonResult.matchedWords}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  of {comparisonResult.evidenceBreakdown?.total_document_words || "total"} words
                </span>
              </div>
            </div>

            <div className="border-r border-border px-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Matching Passages
              </span>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="num text-2xl font-semibold text-foreground">
                  {comparisonResult.passages?.length || 0}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {comparisonResult.sectionsAffected || 1} sections affected
                </span>
              </div>
            </div>

            <div className="pl-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Analytical Assessment
              </span>
              <p className="mt-1 text-[12px] font-medium text-foreground leading-snug">
                {comparisonResult.evidenceSummary && comparisonResult.evidenceSummary.length > 0
                  ? comparisonResult.evidenceSummary.slice(0, 2).join(". ")
                  : comparisonResult.overallOverlap > 0
                  ? "Direct textual alignment detected between documents."
                  : "No textual overlap detected. Original independent submissions."}
              </p>
            </div>
          </div>

          {/* Evidence Signals Breakdown Bar */}
          {comparisonResult.evidenceBreakdown && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-[11px] shadow-2xs">
              <span className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                Real Evidence Signals:
              </span>
              <span className="rounded-xs bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 font-medium">
                Strong Verbatim: {comparisonResult.evidenceBreakdown.strong_percentage}%
              </span>
              <span className="rounded-xs bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 font-medium">
                Moderate Lexical: {comparisonResult.evidenceBreakdown.moderate_percentage}%
              </span>
              <span className="rounded-xs bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 font-medium">
                Semantic Paraphrase: {comparisonResult.evidenceBreakdown.semantic_percentage}%
              </span>
              <span className="rounded-xs bg-muted text-muted-foreground border border-border px-2 py-0.5 font-medium">
                Structural Sequence: {comparisonResult.structuralSimilarity}%
              </span>
            </div>
          )}
        </>
      ) : !hasBothUploaded ? (
        <div className="mt-3.5 rounded-xl border border-border/80 bg-muted/40 p-5 text-center text-xs text-muted-foreground space-y-2">
          <Info className="size-6 text-brand mx-auto opacity-80" />
          <h4 className="font-semibold text-foreground text-sm">
            Pending Submissions for {currentSelectedAsg?.title || "this assignment"}
          </h4>
          <p className="max-w-xl mx-auto leading-relaxed">
            {submissionA && !submissionB
              ? `${studentAObj?.name} has uploaded "${submissionA.document?.file_name || "document"}", but ${studentBObj?.name} has not submitted coursework for ${currentSelectedAsg?.title || "this assignment"} yet. Both students must submit documents to compute pairwise source overlap.`
              : !submissionA && submissionB
              ? `${studentBObj?.name} has uploaded "${submissionB.document?.file_name || "document"}", but ${studentAObj?.name} has not submitted coursework for ${currentSelectedAsg?.title || "this assignment"} yet. Both students must submit documents to compute pairwise source overlap.`
              : `Neither ${studentAObj?.name || "Student 1"} nor ${studentBObj?.name || "Student 2"} have uploaded coursework for ${currentSelectedAsg?.title || "this assignment"} yet. Upload coursework to view side-by-side textual diff.`}
          </p>
        </div>
      ) : null}

      {/* STEP 4: Dual Column Real Document Text Comparison */}
      <div className="mt-3.5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Column: Student A Real Uploaded Document */}
        <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden flex flex-col">
          <div className="border-b border-border bg-muted/40 px-4 py-3 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="num font-bold text-foreground text-xs block truncate">
                {studentAObj?.name || "Student 1"} · {studentAObj?.roll}
              </span>
              <p className="text-[11px] text-muted-foreground truncate">
                {currentSelectedAsg?.title || "Assignment"} · File:{" "}
                <span className="font-mono text-foreground font-semibold">
                  {submissionA?.document?.file_name || (textA ? "Uploaded Document" : "No file")}
                </span>
              </p>
            </div>
            <span className="rounded-md bg-background px-2.5 py-1 text-[11px] font-semibold border border-border shrink-0">
              {submissionA?.document?.word_count || (textA ? textA.split(/\s+/).length : 0)} words
            </span>
          </div>

          <div
            ref={leftRef}
            onScroll={handleLeftScroll}
            className="h-[580px] overflow-y-auto p-5 text-[13px] leading-relaxed bg-card"
          >
            {isLoadingComparison ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Analyzing uploaded document...
              </div>
            ) : (
              <HighlightedDocumentView
                text={textA}
                passages={comparisonResult?.passages || []}
                isLeft={true}
              />
            )}
          </div>
        </div>

        {/* Right Column: Student B Real Uploaded Document */}
        <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden flex flex-col">
          <div className="border-b border-border bg-muted/40 px-4 py-3 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="num font-bold text-foreground text-xs block truncate">
                {studentBObj?.name || "Student 2"} · {studentBObj?.roll}
              </span>
              <p className="text-[11px] text-muted-foreground truncate">
                {currentSelectedAsg?.title || "Assignment"} · File:{" "}
                <span className="font-mono text-foreground font-semibold">
                  {submissionB?.document?.file_name || (textB ? "Uploaded Document" : "No file")}
                </span>
              </p>
            </div>
            <span className="rounded-md bg-background px-2.5 py-1 text-[11px] font-semibold border border-border shrink-0">
              {submissionB?.document?.word_count || (textB ? textB.split(/\s+/).length : 0)} words
            </span>
          </div>

          <div
            ref={rightRef}
            onScroll={handleRightScroll}
            className="h-[580px] overflow-y-auto p-5 text-[13px] leading-relaxed bg-card"
          >
            {isLoadingComparison ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Analyzing uploaded document...
              </div>
            ) : (
              <HighlightedDocumentView
                text={textB}
                passages={comparisonResult?.passages || []}
                isLeft={false}
              />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
