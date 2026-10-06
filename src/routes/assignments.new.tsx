import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  FileText, 
  UploadCloud, 
  Plus, 
  RefreshCw, 
  Eye, 
  Settings 
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { verityApi } from "@/services/verity-api";

export const Route = createFileRoute("/assignments/new")({
  head: () => ({
    meta: [
      { title: "Create Assignment — Verity" },
    ],
  }),
  component: NewAssignment,
});

const INTEGRITY_SETTINGS = [
  { id: "student-overlap", label: "Analyze student-to-student overlap" },
  { id: "reference-sources", label: "Analyze uploaded reference sources" },
  { id: "citation-analysis", label: "Citation analysis" },
  { id: "semantic-similarity", label: "Semantic similarity" },
  { id: "fuzzy-similarity", label: "Fuzzy similarity" },
];

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function NewAssignment() {
  const navigate = useNavigate();
  
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<Record<string, boolean>>({
    "student-overlap": true,
    "reference-sources": true,
    "citation-analysis": true,
    "semantic-similarity": true,
    "fuzzy-similarity": true,
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const created = await verityApi.assignments.create({
        title: title.trim(),
        course_code: course.trim(), // simple parsing for now
        course_id: "c0000000-0000-0000-0000-000000000005", // mock fallback
        description: description,
        due_date: deadline,
        enable_similarity: !!settings["student-overlap"] || !!settings["reference-sources"],
        enable_student_comparison: !!settings["student-overlap"],
        enable_citation_analysis: !!settings["citation-analysis"],
        // map other settings if applicable
      });
      
      toast.success("Assignment created successfully!", {
        description: created.title,
      });
      navigate({ to: "/assignments" });
    } catch (err: any) {
      toast.error("Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSetting = (id: string) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl py-8 px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-10">
          
          {/* Header */}
          <div className="border-b border-border pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase">Create Assignment</h1>
          </div>
          
          {/* Main Form Fields */}
          <div className="space-y-6">
            <Field label="Assignment Title" htmlFor="title">
              <Input 
                id="title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="h-11 bg-background text-base"
                placeholder="Enter assignment title"
              />
            </Field>

            <Field label="Course" htmlFor="course">
              <Input 
                id="course" 
                value={course} 
                onChange={e => setCourse(e.target.value)} 
                className="h-11 bg-background text-base"
                placeholder="e.g. EXCS-B — Python Programming"
              />
            </Field>

            <Field label="Description" htmlFor="description">
              <Textarea 
                id="description" 
                rows={4} 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="resize-none bg-background p-3 text-base"
                placeholder="Describe the assignment requirements..."
              />
            </Field>

            <Field label="Deadline" htmlFor="deadline">
              <Input 
                id="deadline" 
                value={deadline} 
                onChange={e => setDeadline(e.target.value)} 
                className="h-11 bg-background text-base"
                placeholder="e.g. 10 October 2026"
              />
            </Field>
          </div>

          {/* Assignment Questions / Instructions Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Assignment Questions / Instructions</h2>
            
            {uploadedFile ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 flex flex-col items-center justify-center text-center space-y-4 transition-all hover:bg-muted/30">
                <div className="rounded-full bg-brand/10 p-3">
                  <FileText className="size-6 text-brand" />
                </div>
                <div className="font-medium text-foreground">{uploadedFile}</div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" type="button" className="gap-2" onClick={() => setUploadedFile(null)}>
                    <RefreshCw className="size-4" /> Replace
                  </Button>
                  <Button variant="secondary" size="sm" type="button" className="gap-2">
                    <Eye className="size-4" /> View
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="rounded-xl border border-dashed border-border bg-card p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer" 
                onClick={() => setUploadedFile("Python_Data_Analysis.pdf")}
              >
                <div className="rounded-full bg-muted p-3 mb-3">
                  <UploadCloud className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Click to upload PDF / DOCX</p>
                <p className="text-xs text-muted-foreground mt-1">Maximum file size: 50MB</p>
              </div>
            )}

            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">OR</span>
              <div className="h-px bg-border flex-1" />
            </div>

            <Button variant="outline" type="button" className="w-full gap-2 h-12 border-dashed text-base">
              <Plus className="size-5" /> Add Questions Manually
            </Button>
          </div>

          {/* Integrity Settings */}
          <div className="space-y-4 pt-4">
            <div className="border-b border-border pb-3 flex items-center gap-2">
              <Settings className="size-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Integrity Settings</h2>
            </div>
            
            <div className="space-y-3 pt-2">
              {INTEGRITY_SETTINGS.map((setting) => (
                <label 
                  key={setting.id} 
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <Checkbox 
                    id={setting.id}
                    checked={!!settings[setting.id]} 
                    onCheckedChange={() => toggleSetting(setting.id)} 
                    className="data-[state=checked]:bg-brand data-[state=checked]:border-brand size-5"
                  />
                  <span className="text-base font-medium text-foreground group-hover:text-brand transition-colors">
                    {setting.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-8">
            <Button type="submit" size="lg" className="w-full text-base font-semibold h-14" disabled={submitting}>
              {submitting ? "Creating Assignment..." : "Create Assignment"}
            </Button>
          </div>
          
        </form>
      </div>
    </AppShell>
  );
}
