import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { TimetableDisplay } from "@/components/TimetableDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, LayoutDashboard, Clock } from "lucide-react";
import { PrintGridTimetableButton } from "@/components/schedule/PrintGridTimetableButton";
import { getSystemSettings } from "@/lib/settings";
import {
  GRADE_NAMES,
  TIMETABLE_TARGET_GROUP_LABELS,
  getTimetableTargetGroupByGradeLevel,
} from "@/lib/utils";

type AcademicsTab = "timetable" | "schedule";

function resolveAcademicsTab(tab?: string): AcademicsTab {
  if (tab === "schedule" || tab === "timetable") {
    return tab;
  }
  return "timetable";
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
const DAY_NAMES: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

export default async function StudentAcademicsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "student") {
    redirect("/dashboard");
  }

  const student = await prisma.student.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      surname: true,
      classId: true,
      class: {
        select: { name: true },
      },
      grade: {
        select: { level: true },
      },
    },
  });

  if (!student) {
    redirect("/dashboard");
  }

  const targetGroup = getTimetableTargetGroupByGradeLevel(student.grade.level);
  const gradeName = GRADE_NAMES[student.grade.level] || `Grade ${student.grade.level}`;
  const { tab } = await searchParams;
  if (tab === "necessities") {
    redirect("/dashboard/academics/necessities");
  }
  const activeTab = resolveAcademicsTab(tab);

  const [timetables, lessons, gridTimetable, periods, settings] = await Promise.all([
    // Legacy file-upload timetables (target group based)
    prisma.timetable.findMany({
      where: { targetGroup },
      orderBy: { createdAt: "desc" },
    }),
    // Class lesson schedule
    prisma.lesson.findMany({
      where: { classId: student.classId },
      include: {
        subject: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
        class: { select: { name: true } },
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    }),
    // Most recent published grid timetable for this class
    prisma.scheduleTimetable.findFirst({
      where: {
        classId: student.classId,
        isPublished: true,
      },
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
      orderBy: { publishedAt: "desc" },
    }),
    // All configured time periods
    prisma.timetablePeriod.findMany({
      orderBy: { order: "asc" },
    }),
    getSystemSettings(),
  ]);

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  const groupedByDay = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.day]) acc[lesson.day] = [];
    acc[lesson.day].push(lesson);
    return acc;
  }, {} as Record<string, typeof lessons>);

  // Build entry lookup map: "periodId-day" -> entry
  const entryMap: Record<string, { subject: { name: string } | null; teacher: { name: string; surname: string } | null } | undefined> = {};
  if (gridTimetable) {
    for (const entry of gridTimetable.entries) {
      entryMap[`${entry.periodId}-${entry.day}`] = entry;
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Academics</h1>
        <p className="text-muted-foreground mt-1">
          {student.name} {student.surname} — {gradeName} — {student.class.name} —{" "}
          {TIMETABLE_TARGET_GROUP_LABELS[targetGroup]}
        </p>
      </div>

      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="mb-8 grid grid-cols-2 w-full max-w-2xl mx-auto h-12 p-1 bg-muted/30 border border-border/10">
          <TabsTrigger
            value="timetable"
            className="gap-2 text-sm font-bold data-[state=active]:!bg-primary data-[state=active]:!text-color-primary"
          >
            <Calendar className="w-4 h-4" />
            Official Timetable
          </TabsTrigger>
          <TabsTrigger
            value="schedule"
            className="gap-2 text-sm font-bold data-[state=active]:!bg-primary data-[state=active]:!text-color-primary"
          >
            <LayoutDashboard className="w-4 h-4" />
            Weekly Schedule
          </TabsTrigger>
        </TabsList>

        {/* ── Official Timetable Tab ── */}
        <TabsContent value="timetable" className="space-y-8 focus-visible:ring-0 outline-none">

          {/* ─ Grid-built term timetable ─ */}
          {gridTimetable && periods.length > 0 ? (
            <Card id="official-timetable-grid" className="overflow-hidden border shadow-sm scroll-mt-6">
              <CardHeader className="bg-primary/5 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      {gridTimetable.class?.name} — Class Timetable
                    </CardTitle>
                    <CardDescription className="font-semibold text-primary mt-1">
                      {gridTimetable.term} · {gridTimetable.academicYear}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      Published
                    </span>
                    <PrintGridTimetableButton
                      className={gridTimetable.class?.name || "Class"}
                      term={gridTimetable.term}
                      academicYear={gridTimetable.academicYear}
                      periods={periods}
                      entries={gridTimetable.entries}
                      schoolName={settings.schoolName || "School Academic Timetable"}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider border-b">
                      <th className="p-4 text-left w-44 font-black">Time Slot</th>
                      {DAYS.map((day) => (
                        <th key={day} className="p-4 text-center font-black">
                          {DAY_NAMES[day]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {periods.map((period) => (
                      <tr key={period.id} className={period.isBreak ? "bg-amber-500/5" : ""}>
                        <td className="p-4 font-bold border-r bg-muted/20">
                          <div>{period.name}</div>
                          <div className="text-xs text-muted-foreground font-normal">
                            {period.startTime} – {period.endTime}
                          </div>
                        </td>
                        {DAYS.map((day) => {
                          if (period.isBreak) {
                            return (
                              <td key={day} className="p-3 text-center border-r bg-amber-500/10">
                                <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">
                                  {period.name}
                                </span>
                              </td>
                            );
                          }
                          const entry = entryMap[`${period.id}-${day}`];
                          return (
                            <td key={day} className="p-3 text-center border-r align-top">
                              {entry?.subject ? (
                                <div className="space-y-0.5">
                                  <div className="font-bold text-foreground leading-tight">
                                    {entry.subject.name}
                                  </div>
                                  {entry.teacher && (
                                    <div className="text-xs text-muted-foreground">
                                      {entry.teacher.name} {entry.teacher.surname}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 italic">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : gridTimetable && periods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 py-12 text-center">
              <Clock className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">
                Timetable is published but time slots have not been configured yet.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">Please check back later.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 py-12 text-center">
              <Calendar className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">
                No timetable has been published for {student.class.name} yet.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">Check back when the admin publishes the term timetable.</p>
            </div>
          )}

          {/* Legacy file-upload timetables */}
          {timetables.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-4 text-muted-foreground">
                Uploaded Timetable Documents
              </h3>
              <TimetableDisplay timetables={timetables} isAdmin={false} />
            </div>
          )}
        </TabsContent>

        {/* ── Weekly Schedule Tab ── */}
        <TabsContent value="schedule" className="space-y-6 focus-visible:ring-0 outline-none">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <LayoutDashboard className="text-primary w-6 h-6" />
              Weekly Schedule
            </h2>
            <p className="text-sm text-muted-foreground">
              Only lessons for {student.class.name}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {days.map((day) => (
              <Card key={day} className="border-border/40 shadow-sm bg-card/50">
                <CardHeader className="pb-3 border-b border-border/10 bg-muted/10 px-4 py-3">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-primary/80">
                    {day}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 px-4">
                  {groupedByDay[day]?.length ? (
                    groupedByDay[day].map((lesson) => (
                      <div
                        key={lesson.id}
                        className="p-3 bg-background/40 border border-border/20 rounded-xl text-sm"
                      >
                        <div className="font-bold text-foreground leading-tight line-clamp-1">
                          {lesson.name}
                        </div>
                        <div className="text-[10px] text-primary font-semibold mt-1">
                          {lesson.subject.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {lesson.teacher.name} {lesson.teacher.surname}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-2 font-medium">
                          {format(new Date(lesson.startTime), "HH:mm")} –{" "}
                          {format(new Date(lesson.endTime), "HH:mm")}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-10 italic opacity-40">
                      Free
                    </div>
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
