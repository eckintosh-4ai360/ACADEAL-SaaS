import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import {
  getControlPlaneStatus,
  listControlPlaneSchoolTenants,
  summarizeControlPlaneSchoolTenant,
} from "@/lib/control-plane";
import { isPlatformRequest } from "@/lib/platformAccess";
import { SchoolControlPlaneClient } from "@/components/platform/SchoolControlPlaneClient";
import { SchoolSubscriptionManager } from "@/components/platform/SchoolSubscriptionManager";

export const dynamic = "force-dynamic";

export default async function PlatformSchoolsPage() {
  const session = await getServerSession(authOptions);
  const platformRequest = await isPlatformRequest();

  if (
    !platformRequest ||
    !session ||
    session.user.role !== "admin" ||
    session.user.adminRole !== "SUPER_ADMIN"
  ) {
    redirect("/dashboard");
  }

  const [controlPlaneStatus, schoolTenants] = await Promise.all([
    getControlPlaneStatus(),
    listControlPlaneSchoolTenants(),
  ]);

  const schools = schoolTenants.map((tenant) => ({
    ...summarizeControlPlaneSchoolTenant(tenant),
    publicAppUrl: tenant.publicAppUrl,
    domains: tenant.domains,
    loginCodes: tenant.loginCodes,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Building2 className="h-8 w-8 text-blue-600" />
            School Onboarding
          </h1>
          <p className="mt-1 text-gray-500">
            Manage the platform registry that maps each school domain to its own Neon
            database.
          </p>
        </div>
      </div>

      <SchoolControlPlaneClient
        controlPlaneConfigured={controlPlaneStatus.configured}
        controlPlaneHost={controlPlaneStatus.connectionHost}
        schools={schools}
      />

      <SchoolSubscriptionManager
        schools={schools.map((school) => ({
          id: school.id,
          schoolName: school.schoolName,
          slug: school.slug,
          planTier: school.planTier,
          planLabel: school.planLabel,
          billingStatus: school.billingStatus,
          hasAccess: school.hasAccess,
          daysRemaining: school.daysRemaining,
          paidThrough: school.paidThrough,
          trialEndsAt: school.trialEndsAt,
          studentCap: school.studentCap,
        }))}
      />
    </div>
  );
}
