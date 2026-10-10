import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimetableDisplay } from "@/components/TimetableDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddLessonButton } from "@/components/forms/AddLessonButton";
import { EditLessonModal } from "@/components/forms/EditLessonModal";
import { DeleteLessonButton } from "@/components/DeleteLessonButton";
import { Button } from "@/components/ui/button";
import { Calendar, LayoutDashboard, Video } from "lucide-react";

import { PublishedTimetableViewer } from "@/components/schedule/PublishedTimetableViewer";

export default async function LessonsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "student") {
    redirect("/dashboard/academics");
  }

  if (session.user.role === "parent") {
    redirect("/dashboard");
  }

  const isAdmin = session?.user?.role === "admin";
  const isTeacher = session?.user?.role === "teacher";
  
  // When a teacher is logged in, lock lessons to their own ID
  const currentTeacherId = isTeacher ? (session.user.id ?? null) : null;

  const [lessons, timetables, subjects, classes, teachers, publishedTimetables, periods] = await Promise.all([
    prisma.lesson.findMany({
      include: {
        subject: true,
        class: true,
        teacher: true,
      },
      orderBy: { day: "asc" },
      take: 100,
    }),
    prisma.timetable.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      select: { id: true, name: true, surname: true },
      orderBy: { name: "asc" },
    }),
    prisma.scheduleTimetable.findMany({
      where: { isPublished: true },
      include: {
        class: true,
        entries: {
          include: {
            subject: true,
            teacher: true,
            period: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.timetablePeriod.findMany({
      orderBy: { order: "asc" },
    }),
  ]);

  const groupedByDay = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.day]) {
      acc[lesson.day] = [];
    }
    acc[lesson.day].push(lesson);
    return acc;
  }, {} as Record<string, typeof lessons>);

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-border/50">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Academic Lessons</h1>
          <p className="text-muted-foreground mt-1 text-lg">Manage timetables and lesson schedules.</p>
        </div>
        <Button asChild variant="outline" className="gap-2 self-start md:self-auto">
          <Link href="/dashboard/lessons/video-lessons">
            <Video className="h-4 w-4" />
            Video lessons
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="timetable" className="w-full">
        <TabsList className="mb-10 grid grid-cols-2 w-full max-w-xl mx-auto h-12 p-1 bg-muted/30 border border-border/10 backdrop-blur-sm">
          <TabsTrigger value="timetable" className="gap-2 text-sm font-bold transition-all data-[state=active]:!bg-primary data-[state=active]:!text-color-primary shadow-sm">
            <Calendar className="w-4 h-4" />
            Official Timetable
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2 text-sm font-bold transition-all data-[state=active]:!bg-primary data-[state=active]:!text-color-primary shadow-sm">
            <LayoutDashboard className="w-4 h-4" />
            Weekly Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timetable" className="space-y-6 focus-visible:ring-0 outline-none">
          <PublishedTimetableViewer
            publishedTimetables={publishedTimetables}
            periods={periods}
            teacherId={currentTeacherId}
          />
          <TimetableDisplay timetables={timetables} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6 focus-visible:ring-0 outline-none">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <LayoutDashboard className="text-primary w-6 h-6" />
                Lesson schedule
              </h2>
              <p className="text-sm text-muted-foreground">The recurring weekly timetable for classes</p>
            </div>
            <AddLessonButton subjects={subjects} classes={classes} teachers={teachers} currentTeacherId={currentTeacherId} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {days.map((day) => (
              <Card key={day} className="border-border/40 shadow-sm bg-card/50 backdrop-blur-[2px]">
                <CardHeader className="pb-3 border-b border-border/10 bg-muted/10 px-4 py-3">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-primary/80">{day}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 px-4">
                  {groupedByDay[day]?.map((lesson) => (
                    <div key={lesson.id} className="p-3 bg-background/40 border border-border/20 rounded-xl text-sm relative group hover:border-primary/50 transition-all duration-300">
                      <div className="font-bold text-foreground leading-tight line-clamp-1">{lesson.name}</div>
                      <div className="text-[9px] text-muted-foreground uppercase font-black mt-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                        {lesson.subject.name}
                      </div>
                      <div className="text-[9px] text-primary font-black mt-1 pl-2.5">{lesson.class.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1 opacity-70 font-medium">
                         {format(new Date(lesson.startTime), "HH:mm")} - {format(new Date(lesson.endTime), "HH:mm")}
                      </div>
                      <div className="absolute top-2 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                         <EditLessonModal 
                          data={lesson} 
                          subjects={subjects} 
                          classes={classes} 
                          teachers={teachers}
                          currentTeacherId={currentTeacherId}
                        />
                        <DeleteLessonButton lessonId={lesson.id} lessonName={lesson.name} />
                      </div>
                    </div>
                  )) || (
                    <div className="text-xs text-muted-foreground text-center py-10 italic opacity-40">No lessons</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

