import { NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/settings";

export async function GET() {
  try {
    const settings = await getSystemSettings();
    const publicSettings = {
      schoolName: settings.schoolName,
      schoolShortName: settings.schoolShortName,
      schoolLogo: typeof settings.schoolLogo === "string" ? settings.schoolLogo : null,
      schoolStamp: typeof settings.schoolStamp === "string" ? settings.schoolStamp : null,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      schoolEmail: typeof settings.schoolEmail === "string" ? settings.schoolEmail : null,
      schoolPhone: typeof settings.schoolPhone === "string" ? settings.schoolPhone : null,
      schoolAddress: typeof settings.schoolAddress === "string" ? settings.schoolAddress : null,
      schoolWebsite: typeof settings.schoolWebsite === "string" ? settings.schoolWebsite : null,
      publicAppUrl: typeof settings.publicAppUrl === "string" ? settings.publicAppUrl : null,
      academicYear: settings.academicYear,
      currency: settings.currency,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      currentTerm: settings.currentTerm,
      studentIdInitials: settings.studentIdInitials,
    };

    return NextResponse.json(publicSettings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

