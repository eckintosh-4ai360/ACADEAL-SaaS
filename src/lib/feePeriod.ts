/**
 * The term and academic year every newly written fee is stamped with.
 *
 * The Fees table filters on the canonical term ("One", "Two", "Three") and on
 * the academic year exactly as settings holds it. A fee written under the free
 * text an admin typed into the settings page — "Third Term" — or with no term
 * at all sits in the database matching no filter, so it renders nowhere. To the
 * person looking at the table that is indistinguishable from the student having
 * no fees, which is how a whole class of billing bugs stays invisible.
 *
 * Every path that creates a Fee should stamp it with this rather than reading
 * settings itself.
 */

import { getSystemSettings } from "@/lib/settings";
import { normalizeTermValue } from "@/lib/termUtils";

export interface FeePeriod {
  term: string;
  academicYear: string;
}

export async function getCurrentFeePeriod(): Promise<FeePeriod> {
  const settings = await getSystemSettings();

  return {
    term: normalizeTermValue(settings.currentTerm),
    academicYear: settings.academicYear || "",
  };
}
