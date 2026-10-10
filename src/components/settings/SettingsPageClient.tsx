"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Users } from "lucide-react";
import { GeneralSettingsTab } from "./GeneralSettingsTab";
import { UserPermissionsTab } from "./UserPermissionsTab";
import { EmailSmsSettingsTab } from "./EmailSmsSettingsTab";
import { Mail } from "lucide-react";

type SettingsPageSettings = {
  id: number;
  vacationDate?: string | Date | null;
  reopeningDate?: string | Date | null;
  totalAttendanceDays?: number | null;
  currentTerm: string;
  academicYear: string;
  studentIdInitials: string;
  timezone: string;
  dateFormat: string;
  schoolName: string;
  schoolShortName: string;
  schoolLogo?: string | null;
  schoolStamp?: string | null;
  schoolEmail?: string | null;
  schoolPhone?: string | null;
  schoolAddress?: string | null;
  schoolWebsite?: string | null;
  publicAppUrl?: string | null;
  currency: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  emailHost?: string | null;
  emailPort?: number | null;
  emailUser?: string | null;
  smsProvider?: string | null;
  smsApiKey?: string | null;
  smsSenderId?: string | null;
  whatsappPhoneNumberId?: string | null;
  whatsappReceiptTemplateName?: string | null;
  whatsappReceiptTemplateLanguage?: string | null;
};

type SettingsAdminOption = {
  id: string;
  username: string;
  name: string;
  staffId: string;
  role: string;
};

type SettingsTeacherOption = {
  id: string;
  username: string;
  name: string;
  surname: string;
  staffId: string;
};

interface SettingsPageClientProps {
  settings: SettingsPageSettings;
  admins: SettingsAdminOption[];
  teachers: SettingsTeacherOption[];
  initialTab?: "general" | "email-sms" | "permissions";
}

export function SettingsPageClient({
  settings,
  admins,
  teachers,
  initialTab = "general",
}: SettingsPageClientProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 lg:w-[600px]">
        <TabsTrigger value="general" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">General</span>
        </TabsTrigger>
        <TabsTrigger value="email-sms" className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          <span className="hidden sm:inline">Email & SMS</span>
        </TabsTrigger>
        <TabsTrigger value="permissions" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">User Permissions</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure school information, term/semester, and branding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GeneralSettingsTab settings={settings} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="email-sms">
        <Card>
          <CardHeader>
            <CardTitle>Email & SMS Configuration</CardTitle>
            <CardDescription>
              Configure SMTP and SMS gateway for system notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailSmsSettingsTab settings={settings} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="permissions">
        <Card>
          <CardHeader>
            <CardTitle>User Permissions</CardTitle>
            <CardDescription>
              Manage role-based access controls for staff members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserPermissionsTab admins={admins} teachers={teachers} />
          </CardContent>
        </Card>
      </TabsContent>

    </Tabs>
  );
}
