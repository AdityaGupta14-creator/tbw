import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Bookmark } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { StatBar, type Stat } from "@/components/stat-bar";
import { TableShell, Th, Td, Tr } from "@/components/data-table";
import { StatusBadge, SimilarityValue } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { verityApi } from "@/services/verity-api";
import { formatInstitutionalDateTime, formatInstitutionalDate } from "@/lib/formatters";
import { INSTITUTIONAL_DEPARTMENTS, DEPARTMENT_SUBJECTS, type Assignment } from "@/lib/mock-data";

interface AttentionItem {
  text: string;
  action: string;
  to: string;
}

function computeAttentionItems(subs: any[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  const highSim = subs.filter((s) => (s.similarity_percentage ?? 0) >= 30);
  if (highSim.length > 0) {
    items.push({
      text: `${highSim.length} submission${highSim.length > 1 ? "s" : ""} have substantial similarity (≥ 30%)`,
      action: "Review",
      to: "/submissions",
    });
  }

  const citationIssues = subs.filter((s) => (s.citation_issue_count ?? 0) > 0);
  if (citationIssues.length > 0) {
    items.push({
      text: `${citationIssues.length} submission${citationIssues.length > 1 ? "s" : ""} flagged for citation issues`,
      action: "Review",
      to: "/submissions",
    });
  }

  const studentOverlap = subs.filter((s) => (s.student_overlap_percentage ?? 0) >= 20);
  if (studentOverlap.length > 0) {
    items.push({
      text: `${studentOverlap.length} submission${studentOverlap.length > 1 ? "s" : ""} have significant peer student overlap`,
      action: "Compare",
      to: "/compare",
    });
  }

  const pending = subs.filter((s) => s.status === "needs_review");
  if (pending.length > 0) {
    items.push({
      text: `${pending.length} submission${pending.length > 1 ? "s" : ""} awaiting faculty review`,
      action: "Review",
      to: "/submissions",
    });
  }

  if (items.length === 0) {
    items.push({
      text: "All submissions are currently reviewed with no pending flags",
      action: "View",
      to: "/submissions",
    });
  }

  return items;
}

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    try {
      const [stats, subs, asgs] = await Promise.all([
        verityApi.dashboard.getStats(),
        verityApi.submissions.list(),
        verityApi.assignments.list(),
      ]);
      return { stats, subs, asgs };
    } catch {
      return { stats: [], subs: [], asgs: [] };
    }
  },
  head: () => ({
    meta: [
      { title: "Faculty Dashboard — Verity" },
      {
        name: "description",
        content: "Academic integrity overview across your engineering courses and submissions.",
      },
      { property: "og:title", content: "Faculty Dashboard — Verity" },
      {
        property: "og:description",
        content: "Pending reviews, similarity indicators, and citation issues across your courses.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stat[]>(loaderData?.stats ?? []);
  const [items, setItems] = useState<any[]>(() => {
    if (loaderData?.subs && loaderData.subs.length > 0) {
      return loaderData.subs.slice(0, 10).map((s: any) => ({
        id: s.submission_code || s.id,
        student: s.student_name || "Student",
        roll: s.student_roll || "22CSE",
        courseCode: s.course_code || "ENG-CSE-301",
        assignment: s.assignment_title || "Technical Report",
        submitted: formatInstitutionalDateTime(s.submitted_at),
        similarity: s.similarity_percentage ?? 0,
        citationIssues: s.citation_issue_count ?? 0,
        status: s.status === "needs_review" ? "review" : s.status === "reviewed" ? "reviewed" : s.status === "processing" ? "pending" : "review",
      }));
    }
    return [];
  });
  const [assignmentsList, setAssignmentsList] = useState<any[]>(loaderData?.asgs ?? []);
  const [queueCourses, setQueueCourses] = useState<[string, string, number][]>([]);
  const [attentionList, setAttentionList] = useState<AttentionItem[]>(() =>
    computeAttentionItems(loaderData?.subs ?? [])
  );

  // Drill-down state
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [pendingSubject, setPendingSubject] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingSubject) {
      setSelectedSubject(pendingSubject);
      localStorage.setItem("facultySubject", pendingSubject);
      setPendingSubject(null);
      if (username) {
        localStorage.setItem("facultyName", username);
      }
      window.dispatchEvent(new Event("facultyInfoChanged"));
      setUsername("");
      setPassword("");
    }
  };

  useEffect(() => {
    // Load real aggregated stats
    verityApi.dashboard.getStats().then((res) => {
      if (res && res.length) setStats(res);
    });

    // Load real assignments
    verityApi.assignments.list().then((asgs) => {
      if (asgs && asgs.length > 0) {
        setAssignmentsList(asgs);
      }
    });

    // Load real submissions & update dynamic attention items
    verityApi.submissions.list().then((dbList) => {
      if (dbList && dbList.length > 0) {
        const mapped = dbList.slice(0, 10).map((s) => ({
          id: s.submission_code || s.id,
          student: s.student_name || "Student",
          roll: s.student_roll || "22CSE",
          courseCode: s.course_code || "ENG-CSE-301",
          assignment: s.assignment_title || "Technical Report",
          submitted: formatInstitutionalDateTime(s.submitted_at),
          similarity: s.similarity_percentage ?? 0,
          citationIssues: s.citation_issue_count ?? 0,
          status: s.status === "needs_review" ? "review" : s.status === "reviewed" ? "reviewed" : s.status === "processing" ? "pending" : "review",
        }));
        setItems(mapped);
        setAttentionList(computeAttentionItems(dbList));
      }
    });

    // Update queue courses counts dynamically
    verityApi.courses.list().then((crs) => {
      if (crs && crs.length > 0) {
        verityApi.submissions.list().then((subs) => {
          const courseList: [string, string, number][] = crs.slice(0, 5).map((c) => {
            const pending = subs.filter((s) => s.course_code === c.course_code && s.status === "needs_review").length;
            return [c.course_code, c.name, pending];
          });
          setQueueCourses(courseList);
        });
      }
    });
  }, []);

  const cardColors = [
    { bg: "bg-warning", border: "border-warning-soft", badge: "bg-navy text-white", text: "text-foreground", fill: "fill-foreground" },
    { bg: "bg-purple", border: "border-accent", badge: "bg-warning text-foreground", text: "text-foreground", fill: "fill-foreground" },
    { bg: "bg-blue-100", border: "border-blue-200", badge: "bg-purple/50 text-foreground", text: "text-foreground", fill: "fill-none" }
  ];

  const topCourses = queueCourses.slice(0, 3);

  // If no department is selected, show Departments (Courses) Level
  if (!selectedDept) {
    return (
      <div className="min-h-screen bg-background p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mt-2 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Academic Departments</h1>
            <p className="text-sm text-muted-foreground mt-1">Select a course to view its subjects</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {INSTITUTIONAL_DEPARTMENTS.map((dept, idx) => {
            const colors = cardColors[idx % cardColors.length];
            return (
              <div key={dept.code} className={`${colors.bg} rounded-3xl p-5 shadow-sm border ${colors.border} flex flex-col relative min-h-[220px]`}>
                <Bookmark className={`absolute top-5 right-5 size-5 ${colors.text} ${colors.fill}`} />
                <div className={`${colors.badge} text-[10px] font-medium px-2 py-1 rounded w-fit mb-3`}>{dept.code}</div>
                <h3 className={`text-xl font-semibold ${colors.text} leading-tight mb-4 pr-6 line-clamp-2`}>{dept.name}</h3>
                <div className="flex items-center justify-between mt-auto">
                  <Button 
                    className="bg-brand text-white hover:bg-brand/90 rounded-full h-8 px-5 text-xs font-semibold shadow-md w-full"
                    onClick={() => setSelectedDept(dept.code)}
                  >
                    View Subjects
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // If a department is selected but no subject, show Subjects Level
  if (selectedDept && !selectedSubject) {
    const subjects = DEPARTMENT_SUBJECTS[selectedDept] || [];
    return (
      <div className="min-h-screen bg-background p-8 max-w-7xl mx-auto relative">
        {pendingSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card p-6 rounded-xl shadow-xl w-full max-w-md border border-border">
              <h2 className="text-xl font-bold mb-2">Professor Login</h2>
              <p className="text-sm text-muted-foreground mb-6">Please login to access {pendingSubject} dashboard.</p>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Username / ID</label>
                  <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background" placeholder="e.g. prof_smith" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Password</label>
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background" placeholder="••••••••" />
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <Button type="button" variant="ghost" onClick={() => setPendingSubject(null)}>Cancel</Button>
                  <Button type="submit" className="bg-brand text-white hover:bg-brand/90">Login to Dashboard</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-2 mb-6">
          <div>
            <Button variant="ghost" className="text-xs px-2 h-6 mb-2 -ml-2 text-muted-foreground" onClick={() => setSelectedDept(null)}>
              ← Back to Departments
            </Button>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{selectedDept} Subjects</h1>
            <p className="text-sm text-muted-foreground mt-1">Select a subject to open the teacher dashboard</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {subjects.map((subj, idx) => {
            const colors = cardColors[idx % cardColors.length];
            return (
              <div key={subj} className={`${colors.bg} rounded-3xl p-5 shadow-sm border ${colors.border} flex flex-col relative min-h-[220px]`}>
                <Bookmark className={`absolute top-5 right-5 size-5 ${colors.text} ${colors.fill}`} />
                <div className={`${colors.badge} text-[10px] font-medium px-2 py-1 rounded w-fit mb-3`}>Subject</div>
                <h3 className={`text-xl font-semibold ${colors.text} leading-tight mb-4 pr-6 line-clamp-2`}>{subj}</h3>
                <div className="flex items-center justify-between mt-auto">
                  <Button 
                    className="bg-brand text-white hover:bg-brand/90 rounded-full h-8 px-5 text-xs font-semibold shadow-md w-full"
                    onClick={() => setPendingSubject(subj)}
                  >
                    Open Dashboard
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Level 3: Subject-specific Dashboard
  // Filter assignments by selected subject
  let subjectAssignments = assignmentsList.filter(a => 
    a.subject === selectedSubject || 
    (a.title && a.title.toLowerCase().includes(selectedSubject!.toLowerCase()))
  );
  
  // Ensure exactly 3 assignments exist per subject as requested
  if (subjectAssignments.length < 3) {
    const needed = 3 - subjectAssignments.length;
    const mockAsgs = Array.from({ length: needed }).map((_, i) => ({
      id: `mock-${selectedSubject}-${i}`,
      courseCode: selectedDept || "EXCS",
      title: `${selectedSubject} - Assignment ${subjectAssignments.length + i + 1}`,
      subject: selectedSubject,
      type: "Technical Report",
      due: "15 Nov 2026",
      submitted: 45,
      total: 60,
      avgSimilarity: Math.floor(Math.random() * 20),
      pending: Math.floor(Math.random() * 10),
      citationStyle: "IEEE",
    }));
    subjectAssignments = [...subjectAssignments, ...mockAsgs];
  }
  
  // Filter items (submissions) by selected subject assignments
  const filteredItems = items.filter(s => 
    subjectAssignments.some(a => a.id === s.assignmentId || s.assignment === a.title)
  ).slice(0, 5);

  const topAssignments = subjectAssignments.slice(0, 3);

  return (
    <AppShell>
      <div className="flex flex-col mb-6">
        <Button variant="ghost" className="text-xs px-2 h-6 w-fit mb-2 -ml-2 text-muted-foreground" onClick={() => setSelectedSubject(null)}>
          ← Back to {selectedDept} Subjects
        </Button>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{selectedSubject} Overview</h1>
          <div className="flex items-center gap-2">
            <Button variant="default" className="rounded-full bg-navy text-white text-xs h-8">All sections</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {topAssignments.length > 0 ? topAssignments.map((asg, idx) => {
          const colors = cardColors[idx % cardColors.length];
          return (
            <div key={asg.id} className={`${colors.bg} rounded-3xl p-5 shadow-sm border ${colors.border} flex flex-col relative`}>
              <Bookmark className={`absolute top-5 right-5 size-5 ${colors.text} ${colors.fill}`} />
              <div className={`${colors.badge} text-[10px] font-medium px-2 py-1 rounded w-fit mb-3`}>{asg.courseCode || selectedDept}</div>
              <h3 className={`text-xl font-semibold ${colors.text} leading-tight mb-8 pr-6 line-clamp-2`}>{asg.title}</h3>
              <div className={`flex justify-between items-center text-xs ${colors.text}/80 mb-2 font-medium`}>
                <span>Pending Reviews</span>
                <span>{asg.pending} submissions</span>
              </div>
              <div className={`h-1.5 bg-foreground/10 rounded-full mb-5`}>
                <div className={`h-full bg-foreground rounded-full`} style={{ width: asg.pending > 0 ? '40%' : (asg.submitted > 0 ? '100%' : '0%') }}></div>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <Button 
                  className="bg-brand text-white hover:bg-brand/90 rounded-full h-8 px-5 text-xs font-semibold shadow-md"
                  onClick={() => navigate({ to: "/assignments/$assignmentId", params: { assignmentId: asg.id }})}
                >
                  View Assignment
                </Button>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-3 rounded-3xl border border-dashed border-border p-8 text-center bg-muted/20">
            <p className="text-muted-foreground font-medium">No assignments found for this subject.</p>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link to="/assignments/new">Create Assignment</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="border border-border rounded-3xl p-6 bg-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Recent Submissions</h2>
            <Link to="/submissions" className="text-brand text-xs font-medium hover:underline">View all</Link>
          </div>
          
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted-foreground font-medium text-xs border-b border-border">
                <th className="pb-3 font-medium">Student & Assignment</th>
                <th className="pb-3 font-medium">Course</th>
                <th className="pb-3 font-medium text-right">Similarity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.length > 0 ? filteredItems.map((s) => (
                <tr key={s.id} className="group cursor-pointer" onClick={() => navigate({ to: "/submissions/$submissionId", params: { submissionId: s.id }})}>
                  <td className="py-4">
                    <p className="font-semibold text-foreground group-hover:text-brand transition-colors">{s.student}</p>
                    <p className="text-xs text-muted-foreground">{s.assignment}</p>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium bg-muted px-2 py-1 rounded-full">{s.courseCode || selectedDept}</span>
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <SimilarityValue value={s.similarity} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground text-xs">
                    No recent submissions for this subject.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-navy rounded-3xl p-6 text-white flex flex-col justify-between relative overflow-hidden">
          <div>
            <p className="text-xs text-white/70 mb-4">Requires Immediate Attention</p>
            <div className="bg-danger text-white text-[10px] font-medium px-2 py-1 rounded-full w-fit mb-4">High Similarity Flag</div>
            <h3 className="text-xl font-semibold leading-tight mb-4">
              {attentionList.length > 0 ? attentionList[0].text : "System flagged multiple matching sources."}
            </h3>
            <p className="text-xs text-white/60 line-clamp-3 mb-8">
              Review the detailed comparison report to verify matched contents against the institutional database and web sources.
            </p>
          </div>
          
          <div>
            <Button asChild className="w-full bg-brand text-white hover:bg-brand/90 rounded-full py-5 text-sm font-semibold">
              <Link to={attentionList.length > 0 ? attentionList[0].to : "/submissions"}>
                {attentionList.length > 0 ? attentionList[0].action : "Open Report"}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
