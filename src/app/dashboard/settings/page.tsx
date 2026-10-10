import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings";

import { Settings as SettingsIcon } from "lucide-react";
import { SettingsPageClient } from "@/components/settings/SettingsPageClient";

type SettingsTab = "general" | "email-sms" | "permissions";

const SETTINGS_TABS = new Set<SettingsTab>([
  "general",
  "email-sms",
  "permissions",
]);

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  //? Check if user is super admin
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin" || session.user.adminRole !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }
  const params = await searchParams;
  const requestedTab = params.tab as SettingsTab | undefined;
  const initialTab: SettingsTab =
    requestedTab && SETTINGS_TABS.has(requestedTab)
      ? requestedTab
      : "general";

  //* Get current settings
  let settings = await getSystemSettings();

  //* If no settings exist, create default or provide fallback id
  if (!settings?.id) {
    try {
      const created = await prisma.systemSettings.create({
        data: {},
      });
      settings = { ...settings, ...created };
    } catch (createError) {
      console.warn("Could not create SystemSettings in database; using fallback id:", createError);
      settings = {
        ...settings,
        id: 1,
      };
    }
  }

  //* Get all users for permissions tab
  let admins: Array<{ id: string; username: string; name: string; staffId: string; role: string }> = [];
  let teachers: Array<{ id: string; username: string; name: string; surname: string; staffId: string }> = [];

  try {
    const [fetchedAdmins, fetchedTeachers] = await Promise.all([
      prisma.admin.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          staffId: true,
          role: true,
        },
      }),
      prisma.teacher.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          surname: true,
          staffId: true,
        },
      }),
    ]);
    admins = fetchedAdmins;
    teachers = fetchedTeachers;
  } catch (error) {
    console.error("Failed to fetch admins or teachers for settings permissions tab:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-blue-600" />
            System Settings
          </h1>
          <p className="text-gray-500 mt-1">Configure your school&apos;s information and system preferences</p>
        </div>
      </div>

      <SettingsPageClient
        settings={settings as typeof settings & { id: number }}
        admins={admins}
        teachers={teachers}
        initialTab={initialTab}
      />
    </div>
  );
}
