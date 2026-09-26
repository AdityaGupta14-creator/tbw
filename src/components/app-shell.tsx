import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Bell,
  Building2,
  ClipboardList,
  FileText,
  GitCompare,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

const facultyNav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", to: "/courses", icon: BookOpen },
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

function SidebarContent({ role, onNavigate }: { role: ShellRole; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = role === "student" ? studentNav : role === "admin" ? adminNav : facultyNav;

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Link to="/" onClick={onNavigate} className="block">
          <span className="text-[15px] font-semibold tracking-[0.18em] text-sidebar-accent-foreground">
            VERITY
          </span>
          <span className="mt-0.5 block text-[11px] text-sidebar-foreground/70">
            Academic Integrity
          </span>
        </Link>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-3">
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
                    "flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-[13px] transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
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

        {role === "faculty" ? (
          <div className="mt-5 border-t border-sidebar-border pt-4">
            <p className="px-2.5 text-[10px] font-semibold tracking-[0.14em] text-sidebar-foreground/55 uppercase">
              Workspace
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {courses.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <Link
                    to="/courses/$courseId"
                    params={{ courseId: c.id }}
                    onClick={onNavigate}
                    className="flex items-center justify-between rounded-sm px-2.5 py-1.5 text-[12px] text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  >
                    <span className="num">{c.code}</span>
                    {c.pending > 0 ? (
                      <span className="num rounded-sm bg-sidebar-accent px-1.5 text-[10px] text-sidebar-accent-foreground">
                        {c.pending}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
        <div className="mt-3 flex items-center gap-2.5 rounded-sm bg-sidebar-accent/50 px-2.5 py-2">
          <span className="num flex size-7 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground">
            {role === "student" ? "RS" : role === "admin" ? "AD" : "PK"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-sidebar-accent-foreground">
              {role === "student" ? "Riya Sharma" : role === "admin" ? "Registrar Office" : "Dr. P. Kulkarni"}
            </p>
            <p className="num truncate text-[10px] text-sidebar-foreground/65">
              {role === "student" ? "22CSE057" : role === "admin" ? "Administrator" : "Computer Engineering"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const known = labels[seg];
    const course = courses.find((c) => c.id === seg);
    const sub = submissions.find((s) => s.id.toLowerCase() === seg.toLowerCase());
    const label = known ?? course?.code ?? sub?.assignment ?? seg.replace(/-/g, " ");
    return { href, label };
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
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
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-sidebar-border lg:block">
        <SidebarContent role={role} />
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-13 items-center gap-3 border-b border-border bg-card px-4 py-2.5">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 border-sidebar-border p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent role={role} />
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

            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative size-8">
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger" />
            </Button>

            <Link
              to={role === "student" ? "/student" : "/settings"}
              className="num flex size-8 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-navy-foreground"
              aria-label="Profile"
            >
              {role === "student" ? "RS" : role === "admin" ? "AD" : "PK"}
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6">{children}</main>
      </div>

      <SearchCommand open={open} setOpen={setOpen} />
    </div>
  );
}

export { GraduationCap };
