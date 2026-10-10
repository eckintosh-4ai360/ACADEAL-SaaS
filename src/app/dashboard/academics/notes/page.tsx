import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

import { UserNotesEditor } from "@/components/UserNotesEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  isMissingUserNotesTable,
  mapRoleToUserType,
  serializeUserNoteRecord,
  type UserNoteRecord,
} from "@/lib/userNotes";

function getBackHref(role: "admin" | "teacher" | "student" | "parent") {
  switch (role) {
    case "student":
      return "/dashboard/academics";
    case "teacher":
    case "admin":
      return "/dashboard/lessons";
    case "parent":
      return "/dashboard/lessons/regulations";
    default:
      return "/dashboard";
  }
}

function getRoleLabel(role: "admin" | "teacher" | "student" | "parent") {
  switch (role) {
    case "admin":
      return "admin";
    case "teacher":
      return "teacher";
    case "student":
      return "student";
    case "parent":
      return "parent";
    default:
      return "user";
  }
}

export default async function AcademicsNotesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  const userType = mapRoleToUserType(session.user.role);
  let featureReady = true;
  let notes: UserNoteRecord[] = [];

  try {
    notes = await prisma.$queryRaw<UserNoteRecord[]>(Prisma.sql`
        SELECT "id", "title", "contentHtml", "contentText", "updatedAt"
        FROM "UserNote"
        WHERE "userId" = ${session.user.id}
          AND "userType" = CAST(${userType} AS "UserType")
        ORDER BY "updatedAt" DESC
      `);
  } catch (error) {
    if (isMissingUserNotesTable(error)) {
      featureReady = false;
    } else {
      throw error;
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4">
        <Link href={getBackHref(session.user.role)}>
          <Button variant="ghost" size="sm" className="w-fit gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="border-b border-border/50 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 p-4 shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tight text-foreground">
                  Academics Notes
                </h1>
                <p className="max-w-3xl text-lg text-muted-foreground">
                  Personal note space with rich text formatting, alignment controls, lists, and a
                  saved draft attached to your login.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {featureReady ? (
        <UserNotesEditor
          initialNotes={notes.map(serializeUserNoteRecord)}
          userName={session.user.name ?? session.user.username}
          userRoleLabel={getRoleLabel(session.user.role)}
        />
      ) : (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="space-y-3 pt-6">
            <p className="text-base font-semibold text-amber-900 dark:text-amber-100">
              Notes storage is waiting for the latest database migration.
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Apply the new Prisma migration for <code>UserNote</code>, regenerate Prisma if
              needed, and restart the app. The page is already wired and will start saving notes as
              soon as that table exists.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
