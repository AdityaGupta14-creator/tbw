import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Info, Save, ShieldCheck, Sliders, User } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Platform Settings — Verity" },
      {
        name: "description",
        content: "Institutional integrity thresholds, citation standards, and faculty review configuration.",
      },
      { property: "og:title", content: "Settings — Verity" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [similarityThreshold, setSimilarityThreshold] = useState("25");
  const [peerThreshold, setPeerThreshold] = useState("15");
  const [citationFormat, setCitationFormat] = useState("IEEE");
  const [writingPatternCheck, setWritingPatternCheck] = useState(true);
  const [crossInstitutionIndexing, setCrossInstitutionIndexing] = useState(true);
  const [notifyOnReview, setNotifyOnReview] = useState(true);
  const [notifyOnHighSimilarity, setNotifyOnHighSimilarity] = useState(true);

  const handleSave = () => {
    toast.success("Academic integrity configuration updated successfully");
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings & Integrity Policies"
        subtitle="Configure institution-wide analysis thresholds, citation rules, and review protocols."
        actions={
          <Button size="sm" onClick={handleSave} className="text-xs">
            <Save className="mr-1.5 size-3.5" /> Save Changes
          </Button>
        }
      />

      <div className="mt-6 max-w-4xl space-y-6 text-sm">
        {/* Faculty Profile Card */}
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <User className="size-4 text-brand" />
            <h2 className="font-semibold text-foreground">Faculty Reviewer Profile</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Full Name & Title</Label>
              <input
                type="text"
                defaultValue="Dr. P. Kulkarni"
                className="mt-1 h-8 w-full rounded-sm border border-input bg-background px-2.5 text-xs text-foreground"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Academic Department</Label>
              <input
                type="text"
                defaultValue="Department of Computer Engineering"
                className="mt-1 h-8 w-full rounded-sm border border-input bg-background px-2.5 text-xs text-foreground"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Institutional Email</Label>
              <input
                type="email"
                defaultValue="p.kulkarni@abcit.edu"
                className="mt-1 h-8 w-full rounded-sm border border-input bg-background px-2.5 text-xs text-foreground"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Current Active Semester</Label>
              <input
                type="text"
                defaultValue="2026–27 (Autumn Term)"
                disabled
                className="mt-1 h-8 w-full rounded-sm border border-input bg-muted/50 px-2.5 text-xs text-muted-foreground num"
              />
            </div>
          </div>
        </section>

        {/* Similarity Thresholds */}
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Sliders className="size-4 text-brand" />
            <h2 className="font-semibold text-foreground">Academic Integrity Thresholds</h2>
          </div>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sim-threshold" className="text-xs font-medium text-foreground">
                  Flag for Faculty Review Threshold
                </Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id="sim-threshold"
                    type="number"
                    value={similarityThreshold}
                    onChange={(e) => setSimilarityThreshold(e.target.value)}
                    className="h-8 w-24 rounded-sm border border-input bg-background px-2 text-xs num text-foreground"
                  />
                  <span className="text-xs text-muted-foreground">% textual overlap</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Submissions reaching this index are routed to the &quot;Requires Review&quot; queue.
                </p>
              </div>

              <div>
                <Label htmlFor="peer-threshold" className="text-xs font-medium text-foreground">
                  Student-to-Student Cohort Alert Threshold
                </Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id="peer-threshold"
                    type="number"
                    value={peerThreshold}
                    onChange={(e) => setPeerThreshold(e.target.value)}
                    className="h-8 w-24 rounded-sm border border-input bg-background px-2 text-xs num text-foreground"
                  />
                  <span className="text-xs text-muted-foreground">% shared passages</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Generates an automatic side-by-side comparison alert for the course guide.
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <Label className="text-xs font-medium text-foreground">Default Citation Standard</Label>
              <select
                value={citationFormat}
                onChange={(e) => setCitationFormat(e.target.value)}
                className="mt-1.5 block h-8 w-56 rounded-sm border border-input bg-background px-2 text-xs font-medium text-foreground"
              >
                <option value="IEEE">IEEE (Institute of Electrical and Electronics Engineers)</option>
                <option value="APA">APA 7th Edition</option>
                <option value="ACM">ACM (Association for Computing Machinery)</option>
                <option value="ASME">ASME (Mechanical Engineering Standard)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Verification Engine & Institutional Repositories */}
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <ShieldCheck className="size-4 text-brand" />
            <h2 className="font-semibold text-foreground">Analysis Engines & Data Repositories</h2>
          </div>
          <div className="mt-4 space-y-4 text-xs">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Writing-Pattern Analytical Indicators</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                  Generates probabilistic structural indicators (sentence cadence, vocabulary variance) for faculty guidance. Non-deterministic and never treated as conclusive evidence.
                </p>
              </div>
              <Switch checked={writingPatternCheck} onCheckedChange={setWritingPatternCheck} />
            </div>

            <div className="border-t border-border pt-3 flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Index to ABCIT Institutional Repository</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                  Archives evaluated submissions into the college private repository to protect student research against external re-use.
                </p>
              </div>
              <Switch checked={crossInstitutionIndexing} onCheckedChange={setCrossInstitutionIndexing} />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <h2 className="font-semibold text-foreground border-b border-border pb-3">Faculty Notification Routing</h2>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-foreground">Notify immediately when submission exceeds review threshold</span>
              <Switch checked={notifyOnReview} onCheckedChange={setNotifyOnReview} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">Send weekly integrity summary digest across all active courses</span>
              <Switch checked={notifyOnHighSimilarity} onCheckedChange={setNotifyOnHighSimilarity} />
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
