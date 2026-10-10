import { NextResponse } from "next/server";
import {
  findTenantBySchoolCode,
  getSessionTenantSlug,
  getTenantPublicProfile,
  TENANT_HINT_COOKIE_NAME,
} from "@/lib/tenant";

type TenantSelectPayload = {
  schoolCode?: unknown;
};

export async function POST(request: Request) {
  //* This hint exists so the sign-in screen can find the right school before
  //* there is a session. Once signed in the tenant comes from the token, so
  //* accepting a change here would only ever be an attempt to switch schools
  //* mid-session.
  if (await getSessionTenantSlug()) {
    return NextResponse.json(
      { error: "Sign out before switching schools." },
      { status: 409 }
    );
  }

  let payload: TenantSelectPayload | null = null;

  try {
    payload = (await request.json()) as TenantSelectPayload;
  } catch {
    payload = null;
  }

  const schoolCode =
    typeof payload?.schoolCode === "string" ? payload.schoolCode.trim() : "";

  if (!schoolCode) {
    return NextResponse.json(
      { error: "School code is required." },
      { status: 400 }
    );
  }

  const tenant = await findTenantBySchoolCode(schoolCode);

  if (!tenant) {
    return NextResponse.json(
      { error: "School code not found." },
      { status: 404 }
    );
  }

  const response = NextResponse.json({
    success: true,
    tenant: getTenantPublicProfile(tenant),
  });

  response.cookies.set(TENANT_HINT_COOKIE_NAME, tenant.slug, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(TENANT_HINT_COOKIE_NAME);
  return response;
}
