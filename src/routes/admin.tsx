import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  Database,
  Download,
  GraduationCap,
  HardDrive,
  Layers,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatBar } from "@/components/stat-bar";
import { TableShell, Th, Td, Tr } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { departments } from "@/lib/mock-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Institution Dashboard — Verity" },
      {
        name: "description",
        content: "Institutional academic integrity administration for ABC Institute of Technology.",
      },
      { property: "og:title", content: "Institution Administration — Verity" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const totalFaculty = departments.reduce((acc, d) => acc + d.faculty, 0);
  const totalStudents = departments.reduce((acc, d) => acc + d.students, 0);
  const totalCourses = departments.reduce((acc, d) => acc + d.courses, 0);
  const totalSubmissions = departments.reduce((acc, d) => acc + d.submissions, 0);

  return (
    <AppShell role="admin">
      <PageHeader
        title="Institutional Academic Administration"
        subtitle="ABC Institute of Technology · Central Academic Integrity Management"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => toast.success("Institutional audit log exported")}
            >
              <Download className="mr-1.5 size-3.5" /> Export College Audit Log
            </Button>
            <Button asChild size="sm" className="text-xs">
              <Link to="/reports">Integrity Archive</Link>
            </Button>
          </div>
        }
      />

      <div className="mt-5">
        <StatBar
          stats={[
            { label: "Engineering Faculty", value: String(totalFaculty) },
            { label: "Enrolled Students", value: totalStudents.toLocaleString() },
            { label: "Active Courses", value: String(totalCourses) },
            { label: "Archived Submissions", value: totalSubmissions.toLocaleString() },
            { label: "Institutional Mean", value: "13.8%", tone: "success" },
          ]}
        />
      </div>

      {/* Department Breakdown Table */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">Department Analysis & Usage Overview</h2>
        <TableShell className="mt-2.5" caption="Department usage metrics">
          <thead>
            <tr>
              <Th>Engineering Department</Th>
              <Th numeric>Faculty</Th>
              <Th numeric>Enrolled Students</Th>
              <Th numeric>Active Courses</Th>
              <Th numeric>Submissions Evaluated</Th>
              <Th numeric>Review Rate</Th>
              <Th className="text-right">Audit Standing</Th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <Tr key={d.name}>
                <Td className="font-semibold text-foreground">{d.name}</Td>
                <Td numeric className="num text-muted-foreground">{d.faculty}</Td>
                <Td numeric className="num text-muted-foreground">{d.students}</Td>
                <Td numeric className="num text-muted-foreground">{d.courses}</Td>
                <Td numeric className="num font-medium text-foreground">
                  {d.submissions.toLocaleString()}
                </Td>
                <Td numeric className="num text-muted-foreground">3.8%</Td>
                <Td className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-xs bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success border border-success/20">
                    <CheckCircle2 className="size-3" /> Certified Compliant
                  </span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      </div>

      {/* Institutional Repository & Index Health */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <HardDrive className="size-4 text-brand" />
            <h2 className="text-sm font-semibold text-foreground">Institutional Document Repository</h2>
          </div>
          <div className="mt-3.5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Indexed Theses & Final Projects</span>
              <span className="num font-semibold text-foreground">1,420 documents</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Laboratory & Technical Coursework</span>
              <span className="num font-semibold text-foreground">12,860 documents</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cross-Institutional Consortium Pool</span>
              <span className="text-success font-medium flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Synchronized (84 Universities)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Internal Database Encryption</span>
              <span className="num text-foreground">AES-256 GCM (SHA-256 Fingerprint)</span>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <ShieldCheck className="size-4 text-brand" />
            <h2 className="text-sm font-semibold text-foreground">Integrity Policy Configuration</h2>
          </div>
          <div className="mt-3.5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">College-wide Notice Threshold</span>
              <span className="num font-semibold text-foreground">15% Overlap</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mandatory Review Threshold</span>
              <span className="num font-semibold text-foreground">25% Overlap</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Board Referral Threshold</span>
              <span className="num font-semibold text-danger">35% Overlap</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Approved Citation Formats</span>
              <span className="num text-foreground">IEEE, APA 7th, ASME</span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
