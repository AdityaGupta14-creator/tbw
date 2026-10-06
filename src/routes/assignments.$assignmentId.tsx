import { useState, useEffect } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatBar } from "@/components/stat-bar";
import { TableShell, Th, Td, Tr } from "@/components/data-table";
import { StatusBadge, SimilarityValue } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { findAssignment, submissions, type Assignment } from "@/lib/mock-data";
import { verityApi } from "@/services/verity-api";

export const Route = createFileRoute("/assignments/$assignmentId")({
  loader: async ({ params }) => {
    try {
      const a = await verityApi.assignments.get(params.assignmentId);
      if (a) {
        const formattedDue = a.due_date
          ? isNaN(Date.parse(a.due_date))
            ? a.due_date
            : new Date(a.due_date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
          : "24 Oct 2026";

        const dbSubs = await verityApi.submissions.list();
        const relSubs = dbSubs
          .filter((s) => s.assignment_id === a.id || s.course_code === a.course_code)
          .map((s) => ({
            id: s.submission_code || s.id,
            student: s.student_name || "Student",
            roll: s.student_roll || "22CSE",
            courseCode: s.course_code || a.course_code || "ENG-CSE-301",
            assignmentId: a.id,
            assignment: a.title,
            submitted: s.submitted_at
              ? new Date(s.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
              : "Today",
            similarity: s.similarity_percentage ?? 0,
            citationIssues: s.citation_issue_count ?? 0,
            status: (s.status === "needs_review" ? "review" : s.status === "reviewed" ? "reviewed" : "pending") as any,
            drafts: s.drafts_count ?? 1,
            matchedSources: s.matched_source_count ?? 0,
          }));

        return {
          assignment: {
            id: a.id,
            courseCode: a.course_code || "ENG-CSE-301",
            title: a.title,
            type: a.assignment_type || "Technical Report",
            due: formattedDue,
            submitted: relSubs.length || a.submitted_count || 0,
            total: a.total_students || 64,
            avgSimilarity: relSubs.length > 0 ? Math.round(relSubs.reduce((acc, s) => acc + s.similarity, 0) / relSubs.length) : (a.avg_similarity || 0),
            pending: relSubs.filter((s) => s.status === "review").length || a.pending_count || 0,
            citationStyle: a.citation_style || "IEEE",
          },
          submissions: relSubs.length > 0 ? relSubs : submissions.filter((s) => s.assignmentId === a.id || s.courseCode === a.course_code),
        };
      }
    } catch (e) {
      console.warn("API assignment load error:", e);
    }

    const assignment = findAssignment(params.assignmentId);
    if (!assignment) throw notFound();
    const rows = submissions.filter(
      (s) => s.assignmentId === assignment.id || s.courseCode === assignment.courseCode,
    );
    return { assignment, submissions: rows };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Assignment unavailable — Verity" }, { name: "robots", content: "noindex" }],
      };
    }
    const { assignment } = loaderData;
    const title = `${assignment.title} — ${assignment.courseCode} — Verity`;
    const description = `Review workspace for ${assignment.title} (${assignment.type}), due ${assignment.due}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: AssignmentDetail,
});

function AssignmentDetail() {
  const { assignment, submissions: rows } = Route.useLoaderData();

  const navigate = useNavigate();

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this assignment?")) {
      try {
        await verityApi.assignments.delete(assignment.id);
        navigate({ to: "/assignments" });
      } catch (err) {
        console.error("Failed to delete assignment", err);
        alert("Failed to delete assignment");
      }
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={assignment.title}
        subtitle={`${assignment.courseCode} · ${assignment.type} · Due ${assignment.due} · Citation style ${assignment.citationStyle}`}
        actions={
          <>
            <Button size="sm" variant="destructive" onClick={handleDelete}>Delete</Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/compare">Compare submissions</Link>
            </Button>
            <Button size="sm">Review queue</Button>
          </>
        }
      />

      <div className="mt-5">
        <StatBar
          stats={[
            { label: "Submitted", value: `${assignment.submitted} / ${assignment.total}` },
            { label: "Avg. Similarity", value: `${assignment.avgSimilarity}%` },
            { label: "Pending Review", value: String(assignment.pending), tone: "warning" },
            { label: "Citation Issues", value: "4", tone: "warning" },
            { label: "High Similarity", value: "2", tone: "danger" },
          ]}
        />
      </div>

      <h2 className="mt-5 text-sm font-semibold">Submissions</h2>
      <TableShell className="mt-2" caption={`Submissions for ${assignment.title}`}>
        <thead>
          <tr>
            <Th>Student</Th>
            <Th>Roll No.</Th>
            <Th>Submitted</Th>
            <Th numeric>Similarity</Th>
            <Th numeric>Sources</Th>
            <Th numeric>Citation issues</Th>
            <Th numeric>Drafts</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <Tr key={s.id}>
              <Td>
                <Link
                  to="/submissions/$submissionId"
                  params={{ submissionId: s.id }}
                  className="font-medium text-brand hover:underline"
                >
                  {s.student}
                </Link>
              </Td>
              <Td className="num text-muted-foreground">{s.roll}</Td>
              <Td className="num text-muted-foreground">{s.submitted}</Td>
              <Td numeric>
                <SimilarityValue value={s.similarity} />
              </Td>
              <Td numeric className="num">
                {s.matchedSources}
              </Td>
              <Td numeric className="num">
                {s.citationIssues}
              </Td>
              <Td numeric className="num">
                {s.drafts}
              </Td>
              <Td>
                <StatusBadge status={s.status} />
              </Td>
            </Tr>
          ))}
        </tbody>
      </TableShell>
    </AppShell>
  );
}
