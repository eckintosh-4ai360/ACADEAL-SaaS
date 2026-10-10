import { NextResponse } from "next/server";
import { getTenantPublicProfile, resolveTenantContext } from "@/lib/tenant";
import { isPlatformRequest } from "@/lib/platformAccess";

export async function GET() {
  const [tenantContext, platformRequest] = await Promise.all([
    resolveTenantContext(),
    isPlatformRequest(),
  ]);

  return NextResponse.json({
    source: tenantContext.source,
    tenant: getTenantPublicProfile(tenantContext.tenant),
    isPlatformRequest: platformRequest,
  });
}
