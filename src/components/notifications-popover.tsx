import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  Info,
  MessageCircle,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { verityApi } from "@/services/verity-api";
import type { StudentNotification, NotificationType } from "@/types/database";
import { formatInstitutionalDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface NotificationsPopoverProps {
  studentId?: string | undefined;
  className?: string | undefined;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "review_started":
      return <Clock className="size-4 text-blue-600 shrink-0 mt-0.5" />;
    case "explanation_requested":
      return <MessageSquare className="size-4 text-purple-600 shrink-0 mt-0.5" />;
    case "explanation_received":
      return <FileCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />;
    case "review_completed":
      return <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />;
    case "faculty_feedback":
      return <MessageCircle className="size-4 text-indigo-600 shrink-0 mt-0.5" />;
    case "system_update":
      return <ShieldAlert className="size-4 text-amber-600 shrink-0 mt-0.5" />;
    default:
      return <Info className="size-4 text-slate-600 shrink-0 mt-0.5" />;
  }
}

export function NotificationsPopover({ studentId, className }: NotificationsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const list = await verityApi.notifications.list(studentId);
      setNotifications(list);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  }, [studentId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    const handleUpdate = () => fetchNotifications();
    window.addEventListener("verity:notifications-updated", handleUpdate);
    window.addEventListener("verity:student-session-changed", handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener("verity:notifications-updated", handleUpdate);
      window.removeEventListener("verity:student-session-changed", handleUpdate);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await verityApi.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await verityApi.notifications.markAllAsRead(studentId);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClickItem = (n: StudentNotification) => {
    if (!n.is_read) {
      handleMarkAsRead(n.id);
    }
    setOpen(false);
    if (n.action_url) {
      if (n.action_url === "/student/feedback" || n.type === "faculty_feedback") {
        navigate({ to: "/student/feedback" });
      } else if (n.action_url.startsWith("/submissions/")) {
        const subId = n.action_url.replace("/submissions/", "");
        navigate({ to: "/submissions/$submissionId", params: { submissionId: subId } });
      } else {
        window.location.href = n.action_url;
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications (${unreadCount} unread)`}
          className={cn("relative size-8 text-muted-foreground hover:text-foreground", className)}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-xs animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 shadow-lg border border-border bg-card rounded-md overflow-hidden z-50"
      >
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Academic Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-xs bg-red-100 px-1.5 py-0.2 text-[10px] font-medium text-red-700 border border-red-200">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={loading}
              className="h-6 px-1.5 text-[11px] text-brand hover:text-brand-dark"
            >
              <CheckCheck className="mr-1 size-3" /> Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="py-8 text-center px-4">
              <Bell className="mx-auto size-6 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-medium text-foreground">No notifications</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Your academic integrity submissions and review statuses are up to date.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClickItem(n)}
                className={cn(
                  "p-3 text-left transition-colors cursor-pointer flex items-start gap-2.5 group relative hover:bg-muted/60",
                  !n.is_read ? "bg-brand/5 border-l-2 border-l-brand" : "bg-card"
                )}
              >
                {getNotificationIcon(n.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <p
                      className={cn(
                        "text-[12px] truncate",
                        !n.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                      )}
                    >
                      {n.title}
                    </p>
                    <span className="text-[9px] text-muted-foreground shrink-0 num">
                      {formatInstitutionalDateTime(n.created_at)}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                    {n.message}
                  </p>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="truncate max-w-[200px]">
                      {n.assignment_title || n.course_code || n.submission_id}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          title="Mark as read"
                          className="hover:text-foreground text-brand font-medium flex items-center gap-0.5"
                        >
                          <Check className="size-2.5" /> Read
                        </button>
                      )}
                      <ExternalLink className="size-2.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border bg-muted/20 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">
            Verity Institutional Notifications · Confidential & Authenticated
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
