/**
 * Institutional Date & Time Formatting Utilities for Verity
 *
 * Provides standardized, consistent formatting across all faculty, student,
 * audit, and PDF views, avoiding raw ISO timestamps while preserving timezone integrity.
 */

const INSTITUTION_LOCALE = "en-IN";
const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Format date and time for institutional display.
 * Example output: "29 Sep 2026, 10:02 PM"
 */
export function formatInstitutionalDateTime(
  value: string | number | Date | null | undefined
): string {
  if (!value) return "N/A";

  // If already in friendly format like "Today, 11:08" or "Yesterday, 14:15", return as-is
  if (typeof value === "string") {
    if (value.startsWith("Today") || value.startsWith("Yesterday") || value.includes("Sep 2026")) {
      return value;
    }
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return String(value);
  }

  try {
    const datePart = date.toLocaleDateString(INSTITUTION_LOCALE, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: DEFAULT_TIMEZONE,
    });

    const timePart = date.toLocaleTimeString(INSTITUTION_LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: DEFAULT_TIMEZONE,
    });

    return `${datePart}, ${timePart}`;
  } catch {
    // Fallback if timezone not supported in environment
    const datePart = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timePart = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  }
}

/**
 * Format date only.
 * Example output: "29 Sep 2026"
 */
export function formatInstitutionalDate(
  value: string | number | Date | null | undefined
): string {
  if (!value) return "N/A";

  if (typeof value === "string" && !value.includes("T") && (value.includes("Today") || value.includes("2026"))) {
    return value.split(",")[0] || value;
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format time only.
 * Example output: "10:02 PM"
 */
export function formatInstitutionalTime(
  value: string | number | Date | null | undefined
): string {
  if (!value) return "";

  const date = new Date(value);
  if (isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Human-readable relative time or short date for timeline events and notifications.
 * Example: "Just now", "5 mins ago", "2 hours ago", or "29 Sep 2026, 10:02 PM"
 */
export function formatRelativeOrInstitutional(
  value: string | number | Date | null | undefined
): string {
  if (!value) return "Recently";

  if (typeof value === "string" && (value.startsWith("Today") || value.startsWith("Yesterday"))) {
    return value;
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  return formatInstitutionalDateTime(date);
}
