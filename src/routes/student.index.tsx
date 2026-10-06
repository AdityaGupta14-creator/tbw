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
  Bell,
  CheckCheck,
  Check,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatBar } from "@/components/stat-bar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { assignments as initialAssignments, submissions as mockSubmissions } from "@/lib/mock-data";
import { useStudentSession } from "@/lib/student-session";
import { verityApi } from "@/services/verity-api";
import { StudentSwitcherDialog } from "@/components/student-switcher-dialog";
import { formatInstitutionalDateTime } from "@/lib/formatters";
import type { StudentNotification, Assignment } from "@/types/database";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "Student Academic Dashboard — Verity" },
      {
        name: "description",
        content: "Student assignment submission dashboard, academic integrity status, and faculty feedback.",
      },
      { property: "og:title", content: "Student Academic Dashboard — Verity" },
    ],
  }),
  component: StudentDashboardPage,
});

interface UpcomingItem {
  id: string;
  title: string;
  subject: string;
  courseCode: string;
  dueFormatted: string;
  isPastDue: boolean;
  citationStyle: string;
}

interface SubmittedItem {
  id: string;
  rawId: string;
  assignment: string;
  subject: string;
  courseCode: string;
  submitted: string;
  similarity: number;
  status: "Submitted" | "Under Review" | "Reviewed";
  badgeTone?: "review" | "reviewed" | "pending";
}

function StudentDashboardPage() {
  const { currentStudent } = useStudentSession();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [upcomingList, setUpcomingList] = useState<UpcomingItem[]>([]);
  const [liveSubmissions, setLiveSubmissions] = useState<SubmittedItem[]>([]);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch assignments, submissions, and notifications specifically for the active student
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      verityApi.assignments.list(),
      verityApi.submissions.list(),
      verityApi.notifications.list(currentStudent.id),
    ]).then(([dbAssignments, dbSubmissions, notifs]) => {
      if (!isMounted) return;

      if (notifs) {
        setNotifications(notifs);
      }

      // 1. Identify all submissions for the active student from the canonical store
      const allSubs = dbSubmissions && dbSubmissions.length > 0 ? dbSubmissions : [];
      const studentSubs = allSubs.filter((s) => {
        const matchesId = !s.student_id || s.student_id === currentStudent.id;
        const matchesRoll =
          !s.student_roll ||
          !currentStudent.roll_number ||
          s.student_roll.trim().toLowerCase() === currentStudent.roll_number.trim().toLowerCase();
        
        const hasExplicitMatch =
          (s.student_id && s.student_id === currentStudent.id) ||
          (s.student_roll &&
            currentStudent.roll_number &&
            s.student_roll.trim().toLowerCase() === currentStudent.roll_number.trim().toLowerCase());

        return hasExplicitMatch && matchesId && matchesRoll;
      });

      // Track which assignments have been submitted by this student
      const submittedIds = new Set<string>();
      const submittedTitles = new Set<string>();
      studentSubs.forEach((s) => {
        if (s.assignment_id) submittedIds.add(s.assignment_id.toLowerCase());
        const t = s.assignment_title || (s as any).assignment;
        if (t) submittedTitles.add(t.trim().toLowerCase());
      });

      // 2. Identify all active assignments
      const allAsgList: any[] =
        dbAssignments && dbAssignments.length > 0 ? dbAssignments : initialAssignments;

      // 3. Format submitted items with institutional status
      const mappedSubmissions: SubmittedItem[] = studentSubs.map((s) => {
        let displayStatus: "Submitted" | "Under Review" | "Reviewed" = "Submitted";
        let badgeTone: "review" | "reviewed" | "pending" = "pending";

        if (s.status === "reviewed") {
          displayStatus = "Reviewed";
          badgeTone = "reviewed";
        } else if (s.status === "needs_review" || (s.status as string) === "in_review") {
          displayStatus = "Under Review";
          badgeTone = "review";
        }

        const asgTitle = s.assignment_title || (s as any).assignment || "Technical Report";
        const matched = allAsgList.find(
          (a) =>
            a.id?.toLowerCase() === s.assignment_id?.toLowerCase() ||
            a.title?.trim().toLowerCase() === asgTitle.trim().toLowerCase()
        );

        return {
          id: s.submission_code || s.id,
          rawId: s.id,
          assignment: asgTitle,
          subject: (s as any).subject || matched?.subject || "Technical and Business Writing",
          courseCode: s.course_code || matched?.courseCode || matched?.course_code || "EXCS-B",
          submitted: formatInstitutionalDateTime(s.submitted_at),
          similarity: s.similarity_percentage ?? 0,
          status: displayStatus,
          badgeTone,
        };
      });
      setLiveSubmissions(mappedSubmissions);

      // 4. Derive UPCOMING assignments:
      // REQUIREMENT 9: Once a student submits an assignment successfully,
      // it MUST NOT appear in "Upcoming Assignments"!
      const remainingUpcoming: UpcomingItem[] = allAsgList
        .filter((a) => {
          const id = (a.id || "").toLowerCase();
          const title = (a.title || "").trim().toLowerCase();
          const isSubmitted = submittedIds.has(id) || submittedTitles.has(title);
          return !isSubmitted;
        })
        .map((a) => {
          const rawDue = a.due_date || a.due || "05 Oct 2026, 11:59 PM";
          let isPastDue = false;
          let formattedDue = rawDue;

          const parsed = Date.parse(rawDue);
          if (!isNaN(parsed)) {
            const d = new Date(parsed);
            isPastDue = d.getTime() < Date.now();
            formattedDue = d.toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
          }

          return {
            id: a.id,
            title: a.title,
            subject: a.subject || "Technical and Business Writing",
            courseCode: a.course_code || a.courseCode || "EXCS-B",
            dueFormatted: formattedDue,
            isPastDue,
            citationStyle: a.citation_style || a.citationStyle || "Normal",
          };
        });

      setUpcomingList(remainingUpcoming);
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
        subtitle={`${currentStudent.full_name} · Roll No: ${currentStudent.roll_number} · ${currentStudent.department_name || "Department of Electronics and Computer Science Engineering"} (Section ${currentStudent.section || "B"}, ${currentStudent.batch || "Batch 3"})`}
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
                Active Student: {currentStudent.full_name} ({currentStudent.roll_number}) · {currentStudent.course_code || "EXCS-B"} ({currentStudent.batch || "Batch 3"})
              </span>
              <p className="mt-0.5 text-foreground/80 leading-relaxed">
                Institutional Email: <span className="font-mono">{currentStudent.email}</span> · Submissions are checked for similarity against college repositories and academic sources.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs bg-background shrink-0"
            onClick={() => setSwitcherOpen(true)}
          >
            Switch Profile
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <StatBar
          stats={[
            { label: "Enrolled Course", value: currentStudent.course_code || "EXCS-B" },
            { label: "Assigned Batch", value: currentStudent.batch || "Batch 3" },
            { label: "Pending Deadlines", value: String(upcomingList.length) },
            { label: "Submitted Work", value: String(liveSubmissions.length) },
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
        {/* Left Column: Upcoming Assignments */}
        <section className="rounded-md border border-border bg-card p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-brand" />
              <h2 className="font-semibold text-foreground text-sm">Upcoming Assignments</h2>
            </div>
            <Link to="/student/assignments" className="text-xs text-brand hover:underline font-medium">
              View all ({upcomingList.length})
            </Link>
          </div>

          {upcomingList.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex-1 flex flex-col items-center justify-center">
              <CheckCircle2 className="size-8 text-success/80 mb-2" />
              <p className="font-medium text-foreground">All assignments submitted!</p>
              <p className="mt-1">No pending coursework deadlines remaining on your schedule.</p>
            </div>
          ) : (
            <div className="mt-3.5 divide-y divide-border flex-1">
              {upcomingList.slice(0, 5).map((a) => (
                <div key={a.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-xs">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      {a.subject} · <span className="font-semibold text-brand">{a.courseCode}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground font-medium">
                        Due: <strong className="num text-foreground">{a.dueFormatted}</strong>
                      </span>
                      <span
                        className={`inline-block rounded-xs px-1.5 py-0.5 text-[10px] font-medium border ${
                          a.isPastDue
                            ? "bg-red-50 text-danger border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        Status: {a.isPastDue ? "Past Due" : "Upcoming"}
                      </span>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0 self-end sm:self-center">
                    <Link to="/student/assignments">
                      <Upload className="mr-1.5 size-3" /> Submit
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Recent Submissions & Evaluated Work */}
        <section className="rounded-md border border-border bg-card p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-brand" />
              <h2 className="font-semibold text-foreground text-sm">
                Recent Submissions ({liveSubmissions.length})
              </h2>
            </div>
            <Link to="/student/submissions" className="text-xs text-brand hover:underline font-medium">
              Full history
            </Link>
          </div>

          {liveSubmissions.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex-1 flex flex-col items-center justify-center">
              <FileText className="size-8 text-muted-foreground/50 mb-2" />
              <p className="font-medium text-foreground">No submissions recorded yet</p>
              <p className="mt-1">Uploaded reports will appear here after verification.</p>
              <Button asChild size="sm" className="mt-3 text-xs">
                <Link to="/student/assignments">
                  <Upload className="mr-1.5 size-3.5" /> Submit First Document
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mt-3.5 divide-y divide-border flex-1">
              {liveSubmissions.slice(0, 5).map((s) => (
                <div key={s.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-xs">{s.assignment}</p>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      {s.subject} · <span className="font-semibold text-brand">{s.courseCode}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block rounded-xs px-1.5 py-0.5 text-[10px] font-medium border ${
                          s.status === "Reviewed"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        Status: {s.status}
                      </span>
                      <span className="text-[11px] text-muted-foreground num">
                        Submitted: {s.submitted}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        · Similarity: <strong className="num text-foreground">{s.similarity}%</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link to="/submissions/$submissionId" params={{ submissionId: s.id }}>
                        <Eye className="mr-1 size-3.5 text-brand" /> View Result
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
