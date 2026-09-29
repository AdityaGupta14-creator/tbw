import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Eye, FileText, MessageSquare, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { TableShell, Th, Td, Tr } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { submissions as defaultSubmissions } from "@/lib/mock-data";
import { useStudentSession } from "@/lib/student-session";
import { verityApi } from "@/services/verity-api";
import { StudentSwitcherDialog } from "@/components/student-switcher-dialog";
import { formatInstitutionalDateTime } from "@/lib/formatters";

export const Route = createFileRoute("/student/submissions")({
  head: () => ({
    meta: [
      { title: "My Submissions — Student Portal" },
      {
        name: "description",
        content: "Track submission receipts, faculty evaluation progress, and integrity review status.",
      },
      { property: "og:title", content: "Submissions — Student Portal" },
    ],
  }),
  component: StudentSubmissionsPage,
});

function StudentSubmissionsPage() {
  const { currentStudent } = useStudentSession();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    verityApi.submissions.list().then((dbList) => {
      if (!isMounted) return;

      const mySubs = (dbList || []).filter(
        (s) =>
          s.student_id === currentStudent.id ||
          s.student_roll?.toLowerCase() === currentStudent.roll_number?.toLowerCase() ||
          s.student_name?.toLowerCase() === currentStudent.full_name?.toLowerCase()
      );

      if (mySubs.length > 0) {
        const mapped = mySubs.map((s) => ({
          id: s.submission_code || s.id,
          rawId: s.id,
          assignment: s.assignment_title || "Technical Report",
          courseCode: s.course_code || "ENG-CSE-301",
          submitted: formatInstitutionalDateTime(s.submitted_at),
          similarity: s.similarity_percentage ?? 0,
          status: s.status === "needs_review" ? "review" : s.status === "reviewed" ? "reviewed" : "pending",
        }));
        setItems(mapped);
      } else {
        // If default Riya Sharma, show mock data; otherwise empty
        if (currentStudent.roll_number === "22CSE057") {
          setItems(
            defaultSubmissions
              .filter((s) => s.roll === "22CSE057")
              .map((s) => ({
                id: s.id,
                rawId: s.id,
                assignment: s.assignment,
                courseCode: s.courseCode,
                submitted: s.submitted,
                similarity: s.similarity,
                status: s.status,
              }))
          );
        } else {
          setItems([]);
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [currentStudent.id, currentStudent.roll_number, currentStudent.full_name]);

  return (
    <AppShell role="student">
      <PageHeader
        title="My Submission Records"
        subtitle={`Coursework submitted by ${currentStudent.full_name} (${currentStudent.roll_number})`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setSwitcherOpen(true)}
            >
              <Users className="mr-1.5 size-3.5 text-brand" />
              Switch Account
            </Button>
            <Button asChild size="sm">
              <Link to="/student/assignments">
                <Upload className="mr-1.5 size-3.5" /> Submit Work
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mt-5">
        <TableShell caption="Student submission history table">
          <thead>
            <tr>
              <Th>Receipt ID</Th>
              <Th>Assignment</Th>
              <Th>Course</Th>
              <Th>Submitted Timestamp</Th>
              <Th>Similarity</Th>
              <Th>Review Standing</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <Tr>
                <td colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                  No submissions found for {currentStudent.full_name} ({currentStudent.roll_number}).
                  <div className="mt-2">
                    <Button asChild size="sm" className="h-7 text-xs">
                      <Link to="/student/assignments">Submit Assignment Now</Link>
                    </Button>
                  </div>
                </td>
              </Tr>
            ) : (
              items.map((s) => (
                <Tr key={s.id}>
                  <Td className="num text-muted-foreground font-medium">{s.id}</Td>
                  <Td className="font-medium text-foreground">{s.assignment}</Td>
                  <Td className="num text-muted-foreground">{s.courseCode}</Td>
                  <Td className="num text-muted-foreground whitespace-nowrap">{s.submitted}</Td>
                  <Td>
                    <span
                      className={`num font-semibold text-xs px-2 py-0.5 rounded-xs ${
                        s.similarity > 25 ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
                      }`}
                    >
                      {s.similarity}%
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button asChild size="sm" variant="default" className="h-7 text-xs bg-brand hover:bg-brand/90">
                        <Link to="/submissions/$submissionId" params={{ submissionId: s.id }}>
                          <Eye className="mr-1 size-3.5" /> Report
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <Link to="/student/feedback">
                          <MessageSquare className="mr-1 size-3.5" /> Feedback
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => toast.success(`Receipt ${s.id} downloaded`)}
                      >
                        <Download className="size-3.5" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </TableShell>
      </div>

      <StudentSwitcherDialog
        open={switcherOpen}
        onOpenChange={setSwitcherOpen}
      />
    </AppShell>
  );
}
