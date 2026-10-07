import { useState } from "react";
import { Check, LogOut, Plus, User, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStudentSession } from "@/lib/student-session";
import { verityApi } from "@/services/verity-api";

interface StudentSwitcherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentSwitcherDialog({ open, onOpenChange }: StudentSwitcherDialogProps) {
  const { currentStudent, allStudents, switchStudent, logoutStudent, reloadStudents } =
    useStudentSession();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRoll, setNewRoll] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectStudent = (studentId: string) => {
    switchStudent(studentId);
    const chosen = allStudents.find((s) => s.id === studentId);
    toast.success(`Logged in as ${chosen?.full_name || "Student"}`, {
      description: `Roll: ${chosen?.roll_number || "Active Session"}`,
    });
    onOpenChange(false);
  };

  const handleLogout = () => {
    logoutStudent();
    toast.info("Logged out of student account");
    onOpenChange(false);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRoll.trim() || !newEmail.trim()) {
      toast.error("Please fill in student name, roll number, and email");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await verityApi.students.create({
        full_name: newName.trim(),
        roll_number: newRoll.trim().toUpperCase(),
        email: newEmail.trim().toLowerCase(),
        department_name: "Computer Engineering",
      });

      await reloadStudents();
      switchStudent(created.id);
      toast.success(`Registered and logged in as ${created.full_name}!`);
      setShowAddForm(false);
      setNewName("");
      setNewRoll("");
      setNewEmail("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to register student");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl max-w-xl overflow-hidden p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-brand" />
            Switch Student Account
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select an engineering student profile to log in as and submit coursework.
          </DialogDescription>
        </DialogHeader>

        {!showAddForm ? (
          <div className="space-y-4 w-full min-w-0 max-w-full overflow-hidden">
            <div className="max-h-[320px] overflow-y-auto overflow-x-hidden space-y-2 pr-1.5 w-full min-w-0">
              {allStudents.map((s) => {
                const isActive = s.id === currentStudent.id || s.roll_number === currentStudent.roll_number;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStudent(s.id)}
                    className={`w-full max-w-full min-w-0 block text-left p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "border-brand bg-card shadow-xs ring-1 ring-brand/30"
                        : "border-border/80 bg-card hover:bg-card/90 hover:border-input shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 w-full min-w-0">
                      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                        <div
                          className={`size-8 sm:size-8.5 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                            isActive
                              ? "bg-brand text-brand-foreground shadow-xs"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {s.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="text-xs font-semibold text-foreground truncate block">
                            {s.full_name}
                          </p>
                          <p
                            className="num text-[11px] text-muted-foreground truncate block"
                            title={`${s.roll_number || "Student"} · ${s.department_name || "Electronics and Computer Science Engineering"} (Section ${s.section || "B"}, ${s.batch || "Batch 3"})`}
                          >
                            {s.roll_number || "Student"} · {s.department_name || "Electronics and Computer Science Engineering"} (Section {s.section || "B"}, {s.batch || "Batch 3"})
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center pl-1">
                        {isActive ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                            <Check className="size-3" /> Active
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-md whitespace-nowrap hover:text-foreground">
                            Select
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-border/80 gap-2 w-full min-w-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 shrink-0 bg-card hover:bg-card/80"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="size-3.5" /> Enroll New Student
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-danger hover:text-danger hover:bg-danger/10 gap-1.5 shrink-0"
                onClick={handleLogout}
              >
                <LogOut className="size-3.5" /> Log Out
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateStudent} className="space-y-3.5 w-full min-w-0">
            <div className="space-y-1">
              <Label htmlFor="new-name" className="text-xs">
                Full Name
              </Label>
              <Input
                id="new-name"
                placeholder="e.g. Vikram Malhotra"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-roll" className="text-xs">
                Roll Number
              </Label>
              <Input
                id="new-roll"
                placeholder="e.g. 25108k002"
                value={newRoll}
                onChange={(e) => setNewRoll(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-email" className="text-xs">
                Institutional Email
              </Label>
              <Input
                id="new-email"
                type="email"
                placeholder="e.g. vikram.m@college.edu"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2.5 border-t border-border/80">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                disabled={isSubmitting}
              >
                Back to List
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Enrolling..." : "Enroll & Log In"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
