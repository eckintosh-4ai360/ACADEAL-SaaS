//* Pop-out window system
//* Lets users detach any dashboard screen into its own browser window so several
//* screens can be worked on at once without navigating back and forth.
//*
//* Detection is two-pronged:
//*   1. `?popout=1` on the URL  — makes a popped-out screen shareable/bookmarkable
//*   2. `window.name` marker    — survives in-window navigation, so following a
//*                                link inside a popped-out window keeps it chrome-free
//* The pre-paint script in the root layout reads both and stamps `data-popout="1"`
//* on <html> before first paint, so the chrome never flashes.

export const POPOUT_PARAM = "popout";
export const POPOUT_NAME_PREFIX = "skpop:";

export interface PopoutEntry {
  //* Stable identity for the window — the pathname, so a screen gets one window
  //* no matter which filters/pagination were active when it was detached
  key: string;
  href: string;
  title: string;
  openedAt: number;
  win: Window;
}

export interface OpenPopoutOptions {
  href: string;
  title?: string;
  width?: number;
  height?: number;
}

export type OpenPopoutResult =
  | { ok: true; reused: boolean; entry: PopoutEntry }
  | { ok: false; reason: "blocked" | "unsupported" };

//* ---------------------------------------------------------------------------
//* Route titles (used for window titles and the open-windows menu)
//* ---------------------------------------------------------------------------

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/admins": "Admins",
  "/dashboard/teachers": "Teachers",
  "/dashboard/students": "Students",
  "/dashboard/parents": "Parents",
  "/dashboard/staff": "Staff & HR",
  "/dashboard/hr": "HR Overview",
  "/dashboard/hr/payroll": "Payroll",
  "/dashboard/hr/payslips": "Payslips",
  "/dashboard/my-payslips": "My Payslips",
  "/dashboard/hr/leave": "Leave",
  "/dashboard/hr/appraisals": "Appraisals",
  "/dashboard/classes": "Classes",
  "/dashboard/subjects": "Subjects",
  "/dashboard/schedule": "Schedule",
  "/dashboard/lessons": "Lessons",
  "/dashboard/lessons/library": "Library",
  "/dashboard/lessons/video-lessons": "Video Lessons",
  "/dashboard/lessons/reference": "Reference",
  "/dashboard/lessons/regulations": "Regulations",
  "/dashboard/lessons/syllabi": "Syllabi",
  "/dashboard/academics": "Academics",
  "/dashboard/academics/necessities": "Lesson Necessities",
  "/dashboard/academics/notes": "Notes",
  "/dashboard/academics/study-tools": "Study Tools",
  "/dashboard/acadeal-ai": "Acadeal AI",
  "/dashboard/exams": "Exams",
  "/dashboard/assignments": "Assignments",
  "/dashboard/results": "Results",
  "/dashboard/teachers/report-card": "Report Cards",
  "/dashboard/student-report-cards": "My Report Cards",
  "/dashboard/parent-report-cards": "Report Cards",
  "/dashboard/analytics": "Analytics",
  "/dashboard/attendance": "Attendance",
  "/dashboard/behavior": "Behaviour",
  "/dashboard/announcements": "Announcements",
  "/dashboard/messages": "Messages",
  "/dashboard/meetings": "Meetings",
  "/dashboard/sms": "SMS",
  "/dashboard/events": "Events",
  "/dashboard/system-chat": "System Chat",
  "/dashboard/excursion": "Excursions",
  "/dashboard/collections": "Collections",
  "/dashboard/fees": "Fees",
  "/dashboard/fees/my-fees": "My Fees",
  "/dashboard/finance": "Finance",
  "/dashboard/inventory": "Inventory",
  "/dashboard/utilities/dropout-students": "Dropout Students",
  "/dashboard/utilities/migrate-class": "Migrate Class",
  "/dashboard/utilities/old-students": "Old Students",
  "/dashboard/settings": "Settings",
  "/dashboard/email-templates": "Email Templates",
  "/dashboard/platform/schools": "Schools",
  "/dashboard/logs": "Activity Logs",
  "/dashboard/notifications": "Notifications",
  "/dashboard/upgrade": "Upgrade",
  "/audit-logs": "Audit Logs",
};

//* Segments that are clearly record ids rather than readable route names
const ID_LIKE = /^(c[a-z0-9]{16,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)$/i;

function titleCase(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

//* Human-readable label for a route, falling back to the last meaningful segment
export function routeTitle(pathname: string): string {
  const clean = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  if (ROUTE_TITLES[clean]) return ROUTE_TITLES[clean];

  const segments = clean.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";

  const last = segments[segments.length - 1];
  if (ID_LIKE.test(last) && segments.length > 1) {
    //* e.g. /dashboard/students/clx123 -> "Student Details"
    const parent = segments[segments.length - 2];
    const singular = parent.endsWith("s") ? parent.slice(0, -1) : parent;
    return `${titleCase(singular)} Details`;
  }

  return titleCase(last);
}

//* ---------------------------------------------------------------------------
//* URL + window-name helpers
//* ---------------------------------------------------------------------------

export function buildPopoutUrl(href: string): string {
  const [path, hash] = href.split("#");
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set(POPOUT_PARAM, "1");
  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

//* Strip the popout marker — used when handing a route back to the main window
export function stripPopoutParam(href: string): string {
  const [path, hash] = href.split("#");
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete(POPOUT_PARAM);
  const rest = params.toString();
  return `${pathname}${rest ? `?${rest}` : ""}${hash ? `#${hash}` : ""}`;
}

export function popoutWindowName(key: string): string {
  return POPOUT_NAME_PREFIX + key.replace(/[^a-zA-Z0-9]/g, "_");
}

//* True when the current window is a detached screen
export function isPopoutWindow(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.name && window.name.startsWith(POPOUT_NAME_PREFIX)) return true;
    return new URLSearchParams(window.location.search).get(POPOUT_PARAM) === "1";
  } catch {
    return false;
  }
}

//* ---------------------------------------------------------------------------
//* Open-window registry
//* ---------------------------------------------------------------------------

const registry = new Map<string, PopoutEntry>();
const listeners = new Set<() => void>();
let pruneTimer: ReturnType<typeof setInterval> | null = null;
let cascadeStep = 0;

//* Cached, referentially-stable snapshot — `useSyncExternalStore` re-renders in a
//* loop if the getter hands back a fresh array on every call.
let snapshot: PopoutEntry[] = [];

function emit() {
  snapshot = Array.from(registry.values()).sort((a, b) => a.openedAt - b.openedAt);
  listeners.forEach((listener) => listener());
}

function prune() {
  let changed = false;
  registry.forEach((entry, key) => {
    if (entry.win.closed) {
      registry.delete(key);
      changed = true;
    }
  });
  if (registry.size === 0) cascadeStep = 0;
  if (changed) emit();
  if (registry.size === 0 && pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
}

function ensurePruneTimer() {
  if (pruneTimer || typeof window === "undefined") return;
  //* Popped windows can be closed by the OS chrome, which we cannot hook —
  //* poll for `closed` so the open-windows menu stays truthful.
  pruneTimer = setInterval(prune, 1500);
}

export function subscribePopouts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function listOpenPopouts(): PopoutEntry[] {
  return snapshot;
}

//* Cascade each new window so they do not land exactly on top of each other
function nextWindowFeatures(width: number, height: number): string {
  const offset = (cascadeStep % 6) * 34;
  cascadeStep += 1;

  const availWidth = typeof screen !== "undefined" ? screen.availWidth : 1440;
  const availHeight = typeof screen !== "undefined" ? screen.availHeight : 900;

  const w = Math.min(width, availWidth - 80);
  const h = Math.min(height, availHeight - 80);

  //* Anchor to the screen the main window currently lives on (multi-monitor safe)
  const baseLeft = typeof window !== "undefined" ? window.screenX : 0;
  const baseTop = typeof window !== "undefined" ? window.screenY : 0;
  const left = Math.max(0, baseLeft + 60 + offset);
  const top = Math.max(0, baseTop + 60 + offset);

  return [
    "popup=yes",
    "noopener=no",
    `width=${Math.round(w)}`,
    `height=${Math.round(h)}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    "menubar=no",
    "toolbar=no",
    "location=no",
    "status=no",
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");
}

//* Detach a route into its own window. Re-opening the same route focuses the
//* window that is already showing it instead of spawning a duplicate.
export function openPopout({
  href,
  title,
  width = 1180,
  height = 820,
}: OpenPopoutOptions): OpenPopoutResult {
  if (typeof window === "undefined") return { ok: false, reason: "unsupported" };

  //* One window per screen, keyed on the pathname alone
  const key = stripPopoutParam(href).split("?")[0];
  const label = title ?? routeTitle(key);
  const existing = registry.get(key);

  if (existing && !existing.win.closed) {
    //* Focus only — never re-navigate, which would throw away whatever the user
    //* has in progress in that window.
    existing.win.focus();
    return { ok: true, reused: true, entry: existing };
  }

  const opened = window.open(
    buildPopoutUrl(href),
    popoutWindowName(key),
    nextWindowFeatures(width, height)
  );

  if (!opened) {
    //* Almost always a popup blocker; caller surfaces this to the user
    return { ok: false, reason: "blocked" };
  }

  const entry: PopoutEntry = {
    key,
    href,
    title: label,
    openedAt: Date.now(),
    win: opened,
  };

  registry.set(key, entry);
  ensurePruneTimer();
  emit();
  opened.focus();

  return { ok: true, reused: false, entry };
}

export function focusPopout(key: string): void {
  const entry = registry.get(key);
  if (entry && !entry.win.closed) entry.win.focus();
  else prune();
}

export function closePopout(key: string): void {
  const entry = registry.get(key);
  if (entry && !entry.win.closed) entry.win.close();
  registry.delete(key);
  emit();
}

export function closeAllPopouts(): void {
  registry.forEach((entry) => {
    if (!entry.win.closed) entry.win.close();
  });
  registry.clear();
  cascadeStep = 0;
  emit();
}
