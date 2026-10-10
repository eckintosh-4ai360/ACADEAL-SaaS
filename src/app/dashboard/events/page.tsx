import prisma from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { AddEventButton } from "@/components/forms/AddEventButton";
import { EventCardActions } from "@/components/events/EventCardActions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SearchBar } from "@/components/ui/search-bar";
import { FilterSelect } from "@/components/ui/filter-select";
import { GRADE_NAMES } from "@/lib/utils";

export default async function EventsPage({
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

  const [events, classes, grades] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        class: true,
      },
      orderBy: { startTime: "asc" },
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

  const upcomingEvents = events.filter(e => new Date(e.startTime) > new Date());
  const pastEvents = events.filter(e => new Date(e.startTime) <= new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-gray-500 mt-1">View school events</p>
        </div>
        {canManage && <AddEventButton classes={classes} grades={grades} />}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <SearchBar placeholder="Search events by title or description..." />
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

      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Upcoming Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <Card key={event.id} className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 min-h-[3rem]">{event.description}</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                      {format(new Date(event.startTime), "MMMM dd, yyyy")}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-blue-500" />
                      {format(new Date(event.startTime), "HH:mm")} - {format(new Date(event.endTime), "HH:mm")}
                    </div>
                    {event.class && (
                      <div className="mt-2">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100 font-medium">
                          {event.class.name}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <EventCardActions event={event} classes={classes} grades={grades} userRole={userRole} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-500">Past Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map((event) => (
              <Card key={event.id} className="opacity-75 grayscale-[0.5]">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {format(new Date(event.startTime), "MMMM dd, yyyy")}
                    </div>
                    {event.class && (
                      <div className="mt-2">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {event.class.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <EventCardActions event={event} classes={classes} grades={grades} userRole={userRole} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


