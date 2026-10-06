import { useState, useEffect } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, FileText, Mail, ShieldAlert, UserCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatBar } from "@/components/stat-bar";
import { TableShell, Th, Td, Tr } from "@/components/data-table";
import { StatusBadge, SimilarityValue } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { findStudent, submissions, students } from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";

const fallbackStudent = students[0]!;

export const Route = createFileRoute("/students/$studentId")({
  loader: async ({ params }) => {
    try {
      const p = await verityApi.students.get(params.studentId);
      if (p) {
        const dbSubs = await verityApi.submissions.list();
        const studentSubs = dbSubs
          .filter(
            (s) =>
              s.student_id === p.id ||
              (s.student_roll && s.student_roll.toLowerCase() === p.roll_number?.toLowerCase()) ||
              (s.student_name && s.student_name.toLowerCase() === p.full_name?.toLowerCase())
          )
          .map((s) => ({
            id: s.submission_code || s.id,
            assignment: s.assignment_title || "Technical Report",
            courseCode: s.course_code || "ENG-CSE-301",
            submitted: s.submitted_at
              ? new Date(s.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : "Today",
            similarity: s.similarity_percentage ?? 0,
            matchedSources: s.matched_source_count ?? 0,
            citationIssues: s.citation_issue_count ?? 0,
            status: (s.status === "needs_review" ? "review" : s.status === "reviewed" ? "reviewed" : "pending") as any,
          }));

        const totalSim = studentSubs.reduce((acc, s) => acc + s.similarity, 0);
        const avgSim = studentSubs.length > 0 ? Math.round(totalSim / studentSubs.length) : 0;
        const flaggedCount = studentSubs.filter(
          (s) => s.status === "review" || s.similarity >= 30
        ).length;

        const courseCode = p.course_code || "EXCS-B";
        const section = p.section || (courseCode.includes("-") ? courseCode.split("-")[1] : "B") || "B";
        const batch = p.batch || "Batch 3";
        const department = p.department_name || "Electronics and Computer Science Engineering";

        return {
          student: {
            id: p.id,
            name: p.full_name,
            roll: p.roll_number || "25108B0071",
            courseCode,
            department,
            section,
            batch,
            submissions: studentSubs.length,
            avgSimilarity: avgSim,
            flagged: flaggedCount,
            email: p.email,
          },
          submissions: studentSubs,
        };
      }
    } catch (e) {
      console.warn("Supabase student load error:", e);
    }

    const local = findStudent(params.studentId);
    if (local) {
      const localSubs = submissions.filter(
        (s) =>
          s.roll.toLowerCase() === local.roll.toLowerCase() ||
          s.student.toLowerCase() === local.name.toLowerCase()
      );
      return { student: local, submissions: localSubs };
    }

    return { student: fallbackStudent, submissions: [] };
  },
  head: ({ loaderData }) => {
    const student = loaderData?.student ?? fallbackStudent;
    return {
      meta: [
        { title: `${student.name} (${student.roll}) — Student Record — Verity` },
        {
          name: "description",
          content: `Academic integrity history, submissions, and similarity records for ${student.name}.`,
        },
        { property: "og:title", content: `Student: ${student.name} — Verity` },
      ],
    };
  },
  component: StudentDetailPage,
});

function StudentDetailPage() {
  const loaderData = Route.useLoaderData();
  const { studentId } = Route.useParams();
  const [student, setStudent] = useState(loaderData?.student ?? fallbackStudent);
  const [studentSubmissions, setStudentSubmissions] = useState(loaderData?.submissions ?? []);

  useEffect(() => {
    let isMounted = true;
    verityApi.students.get(studentId).then(async (p) => {
      if (!isMounted || !p) return;
      try {
        const dbSubs = await verityApi.submissions.list();
        const mappedSubs = dbSubs
          .filter(
            (s) =>
              s.student_id === p.id ||
              (s.student_roll && s.student_roll.toLowerCase() === p.roll_number?.toLowerCase()) ||
              (s.student_name && s.student_name.toLowerCase() === p.full_name?.toLowerCase())
          )
          .map((s) => ({
            id: s.submission_code || s.id,
            assignment: s.assignment_title || "Technical Report",
            courseCode: s.course_code || "ENG-CSE-301",
            submitted: s.submitted_at
              ? new Date(s.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : "Today",
            similarity: s.similarity_percentage ?? 0,
            matchedSources: s.matched_source_count ?? 0,
            citationIssues: s.citation_issue_count ?? 0,
            status: (s.status === "needs_review" ? "review" : s.status === "reviewed" ? "reviewed" : "pending") as any,
          }));

        const totalSim = mappedSubs.reduce((acc, s) => acc + s.similarity, 0);
        const avgSim = mappedSubs.length > 0 ? Math.round(totalSim / mappedSubs.length) : 0;
        const flaggedCount = mappedSubs.filter(
          (s) => s.status === "review" || s.similarity >= 30
        ).length;

        if (isMounted) {
          const courseCode = p.course_code || "EXCS-B";
          const section = p.section || (courseCode.includes("-") ? courseCode.split("-")[1] : "B") || "B";
          const batch = p.batch || "Batch 3";
          const department = p.department_name || "Electronics and Computer Science Engineering";

          setStudent({
            id: p.id,
            name: p.full_name,
            roll: p.roll_number || "25108B0071",
            courseCode,
            department,
            section,
            batch,
            submissions: mappedSubs.length,
            avgSimilarity: avgSim,
            flagged: flaggedCount,
            email: p.email,
          });
          setStudentSubmissions(mappedSubs);
        }
      } catch (e) {
        console.warn("Client student sub query failed:", e);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [studentId]);


  return (
    <AppShell>
      <div className="border-b border-border pb-3.5">
        <Button asChild variant="ghost" size="sm" className="mb-2 h-7 px-2 text-muted-foreground hover:text-foreground">
          <Link to="/students">
            <ArrowLeft className="mr-1 size-3.5" /> Back to Students
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{student.name}</h1>
              <span className="num rounded-xs bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {student.roll}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {student.department || "Electronics and Computer Science Engineering"} · <span className="font-semibold text-brand">{student.courseCode || "EXCS-B"}</span> (Section {student.section || "B"}) · <span className="font-semibold text-brand">{student.batch || "Batch 3"}</span> · <span className="font-mono text-foreground/80">{student.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="text-xs">
              <a href={`mailto:${student.email}`}>
                <Mail className="mr-1.5 size-3.5" /> Contact Student
              </a>
            </Button>
            <Button asChild size="sm" className="text-xs">
              <Link to="/compare">Compare Submissions</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <StatBar
          stats={[
            { label: "Submitted Assignments", value: String(student.submissions) },
            { label: "Mean Similarity", value: `${student.avgSimilarity}%` },
            { label: "Requires Review", value: String(student.flagged), tone: student.flagged > 0 ? "warning" : "success" },
            { label: "Citation Adherence", value: "94%", tone: "success" },
            { label: "Integrity Standing", value: student.flagged > 1 ? "Advisory" : "Good Standing" },
          ]}
        />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">Submission History & Verification Records</h2>
        <TableShell className="mt-2.5" caption={`Submissions by ${student.name}`}>
          <thead>
            <tr>
              <Th>Submission ID</Th>
              <Th>Assignment</Th>
              <Th>Course</Th>
              <Th>Timestamp</Th>
              <Th numeric>Similarity</Th>
              <Th numeric>Matched Sources</Th>
              <Th numeric>Citations</Th>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {studentSubmissions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-xs text-muted-foreground">
                  No submissions logged for this student in the current session.
                </td>
              </tr>
            ) : (
              studentSubmissions.map((s) => (
                <Tr key={s.id}>
                  <Td className="num text-muted-foreground">{s.id}</Td>
                  <Td className="font-medium text-foreground">{s.assignment}</Td>
                  <Td className="num text-muted-foreground">{s.courseCode}</Td>
                  <Td className="num text-muted-foreground whitespace-nowrap">{s.submitted}</Td>
                  <Td numeric>
                    <SimilarityValue value={s.similarity} />
                  </Td>
                  <Td numeric className="num text-muted-foreground">
                    {s.matchedSources}
                  </Td>
                  <Td numeric className="num text-muted-foreground">
                    {s.citationIssues}
                  </Td>
                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>
                  <Td className="text-right">
                    <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[12px]">
                      <Link to="/submissions/$submissionId" params={{ submissionId: s.id }}>
                        Open Review
                      </Link>
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </TableShell>
      </div>

      <div className="mt-6 rounded-md border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Academic Integrity Notes & Advisor Observations</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Student shows strong comprehension in technical implementation sections. Previous submissions demonstrate steady improvement in citation rigor. For Technical Report 02, verify that textbook definitions in Introduction are paraphrased appropriately.
        </p>
        <div className="mt-3 text-xs text-muted-foreground">
          Advisor: <span className="font-medium text-foreground">Dr. P. Kulkarni</span> · Department of Computer Engineering
        </div>
      </div>
    </AppShell>
  );
}
