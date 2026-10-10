import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  findControlPlaneSchoolTenantByHostname,
  getTenantBillingState,
} from "@/lib/control-plane";
import {
  getModuleSegmentFromPath,
  isGatedModule,
  lowestTierWithModule,
  tierIncludesModule,
} from "@/lib/plans";

// ─────────────────────────────────────────────
//  ROUTE PERMISSION MATRIX
//  Defines which roles can access which paths.
//  Paths are matched with startsWith, so
//  "/dashboard/teachers" covers all sub-routes.
// ─────────────────────────────────────────────

type Role = "admin" | "teacher" | "student" | "parent";

interface RouteRule {
  path: string;
  allowed: Role[];
}

const ROUTE_RULES: RouteRule[] = [
  // ── Admin-only routes ──────────────────────
  { path: "/dashboard/admins",         allowed: ["admin"] },
  { path: "/dashboard/teachers/report-card", allowed: ["admin", "teacher"] },
  { path: "/dashboard/teachers",       allowed: ["admin"] },
  { path: "/dashboard/classes",        allowed: ["admin"] },
  { path: "/dashboard/parents",        allowed: ["admin"] },
  { path: "/dashboard/logs",           allowed: ["admin"] },
  { path: "/dashboard/analytics",      allowed: ["admin"] },
  { path: "/dashboard/settings",       allowed: ["admin"] },
  { path: "/dashboard/platform",       allowed: ["admin"] },
  { path: "/dashboard/sms",            allowed: ["admin"] },
  { path: "/dashboard/utilities",      allowed: ["admin"] },
  { path: "/dashboard/report-builder", allowed: ["admin"] },
  { path: "/dashboard/behavior",       allowed: ["admin"] },

  // ── Finance: admin, student (own), parent (children) ─────
  // Teachers are explicitly excluded — handled here.
  { path: "/dashboard/collections",    allowed: ["admin", "teacher"] },
  { path: "/dashboard/fees/my-fees",   allowed: ["student", "parent"] },
  { path: "/dashboard/fees",           allowed: ["admin", "teacher"] },

  // ── Staff self-service ─────────────────────
  { path: "/dashboard/my-payslips",    allowed: ["teacher"] },

  // ── Academic management ────────────────────
  // Students page: admin and teacher can view (teacher is read-only in UI)
  { path: "/dashboard/students",       allowed: ["admin", "teacher"] },
  { path: "/dashboard/admissions",     allowed: ["admin", "teacher"] },

  // ── Subjects & Lessons ─────────────────────
  { path: "/dashboard/subjects",       allowed: ["admin", "teacher"] },
  { path: "/dashboard/lessons/syllabi", allowed: ["admin", "teacher", "student"] },
  { path: "/dashboard/lessons/reference", allowed: ["admin", "teacher", "student"] },
  { path: "/dashboard/lessons/regulations", allowed: ["admin", "teacher", "student", "parent"] },
  { path: "/dashboard/lessons/library", allowed: ["admin", "teacher", "student", "parent"] },
  { path: "/dashboard/lessons/video-lessons", allowed: ["admin", "teacher", "student"] },
  { path: "/dashboard/lessons",        allowed: ["admin", "teacher"] },

  // ── Attendance: admin + teacher can mark; students view own ─
  { path: "/dashboard/attendance",     allowed: ["admin", "teacher", "student"] },

  // ── Exams & Assignments ────────────────────
  { path: "/dashboard/exams",          allowed: ["admin", "teacher", "student"] },
  { path: "/dashboard/assignments",    allowed: ["admin", "teacher", "student"] },

  // ── Results ───────────────────────────────
  { path: "/dashboard/results",        allowed: ["admin", "teacher", "student", "parent"] },

  // ── Study tools & Learning tools ──────────
  { path: "/dashboard/academics",      allowed: ["admin", "teacher", "student"] },
  { path: "/dashboard/learning-tools", allowed: ["admin", "teacher", "student"] },

  // ── Announcements & Messages ───────────────
  { path: "/dashboard/announcements",  allowed: ["admin", "teacher", "student", "parent"] },
  { path: "/dashboard/messages",       allowed: ["admin", "teacher", "student", "parent"] },

  // ── Events ────────────────────────────────
  { path: "/dashboard/events",         allowed: ["admin", "teacher", "student", "parent"] },
];

// ─────────────────────────────────────────────
//  Helper: check if a role is permitted for url
// ─────────────────────────────────────────────
function isAllowed(pathname: string, role: Role): boolean {
  // Find the most-specific matching rule (longest prefix wins)
  const matching = ROUTE_RULES
    .filter(rule => pathname.startsWith(rule.path))
    .sort((a, b) => b.path.length - a.path.length);

  if (matching.length === 0) {
    // No specific rule found — allow if authenticated (e.g. /dashboard home)
    return true;
  }

  return matching[0].allowed.includes(role);
}

/**
 * Next.js 16 Proxy layer (formerly Middleware)
 * Handles routing and RBAC checks.
 * @see https://nextjs.org/docs/messages/middleware-to-proxy
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/school-disabled") ||
    pathname.startsWith("/subscription-suspended")
  ) {
    return NextResponse.next();
  }

  const hostname = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const controlPlaneTenant = await findControlPlaneSchoolTenantByHostname(hostname);

  if (controlPlaneTenant && !controlPlaneTenant.enabled) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "SCHOOL_DISABLED",
          message: `${controlPlaneTenant.schoolName} is currently disabled.`,
        },
        { status: 423 }
      );
    }

    const disabledUrl = request.nextUrl.clone();
    disabledUrl.pathname = "/school-disabled";
    disabledUrl.search = "";
    disabledUrl.searchParams.set("school", controlPlaneTenant.schoolName);
    return NextResponse.rewrite(disabledUrl);
  }

  // ── Subscription lockout ───────────────────
  // Distinct from the disabled switch above: this school is enabled, its
  // subscription has simply lapsed past the grace period. The platform console
  // is exempt so a lapsed default tenant can never lock the operator out of
  // the tools needed to fix it.
  const billing = controlPlaneTenant
    ? getTenantBillingState(controlPlaneTenant)
    : null;
  const isPlatformConsolePath = pathname.startsWith("/dashboard/platform");

  if (billing && !billing.hasAccess && !isPlatformConsolePath) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "SUBSCRIPTION_INACTIVE",
          message: `${controlPlaneTenant?.schoolName ?? "This school"} has no active subscription.`,
          status: billing.status,
        },
        { status: 402 }
      );
    }

    const suspendedUrl = request.nextUrl.clone();
    suspendedUrl.pathname = "/subscription-suspended";
    suspendedUrl.search = "";
    suspendedUrl.searchParams.set(
      "school",
      controlPlaneTenant?.schoolName ?? ""
    );
    suspendedUrl.searchParams.set("status", billing.status);
    return NextResponse.rewrite(suspendedUrl);
  }

  // ── Plan entitlement ───────────────────────
  // Checked before the dashboard-only early return below, because API routes
  // need it too. It used to sit after that return with an `/api/` branch that
  // could never execute, so a school on the cheapest tier reached every gated
  // module by calling its API routes directly.
  const moduleSegment = getModuleSegmentFromPath(pathname);

  if (
    controlPlaneTenant &&
    moduleSegment &&
    isGatedModule(moduleSegment) &&
    !tierIncludesModule(controlPlaneTenant.planTier, moduleSegment)
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "PLAN_UPGRADE_REQUIRED",
          message: `The ${moduleSegment} module is not included in this plan.`,
          requiredTier: lowestTierWithModule(moduleSegment),
        },
        { status: 402 }
      );
    }

    if (pathname.startsWith("/dashboard")) {
      const upgradeUrl = new URL("/dashboard/upgrade", request.url);
      upgradeUrl.searchParams.set("module", moduleSegment);
      return NextResponse.redirect(upgradeUrl);
    }
  }

  // Only care about dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not authenticated — redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token.role as Role) || "student";

  // Check permission
  if (!isAllowed(pathname, role)) {
    // Redirect forbidden users back to dashboard home
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
