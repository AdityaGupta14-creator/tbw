import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  GraduationCap,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatBar } from "@/components/stat-bar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { assignments, submissions as mockSubmissions } from "@/lib/mock-data";
import { useStudentSession } from "@/lib/student-session";
import { verityApi } from "@/services/verity-api";
import { StudentSwitcherDialog } from "@/components/student-switcher-dialog";
import { formatInstitutionalDateTime } from "@/lib/formatters";
import type { StudentNotification } from "@/types/database";
import { Bell, CheckCheck, Check, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "Student Portal — Verity" },
      {
        name: "description",
        content: "Student assignment submission dashboard, academic integrity status, and faculty feedback.",
      },
      { property: "og:title", content: "Student Portal — Verity" },
    ],
  }),
  component: StudentDashboardPage,
});

function StudentDashboardPage() {
  const { currentStudent } = useStudentSession();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [liveSubmissions, setLiveSubmissions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const upcoming = assignments.slice(0, 3);

  // Fetch submissions and notifications specifically for the active student
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      verityApi.submissions.list(),
      verityApi.notifications.list(currentStudent.id),
    ]).then(([dbList, notifs]) => {
      if (!isMounted) return;

      if (notifs) {
        setNotifications(notifs);
      }

      const studentSubs = (dbList || []).filter(
        (s) =>
          s.student_id === currentStudent.id ||
          s.student_roll?.toLowerCase() === currentStudent.roll_number?.toLowerCase() ||
          s.student_name?.toLowerCase() === currentStudent.full_name?.toLowerCase()
      );

      if (studentSubs.length > 0) {
        setLiveSubmissions(
          studentSubs.map((s) => ({
            id: s.submission_code || s.id,
            rawId: s.id,
            assignment: s.assignment_title || "Technical Report",
            courseCode: s.course_code || "ENG-CSE-301",
            submitted: formatInstitutionalDateTime(s.submitted_at),
            similarity: s.similarity_percentage ?? 0,
            status: s.status === "needs_review" ? "review" : s.status === "reviewed" ? "reviewed" : "pending",
          }))
        );
      } else {
        // Fallback for default student (Riya Sharma) or empty for new student
        if (currentStudent.roll_number === "22CSE057") {
          setLiveSubmissions(
            mockSubmissions
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
          setLiveSubmissions([]);
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [currentStudent.id, currentStudent.roll_number, currentStudent.full_name]);

  const handleMarkNotificationRead = async (id: string) => {
    await verityApi.notifications.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllNotificationsRead = async () => {
    await verityApi.notifications.markAllAsRead(currentStudent.id);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
  };

  return (
    <AppShell role="student">
      <PageHeader
        title="Student Academic Dashboard"
        subtitle={`${currentStudent.full_name} · Roll No: ${currentStudent.roll_number} · ${currentStudent.department_name || "Department of Computer Engineering"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSwitcherOpen(true)}
              className="text-xs"
            >
              <Users className="mr-1.5 size-3.5 text-brand" /> Switch Account / Logout
            </Button>
            <Button asChild size="sm">
              <Link to="/student/assignments">
                <Upload className="mr-1.5 size-3.5" /> Submit Assignment
              </Link>
            </Button>
          </div>
        }
      />

      {/* Student Academic Honor Code & Active Account Card */}
      <div className="mt-5 rounded-md border border-brand/20 bg-brand-soft/40 p-4 text-xs text-brand">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <UserCheck className="mt-0.5 size-4 shrink-0 text-brand" />
            <div>
              <span className="font-semibold text-foreground">
                Active Student Profile: {currentStudent.full_name} ({currentStudent.roll_number})
              </span>
              <p className="mt-0.5 text-foreground/80 leading-relaxed">
                Coursework submitted from this terminal is registered under your institutional identity and checked against IEEE standards and university archives.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs bg-background shrink-0"
            onClick={() => setSwitcherOpen(true)}
          >
            Not {currentStudent.full_name.split(" ")[0]}? Switch
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <StatBar
          stats={[
            { label: "Enrolled Courses", value: "5" },
            { label: "Active Submissions", value: String(liveSubmissions.length) },
            { label: "Integrity Standing", value: "Verified", tone: "success" },
            {
              label: "Mean Similarity",
              value:
                liveSubmissions.length > 0
                  ? `${Math.round(
                      liveSubmissions.reduce((acc, s) => acc + (s.similarity || 0), 0) /
                        liveSubmissions.length
                    )}%`
                  : "0%",
              tone:
                liveSubmissions.length > 0 &&
                liveSubmissions.reduce((acc, s) => acc + (s.similarity || 0), 0) /
                  liveSubmissions.length >
                  25
                  ? "danger"
                  : "success",
            },
          ]}
        />
      </div>

      {/* Student Notifications & Review Action Center */}
      {notifications.length > 0 && (
        <section className="mt-5 rounded-md border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-brand" />
              <h2 className="font-semibold text-foreground text-sm">
                Academic Review Updates & Notifications
              </h2>
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <span className="rounded-xs bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">
                  {notifications.filter((n) => !n.is_read).length} unread
                </span>
              )}
            </div>
            {notifications.filter((n) => !n.is_read).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllNotificationsRead}
                className="h-6 px-2 text-[11px] text-brand hover:text-brand-dark"
              >
                <CheckCheck className="mr-1 size-3" /> Mark all read
              </Button>
            )}
          </div>

          <div className="mt-2.5 divide-y divide-border">
            {notifications.slice(0, 4).map((n) => (
              <div
                key={n.id}
                className={`py-2.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                  !n.is_read ? "bg-brand/5 px-2 rounded-sm" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs ${!n.is_read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground num">
                      {formatInstitutionalDateTime(n.created_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                    {n.assignment_title || n.course_code || n.submission_id}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkNotificationRead(n.id)}
                      className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      <Check className="mr-1 size-2.5" /> Read
                    </Button>
                  )}
                  {n.action_url && (
                    <Button asChild size="sm" variant="outline" className="h-6 px-2 text-[11px]">
                      <Link to="/submissions/$submissionId" params={{ submissionId: n.submission_id }}>
                        View Submission <ExternalLink className="ml-1 size-2.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Two Column Layout: Upcoming Assignments & Recent Submissions */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Upcoming Deadlines */}
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-brand" />
              <h2 className="font-semibold text-foreground text-sm">Upcoming Course Deadlines</h2>
            </div>
            <Link to="/student/assignments" className="text-xs text-brand hover:underline font-medium">
              View all
            </Link>
          </div>

          <div className="mt-3.5 divide-y divide-border">
            {upcoming.map((a) => (
              <div key={a.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground text-xs">{a.title}</p>
                  <p className="text-[11px] text-muted-foreground num">
                    {a.courseCode} · Due {a.due}
                  </p>
                  <span className="mt-1 inline-block text-[10px] rounded-xs bg-muted px-1.5 py-0.5 text-muted-foreground">
                    Citation style: {a.citationStyle}
                  </span>
                </div>
                <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0">
                  <Link to="/student/assignments">
                    Submit Work
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column: Recent Submissions & Returned Feedback */}
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-brand" />
              <h2 className="font-semibold text-foreground text-sm">
                Submissions by {currentStudent.full_name} ({liveSubmissions.length})
              </h2>
            </div>
            <Link to="/student/submissions" className="text-xs text-brand hover:underline font-medium">
              Full history
            </Link>
          </div>

          {liveSubmissions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <p>No coursework submitted under this student profile yet.</p>
              <Button asChild size="sm" className="mt-3 text-xs">
                <Link to="/student/assignments">
                  <Upload className="mr-1.5 size-3.5" /> Submit First Document
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mt-3.5 divide-y divide-border">
              {liveSubmissions.slice(0, 4).map((s) => (
                <div key={s.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground text-xs">{s.assignment}</p>
                    <p className="text-[11px] text-muted-foreground num">
                      {s.courseCode} · Receipt: {s.id}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StatusBadge status={s.status} />
                      <span className="text-[11px] text-muted-foreground">
                        Similarity: <strong className="num text-foreground">{s.similarity}%</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link to="/submissions/$submissionId" params={{ submissionId: s.id }}>
                        <Eye className="mr-1 size-3.5 text-brand" /> Report
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <StudentSwitcherDialog
        open={switcherOpen}
        onOpenChange={setSwitcherOpen}
      />
    </AppShell>
  );
}
