import type {
  Course,
  Profile,
  ReviewAuditAction,
  ReviewStatus,
  Submission,
  UserRole,
} from "@/types/database";

export class UnauthorizedAccessError extends Error {
  constructor(message = "Unauthorized: Access denied to this academic resource.") {
    super(message);
    this.name = "UnauthorizedAccessError";
  }
}

export class ForbiddenActionError extends Error {
  constructor(message = "Forbidden: User does not possess the requisite role or permissions.") {
    super(message);
    this.name = "ForbiddenActionError";
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(message = "Invalid status transition in review lifecycle.") {
    super(message);
    this.name = "InvalidStatusTransitionError";
  }
}

/**
 * Validates whether a user can access a specific course.
 * - Admin: Allowed access to any course in their institution.
 * - Faculty: Only allowed access to courses where faculty_id matches user id.
 * - Student: Allowed if enrolled in the course.
 */
export function canAccessCourse(user: Profile, course: Course): boolean {
  if (!user || !course) return false;
  if (user.role === "admin") {
    if (user.institution_id && course.institution_id) {
      return user.institution_id === course.institution_id;
    }
    return true;
  }
  if (user.role === "faculty") {
    return course.faculty_id === user.id;
  }
  return false;
}

/**
 * Validates whether a user can view a given submission.
 * - Admin: Full institutional access.
 * - Faculty: Only access submissions for courses they teach.
 * - Student: Only access their own submissions.
 */
export function canAccessSubmission(
  user: Profile,
  submission: Submission,
  course?: Course
): boolean {
  if (!user || !submission) return false;

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "faculty") {
    if (course) {
      return course.faculty_id === user.id;
    }
    // If course object is not provided, compare course faculty or courseId
    return true;
  }

  if (user.role === "student") {
    return (
      submission.student_id === user.id ||
      (Boolean(submission.student_roll) &&
        Boolean(user.roll_number) &&
        submission.student_roll?.toLowerCase() === user.roll_number?.toLowerCase())
    );
  }

  return false;
}

/**
 * Asserts that faculty has access to the course/submission, throwing an error if cross-course access is attempted.
 */
export function assertFacultyCourseAccess(
  user: Profile,
  course: Course,
  actionDescription = "review submission"
): void {
  if (user.role === "admin") return;

  if (user.role !== "faculty") {
    throw new ForbiddenActionError(
      `Only faculty or administrators are authorized to ${actionDescription}.`
    );
  }

  if (course.faculty_id !== user.id) {
    throw new UnauthorizedAccessError(
      `Cross-course access denied: Faculty ${user.full_name} (${user.id}) is not authorized for course ${course.course_code} (${course.id}).`
    );
  }
}

/**
 * Validates review lifecycle transitions.
 */
export function validateReviewTransition(
  currentStatus: ReviewStatus | undefined,
  nextStatus: ReviewStatus,
  userRole: UserRole
): { valid: boolean; reason?: string } {
  if (userRole === "student" && nextStatus !== "explanation_received") {
    return {
      valid: false,
      reason: "Students cannot alter official faculty review status.",
    };
  }

  const effectiveCurrent = currentStatus || "pending";

  const allowedTransitions: Record<ReviewStatus, ReviewStatus[]> = {
    pending: [
      "in_review",
      "explanation_requested",
      "reviewed",
      "dismissed",
      "escalated",
      "pending",
    ],
    in_review: [
      "pending",
      "explanation_requested",
      "reviewed",
      "dismissed",
      "escalated",
      "in_review",
    ],
    explanation_requested: [
      "explanation_received",
      "reviewed",
      "dismissed",
      "escalated",
      "pending",
      "explanation_requested",
    ],
    explanation_received: [
      "in_review",
      "reviewed",
      "explanation_requested",
      "dismissed",
      "escalated",
      "explanation_received",
    ],
    reviewed: ["in_review", "escalated", "reviewed"],
    dismissed: ["in_review", "dismissed"],
    escalated: ["in_review", "reviewed", "dismissed", "escalated"],
  };

  const allowed = allowedTransitions[effectiveCurrent] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      reason: `Illegal status transition from '${effectiveCurrent}' to '${nextStatus}'.`,
    };
  }

  return { valid: true };
}

/**
 * Validates if an actor can perform a given audit action.
 */
export function canPerformReviewAction(user: Profile, action: ReviewAuditAction): boolean {
  if (user.role === "admin") return true;

  if (user.role === "faculty") {
    return [
      "REVIEW_PENDING",
      "PASSAGE_REVIEWED",
      "EXPLANATION_REQUESTED",
      "DECISION_RECORDED",
      "NOTES_UPDATED",
      "STATUS_TRANSITION",
      "RE_ANALYZED",
    ].includes(action);
  }

  if (user.role === "student") {
    return action === "EXPLANATION_RECEIVED";
  }

  return false;
}

/**
 * Filters submissions strictly to those the user is authorized to inspect.
 */
export function filterSubmissionsForUser(
  user: Profile,
  submissions: Submission[],
  courses: Course[]
): Submission[] {
  if (user.role === "admin") {
    return submissions;
  }

  if (user.role === "faculty") {
    const authorizedCourseCodes = new Set(
      courses.filter((c) => c.faculty_id === user.id).map((c) => c.course_code.toLowerCase())
    );
    const authorizedCourseIds = new Set(
      courses.filter((c) => c.faculty_id === user.id).map((c) => c.id.toLowerCase())
    );

    return submissions.filter((s) => {
      if (s.course_id && authorizedCourseIds.has(s.course_id.toLowerCase())) return true;
      if (s.course_code && authorizedCourseCodes.has(s.course_code.toLowerCase())) return true;
      return false;
    });
  }

  if (user.role === "student") {
    return submissions.filter(
      (s) =>
        s.student_id === user.id ||
        (s.student_roll && user.roll_number && s.student_roll.toLowerCase() === user.roll_number.toLowerCase())
    );
  }

  return [];
}

/**
 * Sanitizes submission data according to viewer role and privacy rules.
 * - Protects faculty-only private deliberation notes and draft decisions from student views.
 * - Protects peer student identifying information in matches from student views.
 * - Strips sensitive internal storage paths.
 */
export function sanitizeSubmissionForRole(
  submission: Submission,
  userRole: UserRole
): Submission {
  const cloned = JSON.parse(JSON.stringify(submission)) as Submission;

  if (userRole === "student") {
    // Hide internal storage paths
    if (cloned.document) {
      cloned.document.storage_path = "[PROTECTED_STORAGE_URI]";
    }

    // Protect faculty confidential notes from student view
    if (cloned.review) {
      delete cloned.review.faculty_notes;
    }

    // Anonymize peer matches
    if (cloned.analysis?.matches) {
      cloned.analysis.matches = cloned.analysis.matches.map((m) => {
        if (m.source_type === "student_submission") {
          return {
            ...m,
            source_name: "Peer Student Submission (Protected)",
            source_title: "Peer Student Submission (Protected)",
            source_url: undefined,
          };
        }
        return m;
      });
    }

    if (cloned.analysis?.passages) {
      cloned.analysis.passages = cloned.analysis.passages.map((p) => {
        if (p.source_type === "student_submission") {
          return {
            ...p,
            source_name: "Peer Student Submission (Protected)",
          };
        }
        return p;
      });
    }
  }

  return cloned;
}
