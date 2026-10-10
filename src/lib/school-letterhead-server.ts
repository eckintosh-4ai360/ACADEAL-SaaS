import { getSystemSettings } from "@/lib/settings";
import type { SchoolLetterhead } from "@/lib/school-letterhead";

//* The image the Settings logo picker and the sidebar show when no logo is saved.
const DEFAULT_SCHOOL_LOGO = "/img/ECKINTOSH LOGO.png";

export async function getSchoolLetterhead(): Promise<SchoolLetterhead> {
  const settings = await getSystemSettings();
  return {
    name: settings.schoolName?.trim() || "School",
    logo: settings.schoolLogo?.trim() || DEFAULT_SCHOOL_LOGO,
    address: settings.schoolAddress?.trim() || null,
    phone: settings.schoolPhone?.trim() || null,
    email: settings.schoolEmail?.trim() || null,
    stamp: settings.schoolStamp?.trim() || null,
  };
}
