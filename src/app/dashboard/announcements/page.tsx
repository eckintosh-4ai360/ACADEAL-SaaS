import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import { format } from "date-fns";
import { AddAnnouncementButton } from "@/components/forms/AddAnnouncementButton";
import { AnnouncementActions } from "@/components/tables/AnnouncementActions";
import { SearchBar } from "@/components/ui/search-bar";
import { FilterSelect } from "@/components/ui/filter-select";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GRADE_NAMES } from "@/lib/utils";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; gradeId?: string; classId?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = (session?.user as any)?.role || "student";
  const canManage = userRole === "admin";

  const params = await searchParams;
  const search = params.search || "";
  const gradeId = params.gradeId || "";
  const classId = params.classId || "";

  const where: any = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (gradeId) {
    where.classId = {
      in: await prisma.class.findMany({
        where: { gradeId: parseInt(gradeId) },
        select: { id: true }
      }).then(classes => classes.map(c => c.id))
    };
  }

  if (classId) {
    where.classId = parseInt(classId);
  }

  const [announcements, classes, grades] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include: {
        class: true,
      },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.class.findMany({
      select: { id: true, name: true, gradeId: true },
      orderBy: { name: "asc" },
    }),
    prisma.grade.findMany({
      select: { id: true, level: true },
      orderBy: { level: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Announcements</h1>
          <p className="text-gray-500 mt-1">View school announcements</p>
        </div>
        {canManage && <AddAnnouncementButton classes={classes} grades={grades} />}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <SearchBar placeholder="Search announcements by title or description..." />
        <FilterSelect
          options={grades.map((g) => ({ 
            label: GRADE_NAMES[g.level] || `Grade ${g.level}`, 
            value: g.id.toString() 
          }))}
          paramName="gradeId"
          placeholder="All Grades"
        />
        <FilterSelect
          options={classes
            .filter(c => !gradeId || Number(c.gradeId) === Number(gradeId))
            .map((c) => ({ label: c.name, value: c.id.toString() }))}
          paramName="classId"
          placeholder="All Classes"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-lg sm:text-xl font-semibold">{announcement.title}</h3>
                    {announcement.class && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {announcement.class.name}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-3">{announcement.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    {format(new Date(announcement.date), "MMMM dd, yyyy")}
                  </div>
                </div>
                <AnnouncementActions announcement={announcement} classes={classes} grades={grades} userRole={userRole} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

