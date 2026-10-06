import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BarChart3,
  Bookmark,
  BookOpen,
  Bell,
  Building2,
  ClipboardList,
  Eye,
  FileCheck,
  FileText,
  GitCompare,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useStudentSession } from "@/lib/student-session";
import { StudentSwitcherDialog } from "@/components/student-switcher-dialog";
import { NotificationsPopover } from "@/components/notifications-popover";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { courses, submissions, semesters } from "@/lib/mock-data";

type NavItem = { label: string; to: string; icon: React.ComponentType<{ className?: string }> };

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const facultyNavGroups: NavGroup[] = [
  {
    heading: "Workspace",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    heading: "Courses",
    items: [
      { label: "Students", to: "/students", icon: Users },
      { label: "Assignments", to: "/assignments", icon: ClipboardList },
    ],
  },
  {
    heading: "Submissions",
    items: [
      { label: "Submissions", to: "/submissions", icon: FileText },
      { label: "Submission Upload", to: "/assignments/new", icon: Upload },
    ],
  },
  {
    heading: "Analysis",
    items: [
      { label: "Source Matching", to: "/compare", icon: GitCompare },
      { label: "Document Viewer", to: "/submissions/SUB-2026-09124", icon: Eye },
    ],
  },
  {
    heading: "Review",
    items: [
      { label: "Integrity Reports", to: "/reports", icon: FileCheck },
    ],
  },
];

const facultyNav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Assignments", to: "/assignments", icon: ClipboardList },
  { label: "Submissions", to: "/submissions", icon: FileText },
  { label: "Students", to: "/students", icon: Users },
  { label: "Compare", to: "/compare", icon: GitCompare },
  { label: "Reports", to: "/reports", icon: BarChart3 },
];

const studentNav: NavItem[] = [
  { label: "Dashboard", to: "/student", icon: LayoutDashboard },
  { label: "Assignments", to: "/student/assignments", icon: ClipboardList },
  { label: "Submissions", to: "/student/submissions", icon: FileText },
  { label: "Feedback", to: "/student/feedback", icon: MessageSquare },
];

const adminNav: NavItem[] = [
  { label: "Institution", to: "/admin", icon: Building2 },
  { label: "Courses", to: "/courses", icon: BookOpen },
  { label: "Students", to: "/students", icon: Users },
  { label: "Reports", to: "/reports", icon: BarChart3 },
];

export type ShellRole = "faculty" | "student" | "admin";

const labels: Record<string, string> = {
  dashboard: "Dashboard",
  courses: "Courses",
  assignments: "Assignments",
  submissions: "Submissions",
  students: "Students",
  reports: "Reports",
  compare: "Comparison",
  settings: "Settings",
  student: "Student Portal",
  admin: "Institution",
  new: "New Assignment",
  feedback: "Feedback",
  help: "Help",
};

function getInitials(name?: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function SidebarContent({
  role,
  onNavigate,
  onOpenSwitcher,
}: {
  role: ShellRole;
  onNavigate?: () => void;
  onOpenSwitcher?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [facultyName, setFacultyName] = useState("Dr. P. Kulkarni");
  const [facultySubject, setFacultySubject] = useState("Computer Engineering");

  useEffect(() => {
    const updateInfo = () => {
      const storedName = localStorage.getItem("facultyName");
      if (storedName) setFacultyName(storedName);
      
      const storedSubject = localStorage.getItem("facultySubject");
      if (storedSubject) setFacultySubject(storedSubject);
    };
    updateInfo();
    window.addEventListener("facultyInfoChanged", updateInfo);
    window.addEventListener("facultyNameChanged", updateInfo); // Fallback for old events
    return () => {
      window.removeEventListener("facultyInfoChanged", updateInfo);
      window.removeEventListener("facultyNameChanged", updateInfo);
    };
  }, []);

  const nav = role === "student" ? studentNav : role === "admin" ? adminNav : facultyNav;
  const { currentStudent } = useStudentSession();

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-4 flex justify-center">
        <Link to="/" onClick={onNavigate} className="block hover:opacity-90 transition-opacity">
          <div className="flex items-center justify-center px-3 py-1.5 h-9 bg-white rounded shadow-sm border border-black/5">
            <span className="text-xl font-bold tracking-tight leading-none">
              <span className="text-black">ver</span>
              <span className="text-red-600">ity</span>
            </span>
          </div>
        </Link>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-3">
        {role === "faculty" ? (
          <div className="space-y-4">
            {facultyNavGroups.map((group) => (
              <div key={group.heading} className="space-y-1">
                <p className="px-2.5 text-[10px] font-bold tracking-[0.14em] text-sidebar-foreground/50 uppercase">
                  {group.heading}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active =
                      item.to === "/dashboard"
                        ? pathname === "/dashboard"
                        : item.to === "/submissions/SUB-2026-09124"
                        ? pathname.startsWith("/submissions/")
                        : item.to === "/submissions"
                        ? pathname === "/submissions"
                        : pathname === item.to || pathname.startsWith(item.to + "/");

                    return (
                      <li key={item.label}>
                        <Link
                          to={item.to}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-2.5 rounded-full px-4 py-2 text-[14px] transition-all duration-200 active:scale-95",
                            active
                              ? "bg-warning font-semibold text-warning-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          )}
                          aria-current={active ? "page" : undefined}
                        >
                          <item.icon className="size-4 shrink-0 opacity-80" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {nav.map((item) => {
              const active =
                pathname === item.to || (item.to !== "/student" && pathname.startsWith(item.to + "/"));
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-full px-4 py-2 text-[14px] transition-all duration-200 active:scale-95",
                      active
                        ? "bg-warning font-semibold text-warning-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <item.icon className="size-4 shrink-0 opacity-80" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-sidebar-border px-2 py-3">
        <ul className="space-y-0.5">
          <li>
            <Link
              to="/settings"
              onClick={onNavigate}
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-[13px] text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            >
              <Settings className="size-4 opacity-80" /> Settings
            </Link>
          </li>
          <li>
            <Link
              to="/help"
              onClick={onNavigate}
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-[13px] text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            >
              <HelpCircle className="size-4 opacity-80" /> Help
            </Link>
          </li>
        </ul>

        {role === "student" ? (
          <div className="mt-3 flex items-center justify-between gap-1.5 rounded-sm bg-sidebar-accent/50 p-2">
            <button
              type="button"
              onClick={onOpenSwitcher}
              className="flex min-w-0 flex-1 items-center gap-2 text-left transition-opacity hover:opacity-80"
              title="Click to switch student profile or log out"
            >
              <span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground">
                {getInitials(currentStudent.full_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-sidebar-accent-foreground">
                  {currentStudent.full_name}
                </p>
                <p className="num truncate text-[10px] text-sidebar-foreground/65">
                  {currentStudent.roll_number}
                </p>
              </div>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={onOpenSwitcher}
              title="Switch Account / Log out"
            >
              <ArrowLeftRight className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2.5 rounded-sm bg-sidebar-accent/50 px-2.5 py-2">
            <span className="num flex size-7 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground">
              {role === "admin" ? "AD" : getInitials(facultyName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-sidebar-accent-foreground">
                {role === "admin" ? "Registrar Office" : facultyName}
              </p>
              <p className="num truncate text-[10px] text-sidebar-foreground/65">
                {role === "admin" ? "Administrator" : facultySubject}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 && pathname !== "/") return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const known = labels[seg];
    const course = courses.find((c) => c.id === seg);
    const sub = submissions.find((s) => s.id.toLowerCase() === seg.toLowerCase());
    const label = known ?? course?.code ?? sub?.assignment ?? seg.replace(/-/g, " ");
    return { href, label };
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 md:flex items-center">
      {pathname === "/dashboard" ? (
        <div className="flex items-baseline text-sm text-muted-foreground">
          Welcome to <span className="ml-1.5 text-2xl font-bold text-foreground tracking-tight">Learn</span><span className="text-2xl font-bold text-brand tracking-tight">ify</span>
        </div>
      ) : (
        <ol className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {crumbs.map((c, i) => (
            <li key={c.href} className="flex min-w-0 items-center gap-1.5">
              {i > 0 ? <span aria-hidden="true">/</span> : null}
              {i === crumbs.length - 1 ? (
                <span className="truncate font-medium text-foreground">{c.label}</span>
              ) : (
                <Link to={c.href} className="truncate hover:text-foreground hover:underline">
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}

function SearchCommand({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const navigate = useNavigate();
  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search students, courses, submissions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Courses">
          {courses.map((c) => (
            <CommandItem key={c.id} value={`${c.code} ${c.title}`} onSelect={() => go(`/courses/${c.id}`)}>
              <span className="num mr-2 text-muted-foreground">{c.code}</span>
              {c.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Submissions">
          {submissions.map((s) => (
            <CommandItem
              key={s.id}
              value={`${s.student} ${s.roll} ${s.assignment}`}
              onSelect={() => go(`/submissions/${s.id}`)}
            >
              <span className="num mr-2 text-muted-foreground">{s.roll}</span>
              {s.student} · {s.assignment}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => go("/reports")}>Reports</CommandItem>
          <CommandItem onSelect={() => go("/compare")}>Document Comparison</CommandItem>
          <CommandItem onSelect={() => go("/assignments/new")}>New Assignment</CommandItem>
          <CommandItem onSelect={() => go("/student")}>Student Portal</CommandItem>
          <CommandItem onSelect={() => go("/admin")}>Institution Dashboard</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function AppShell({
  role = "faculty",
  children,
}: {
  role?: ShellRole;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [semester, setSemester] = useState(semesters[0]);
  const [studentSwitcherOpen, setStudentSwitcherOpen] = useState(false);
  const { currentStudent } = useStudentSession();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <SidebarContent role={role} onOpenSwitcher={() => setStudentSwitcherOpen(true)} />
      </aside>

      <div className="lg:pl-64 p-4 h-screen w-full flex overflow-hidden">
        <div className="bg-card w-full h-full rounded-[2rem] shadow-lg flex flex-col overflow-hidden">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 px-6 py-4 bg-card">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 border-sidebar-border p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent
                role={role}
                onOpenSwitcher={() => setStudentSwitcherOpen(true)}
              />
            </SheetContent>
          </Sheet>

          <Breadcrumbs />

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-8 items-center gap-2 rounded-sm border border-input bg-background px-2.5 text-[12px] text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="num hidden rounded-xs border border-border px-1 text-[10px] sm:inline">⌘K</kbd>
            </button>

            <label className="sr-only" htmlFor="semester">
              Semester
            </label>
            <select
              id="semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="num hidden h-8 rounded-sm border border-input bg-background px-2 text-[12px] text-foreground sm:block"
            >
              {semesters.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <NotificationsPopover studentId={role === "student" ? currentStudent.id : undefined} />


            {role === "student" ? (
              <button
                type="button"
                onClick={() => setStudentSwitcherOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-accent hover:border-brand/40"
                title="Switch student profile or log out"
              >
                <span className="num flex size-6 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-brand-foreground">
                  {getInitials(currentStudent.full_name)}
                </span>
                <span className="hidden sm:inline font-medium text-[11px] max-w-[120px] truncate">
                  {currentStudent.full_name}
                </span>
                <span className="text-[10px] text-muted-foreground hidden md:inline">
                  ({currentStudent.roll_number})
                </span>
                <ArrowLeftRight className="size-3 text-muted-foreground ml-0.5" />
              </button>
            ) : (
              <Link
                to="/settings"
                className="num flex size-8 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-navy-foreground"
                aria-label="Profile"
              >
                {role === "admin" ? "AD" : "PK"}
              </Link>
            )}
          </div>
        </header>

          <main className="flex-1 overflow-y-auto px-6 py-5 sm:px-10">{children}</main>
        </div>
      </div>

      <SearchCommand open={open} setOpen={setOpen} />
      <StudentSwitcherDialog
        open={studentSwitcherOpen}
        onOpenChange={setStudentSwitcherOpen}
      />
    </div>
  );
}

export { GraduationCap };
