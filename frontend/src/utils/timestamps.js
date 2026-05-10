// Format: "Jan 15, 3:42 PM"
export function formatLabelTimestamp(date = new Date()) {
  const d = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const t = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${d}, ${t}`;
}

// Default answer label, e.g., "Version 1 · Jan 15, 3:42 PM"
export function defaultAnswerLabel(versionNumber) {
  return `Version ${versionNumber} · ${formatLabelTimestamp()}`;
}

// Default practice tag, e.g., "Attempt 1 · Jan 15, 3:42 PM"
export function defaultPracticeTag(attemptNumber) {
  return `Attempt ${attemptNumber} · ${formatLabelTimestamp()}`;
}
