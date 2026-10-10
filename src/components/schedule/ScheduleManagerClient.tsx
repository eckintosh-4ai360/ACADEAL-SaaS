"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, Users, Calendar, Clock, LayoutGrid,
  Plus, ChevronRight, FileText, Settings2,
  School, Layers3, BarChart3, Edit, Trash2,
  Grid, Eye, CheckCircle2, AlertCircle, RefreshCw, Globe, ArrowLeftRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddClassButton } from "@/components/forms/AddClassButton";
import { AddSubjectButton } from "@/components/forms/AddSubjectButton";
import { ClassActions } from "@/components/tables/ClassActions";
import { SubjectActions } from "@/components/tables/SubjectActions";
import { TimetableDisplay } from "@/components/TimetableDisplay";
import { PrintGridTimetableButton } from "./PrintGridTimetableButton";
import { getGradeLabel } from "@/lib/class-management";
import { PeriodModal } from "./PeriodModal";
import {
  deletePeriod,
  getOrCreateScheduleTimetable,
  upsertTimetableCellEntry,
  publishScheduleTimetable,
  unpublishScheduleTimetable,
} from "@/lib/timetableBuilderActions";
import { toast } from "react-toastify";
import { Day } from "@prisma/client";

interface ScheduleManagerClientProps {
  data: {
    classes: any[];
    teachers: any[];
    subjects: any[];
    lessons: any[];
    timetables: any[];
    grades: { id: number; level: number }[];
    periods: any[];
    scheduleTimetables: any[];
    teacherList: { id: string; name: string; surname: string }[];
    subjectList: { id: number; name: string }[];
    classList: { id: number; name: string }[];
  };
}

type Tab = "overview" | "classes" | "teachers" | "subjects" | "timeslots" | "timetable";
type TimetableSubTab = "build" | "view";

const DAYS: Day[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const DAY_NAMES: Record<Day, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

// ----- Stat Card Component -----
function StatCard({
  label, value, icon: Icon, accent, onClick,
}: {
  label: string; value: number; icon: any; accent: string; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border bg-gradient-to-br p-6 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${accent}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-xl bg-background/60 backdrop-blur-sm border border-white/10">
          <Icon className="w-6 h-6" />
        </div>
        <ChevronRight className="w-5 h-5 opacity-40" />
      </div>
      <div className="text-4xl font-black tracking-tight">{value}</div>
      <div className="text-sm font-semibold mt-1 opacity-70 uppercase tracking-widest">{label}</div>
    </button>
  );
}

// ----- Tab Button Component -----
function TabButton({
  id, label, icon: Icon, active, onClick,
}: {
  id: Tab; label: string; icon: any; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap
        ${active
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

export function ScheduleManagerClient({ data }: ScheduleManagerClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [timetableSubTab, setTimetableSubTab] = useState<TimetableSubTab>("build");

  const {
    classes, teachers, subjects, timetables, grades,
    periods = [], scheduleTimetables = [], teacherList, subjectList, classList,
  } = data;

  // Period Modal State
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<any>(null);

  // Timetable Builder state
  const [selectedClassId, setSelectedClassId] = useState<number>(classes[0]?.id || 0);
  const [selectedTerm, setSelectedTerm] = useState<string>("Term 1");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("2024-2025");
  const [savingSlotId, setSavingSlotId] = useState<string | null>(null);

  // activeTimetable is stored in local state — populated via server action
  // (not from prop, since prop no longer carries entries to save DB bandwidth)
  const [activeTimetable, setActiveTimetable] = useState<any>(null);

  // Reset activeTimetable when class/term/year selection changes
  const handleClassChange = (classId: number) => {
    setSelectedClassId(classId);
    setActiveTimetable(null);
  };
  const handleTermChange = (term: string) => {
    setSelectedTerm(term);
    setActiveTimetable(null);
  };
  const handleYearChange = (year: string) => {
    setSelectedAcademicYear(year);
    setActiveTimetable(null);
  };

  // Check setup requirement
  const isEntitiesConfigured =
    classes.length > 0 && teachers.length > 0 && subjects.length > 0 && periods.length > 0;

  // Helper for deleting a period
  const handleDeletePeriod = (id: number) => {
    if (!confirm("Are you sure you want to delete this time slot?")) return;
    startTransition(async () => {
      const res = await deletePeriod(id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  // Helper to load or create timetable — populates activeTimetable with full entries
  const handleEnsureTimetable = async () => {
    if (!selectedClassId) return;
    startTransition(async () => {
      const res = await getOrCreateScheduleTimetable(
        selectedClassId,
        selectedTerm,
        selectedAcademicYear
      );
      if (res.success && res.timetable) {
        setActiveTimetable(res.timetable);
        toast.success("Timetable grid ready for editing.");
      } else {
        toast.error(res.message);
      }
    });
  };

  // Helper to update a single cell — updates activeTimetable entries in-place
  const handleCellChange = async (
    periodId: number,
    day: Day,
    subjectIdVal: string,
    teacherIdVal: string
  ) => {
    if (!activeTimetable) return;

    const cellKey = `${periodId}-${day}`;
    setSavingSlotId(cellKey);

    const subjectId = subjectIdVal ? parseInt(subjectIdVal) : null;
    const teacherId = teacherIdVal || null;

    const res = await upsertTimetableCellEntry({
      timetableId: activeTimetable.id,
      periodId,
      day,
      subjectId,
      teacherId,
    });

    setSavingSlotId(null);

    if (res.success) {
      // Optimistically update the local activeTimetable entries
      const subjectObj = subjectId
        ? subjectList.find((s) => s.id === subjectId) || null
        : null;
      const teacherObj = teacherId
        ? teacherList.find((t) => t.id === teacherId) || null
        : null;

      setActiveTimetable((prev: any) => {
        if (!prev) return prev;
        const existingIdx = prev.entries.findIndex(
          (e: any) => e.periodId === periodId && e.day === day
        );
        let newEntries;
        if (!subjectId) {
          // Cleared — remove entry
          newEntries = prev.entries.filter(
            (e: any) => !(e.periodId === periodId && e.day === day)
          );
        } else if (existingIdx >= 0) {
          newEntries = [...prev.entries];
          newEntries[existingIdx] = {
            ...newEntries[existingIdx],
            subjectId,
            teacherId,
            subject: subjectObj ? { id: subjectObj.id, name: subjectObj.name } : null,
            teacher: teacherObj
              ? { id: teacherObj.id, name: teacherObj.name, surname: teacherObj.surname }
              : null,
          };
        } else {
          newEntries = [
            ...prev.entries,
            {
              id: Date.now(),
              timetableId: prev.id,
              periodId,
              day,
              subjectId,
              teacherId,
              note: null,
              subject: subjectObj ? { id: subjectObj.id, name: subjectObj.name } : null,
              teacher: teacherObj
                ? { id: teacherObj.id, name: teacherObj.name, surname: teacherObj.surname }
                : null,
              period: null,
            },
          ];
        }
        return { ...prev, entries: newEntries };
      });
      toast.success(res.message, { autoClose: 1000 });
    } else {
      toast.error(res.message);
    }
  };

  // Helper to publish/unpublish
  const handleTogglePublish = () => {
    if (!activeTimetable) return;
    startTransition(async () => {
      if (activeTimetable.isPublished) {
        const res = await unpublishScheduleTimetable(activeTimetable.id);
        if (res.success) {
          toast.success(res.message);
          setActiveTimetable((prev: any) => prev ? { ...prev, isPublished: false } : prev);
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await publishScheduleTimetable(activeTimetable.id);
        if (res.success) {
          toast.success(res.message);
          setActiveTimetable((prev: any) => prev ? { ...prev, isPublished: true } : prev);
        } else {
          toast.error(res.message);
        }
      }
    });
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "classes", label: "Classes", icon: School },
    { id: "teachers", label: "Teachers", icon: Users },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "timeslots", label: "Time Slots", icon: Clock },
    { id: "timetable", label: "Timetable", icon: Calendar },
  ];

  // Map entries in active timetable for quick cell lookup: `[periodId-day]` -> entry
  const entryMap: Record<string, any> = {};
  if (activeTimetable?.entries) {
    for (const entry of activeTimetable.entries) {
      entryMap[`${entry.periodId}-${entry.day}`] = entry;
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-primary/70 p-8 text-primary-foreground shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Layers3 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">School Timetable Manager</h1>
              <p className="text-primary-foreground/70 mt-0.5 text-sm">Admin control panel for managing classes, time slots, and building termly timetables</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            id={tab.id}
            label={tab.label}
            icon={tab.icon}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Classes"
              value={classes.length}
              icon={School}
              accent="from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400"
              onClick={() => setActiveTab("classes")}
            />
            <StatCard
              label="Teachers"
              value={teachers.length}
              icon={Users}
              accent="from-orange-500/10 to-orange-500/5 border-orange-500/20 text-orange-600 dark:text-orange-400"
              onClick={() => setActiveTab("teachers")}
            />
            <StatCard
              label="Subjects"
              value={subjects.length}
              icon={BookOpen}
              accent="from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-600 dark:text-purple-400"
              onClick={() => setActiveTab("subjects")}
            />
            <StatCard
              label="Time Slots"
              value={periods.length}
              icon={Clock}
              accent="from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              onClick={() => setActiveTab("timeslots")}
            />
            <StatCard
              label="Timetables"
              value={scheduleTimetables.length}
              icon={FileText}
              accent="from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400"
              onClick={() => setActiveTab("timetable")}
            />
          </div>

          {/* Getting Started Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Timetable Builder Checklist
              </CardTitle>
              <CardDescription>Follow these steps to set up and publish termly timetables:</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {[
                  { step: 1, label: "Add Classes", tab: "classes" as Tab, done: classes.length > 0 },
                  { step: 2, label: "Register Teachers", tab: "teachers" as Tab, done: teachers.length > 0 },
                  { step: 3, label: "Set Up Subjects", tab: "subjects" as Tab, done: subjects.length > 0 },
                  { step: 4, label: "Configure Time Slots (Periods)", tab: "timeslots" as Tab, done: periods.length > 0 },
                  { step: 5, label: "Build & Publish Timetable", tab: "timetable" as Tab, done: scheduleTimetables.some((st) => st.isPublished) },
                ].map(({ step, label, tab, done }) => (
                  <li key={step} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0
                      ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {done ? "✓" : step}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`text-sm font-semibold hover:underline transition-colors ${done ? "line-through text-muted-foreground" : "text-foreground"}`}
                    >
                      {label}
                    </button>
                    {done && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">✓ Complete</span>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Classes Tab ── */}
      {activeTab === "classes" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">Manage Classes</h2>
              <p className="text-muted-foreground text-sm mt-1">{classes.length} classes configured</p>
            </div>
            <AddClassButton grades={grades} teachers={teacherList} />
          </div>

          {classes.length === 0 ? (
            <Card className="border-dashed border-2 py-16 flex flex-col items-center text-center">
              <School className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <CardTitle className="text-muted-foreground">No classes added yet</CardTitle>
              <CardDescription className="mb-6">Create one to get started</CardDescription>
              <AddClassButton grades={grades} teachers={teacherList} />
            </Card>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-widest">
                    <th className="text-left px-4 py-3 font-bold">Class</th>
                    <th className="text-left px-4 py-3 font-bold">Grade</th>
                    <th className="text-left px-4 py-3 font-bold">Supervisor</th>
                    <th className="text-center px-4 py-3 font-bold">Students</th>
                    <th className="text-right px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {classes.map((cls: any) => (
                    <tr key={cls.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-foreground">{cls.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {cls.grade ? getGradeLabel(cls.grade.level) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {cls.supervisor ? `${cls.supervisor.name} ${cls.supervisor.surname}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold">
                          {cls._count?.students ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ClassActions classData={{ id: cls.id, name: cls.name }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Teachers Tab ── */}
      {activeTab === "teachers" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">Manage Teachers</h2>
              <p className="text-muted-foreground text-sm mt-1">{teachers.length} teachers registered</p>
            </div>
            <Link href="/dashboard/teachers">
              <Button variant="outline" className="gap-2">
                <Settings2 className="w-4 h-4" />
                Full Teacher Management
              </Button>
            </Link>
          </div>

          {teachers.length === 0 ? (
            <Card className="border-dashed border-2 py-16 flex flex-col items-center text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <CardTitle className="text-muted-foreground">No teachers registered yet</CardTitle>
              <CardDescription className="mb-6">Go to the Teachers page to add teachers</CardDescription>
              <Link href="/dashboard/teachers">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Manage Teachers
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map((teacher: any) => (
                <Card key={teacher.id} className="hover:shadow-md transition-all duration-200 border-border/40">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm">
                        {teacher.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate">
                          {teacher.name} {teacher.surname}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{teacher.email || "No email"}</div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[11px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                            {teacher.subjects?.length ?? 0} subjects
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Subjects Tab ── */}
      {activeTab === "subjects" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">Manage Subjects</h2>
              <p className="text-muted-foreground text-sm mt-1">{subjects.length} subjects offered</p>
            </div>
            <AddSubjectButton teachers={teacherList} />
          </div>

          {subjects.length === 0 ? (
            <Card className="border-dashed border-2 py-16 flex flex-col items-center text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <CardTitle className="text-muted-foreground">No subjects added yet</CardTitle>
              <CardDescription className="mb-6">Create one to get started</CardDescription>
              <AddSubjectButton teachers={teacherList} />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject: any) => (
                <Card key={subject.id} className="hover:shadow-md transition-all duration-200 border-border/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <CardTitle className="text-base leading-tight">{subject.name}</CardTitle>
                      </div>
                      <SubjectActions subject={subject} teachers={teacherList} />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="flex gap-3 text-xs">
                      <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full font-semibold">
                        {subject.teachers?.length ?? 0} teachers
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {subject.teachers?.slice(0, 3).map((t: any) => (
                        <span key={t.id} className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                          {t.name} {t.surname}
                        </span>
                      ))}
                      {subject.teachers?.length > 3 && (
                        <span className="text-[11px] text-muted-foreground px-1">
                          +{subject.teachers.length - 3} more
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Time Slots Tab ── */}
      {activeTab === "timeslots" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" />
                Time Slots / Daily Periods
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Configure the daily period schedule (e.g. Period 1, Break, Period 2). Used to build all class timetables.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingPeriod(null);
                setPeriodModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Time Slot
            </Button>
          </div>

          {periods.length === 0 ? (
            <Card className="border-dashed border-2 py-16 flex flex-col items-center text-center">
              <Clock className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <CardTitle className="text-muted-foreground">No time slots added yet</CardTitle>
              <CardDescription className="mb-6">
                Add period duration slots (e.g. Period 1: 07:30 - 08:10) to begin building class timetables.
              </CardDescription>
              <Button
                onClick={() => {
                  setEditingPeriod(null);
                  setPeriodModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Time Slot
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {periods.map((period: any) => (
                <Card
                  key={period.id}
                  className={`border transition-all duration-200 ${
                    period.isBreak
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-card border-border/60 hover:shadow-md"
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg leading-tight">{period.name}</h3>
                          {period.isBreak && (
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">
                              Break
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-primary mt-1.5 flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {period.startTime} — {period.endTime}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingPeriod(period);
                            setPeriodModalOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => handleDeletePeriod(period.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Timetable Tab ── */}
      {activeTab === "timetable" && (
        <div className="space-y-6">
          {/* Sub-navigation bar matching user screenshot */}
          <div className="flex items-center gap-2 p-1.5 bg-muted/60 dark:bg-zinc-900 rounded-2xl w-fit border border-border/40">
            <button
              type="button"
              onClick={() => setTimetableSubTab("build")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                timetableSubTab === "build"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid className="w-4 h-4" />
              Build
            </button>
            <button
              type="button"
              onClick={() => setTimetableSubTab("view")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                timetableSubTab === "view"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="w-4 h-4" />
              View
            </button>
          </div>

          {/* Setup verification banner matching user screenshot */}
          {!isEntitiesConfigured && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center shadow-lg my-6">
              <p className="text-zinc-400 font-medium text-base">
                Please set up all entities (Classes, Teachers, Rooms, Subjects, and Time Slots) before building the timetable.
              </p>
            </div>
          )}

          {/* Build Sub-tab */}
          {timetableSubTab === "build" && (
            <div className="space-y-6">
              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-card border rounded-2xl shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Class</label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => handleClassChange(parseInt(e.target.value))}
                      className="h-10 px-3 py-2 text-sm font-bold rounded-xl border border-input bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {classes.map((cls: any) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Term</label>
                    <select
                      value={selectedTerm}
                      onChange={(e) => handleTermChange(e.target.value)}
                      className="h-10 px-3 py-2 text-sm font-bold rounded-xl border border-input bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Academic Year</label>
                    <input
                      type="text"
                      value={selectedAcademicYear}
                      onChange={(e) => handleYearChange(e.target.value)}
                      className="h-10 px-3 py-2 text-sm font-bold rounded-xl border border-input bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary w-32"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!activeTimetable ? (
                    <Button onClick={handleEnsureTimetable} disabled={isPending}>
                      Init Grid
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleTogglePublish}
                        disabled={isPending}
                        variant={activeTimetable.isPublished ? "outline" : "default"}
                        className="gap-2 font-bold"
                      >
                        {activeTimetable.isPublished ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Published (Click to Unpublish)
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4" />
                            Post / Publish Timetable
                          </>
                        )}
                      </Button>
                      <PrintGridTimetableButton
                        className={classes.find((c) => c.id === selectedClassId)?.name || "Class"}
                        term={selectedTerm}
                        academicYear={selectedAcademicYear}
                        periods={periods}
                        entries={activeTimetable.entries || []}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Timetable Grid Builder */}
              {periods.length > 0 && selectedClassId ? (
                <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-muted/80 text-muted-foreground uppercase text-xs tracking-wider border-b">
                          <th className="p-4 text-left w-44 font-black">Time Slot</th>
                          {DAYS.map((day) => (
                            <th key={day} className="p-4 text-center font-black">
                              {DAY_NAMES[day]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {periods.map((period: any) => (
                          <tr key={period.id} className={period.isBreak ? "bg-amber-500/5 dark:bg-amber-950/20" : ""}>
                            {/* Time Slot Label */}
                            <td className="p-4 font-bold border-r">
                              <div className="text-foreground">{period.name}</div>
                              <div className="text-xs text-muted-foreground font-semibold mt-0.5">
                                {period.startTime} - {period.endTime}
                              </div>
                            </td>

                            {/* Cell per Day */}
                            {DAYS.map((day) => {
                              if (period.isBreak) {
                                return (
                                  <td key={day} className="p-3 text-center border-r bg-amber-500/10 dark:bg-amber-950/30">
                                    <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                      {period.name}
                                    </span>
                                  </td>
                                );
                              }

                              const cellKey = `${period.id}-${day}`;
                              const entry = entryMap[cellKey];
                              const isSavingThisSlot = savingSlotId === cellKey;

                              return (
                                <td key={day} className="p-2 border-r relative hover:bg-muted/20 transition-colors">
                                  <div className="space-y-1.5">
                                    {/* Subject Select */}
                                    <select
                                      value={entry?.subjectId || ""}
                                      onChange={(e) =>
                                        handleCellChange(period.id, day, e.target.value, entry?.teacherId || "")
                                      }
                                      className="w-full text-xs font-bold p-1.5 rounded-lg border bg-background text-foreground focus:ring-1 focus:ring-primary"
                                    >
                                      <option value="">-- No Subject --</option>
                                      {subjectList.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.name}
                                        </option>
                                      ))}
                                    </select>

                                    {/* Teacher Select */}
                                    <select
                                      value={entry?.teacherId || ""}
                                      onChange={(e) =>
                                        handleCellChange(period.id, day, entry?.subjectId ? String(entry.subjectId) : "", e.target.value)
                                      }
                                      className="w-full text-[11px] p-1 rounded-lg border bg-muted/40 text-muted-foreground focus:ring-1 focus:ring-primary"
                                    >
                                      <option value="">-- Select Teacher --</option>
                                      {teacherList.map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.name} {t.surname}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {isSavingThisSlot && (
                                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded">
                                      <span className="text-[10px] font-bold text-primary animate-pulse">Saving...</span>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Please add Time Slots in the "Time Slots" tab before building the timetable.
                </div>
              )}
            </div>
          )}

          {/* View Sub-tab */}
          {timetableSubTab === "view" && (
            <div className="space-y-6">
              {/* Select class to view */}
              <div className="flex flex-wrap items-center gap-4 p-5 bg-card border rounded-2xl shadow-sm">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Class</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(parseInt(e.target.value))}
                    className="h-10 px-3 py-2 text-sm font-bold rounded-xl border border-input bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {classes.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Formatted Timetable View */}
              {activeTimetable ? (
                <Card className="overflow-hidden border shadow-sm">
                  <CardHeader className="bg-primary/5 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl font-bold">
                          Official Class Timetable — {classes.find((c) => c.id === selectedClassId)?.name}
                        </CardTitle>
                        <CardDescription className="font-semibold text-primary">
                          {selectedTerm} ({selectedAcademicYear})
                        </CardDescription>
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                          activeTimetable.isPublished
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {activeTimetable.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider border-b">
                          <th className="p-4 text-left w-40 font-black">Time</th>
                          {DAYS.map((day) => (
                            <th key={day} className="p-4 text-center font-black">
                              {DAY_NAMES[day]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {periods.map((period: any) => (
                          <tr key={period.id}>
                            <td className="p-4 font-bold border-r bg-muted/20">
                              <div>{period.name}</div>
                              <div className="text-xs text-muted-foreground font-normal">
                                {period.startTime} - {period.endTime}
                              </div>
                            </td>

                            {DAYS.map((day) => {
                              if (period.isBreak) {
                                return (
                                  <td key={day} className="p-3 text-center border-r bg-amber-500/10">
                                    <span className="text-xs font-bold uppercase text-amber-600">
                                      {period.name}
                                    </span>
                                  </td>
                                );
                              }

                              const entry = entryMap[`${period.id}-${day}`];

                              return (
                                <td key={day} className="p-3 text-center border-r">
                                  {entry?.subject ? (
                                    <div>
                                      <div className="font-bold text-foreground">{entry.subject.name}</div>
                                      {entry.teacher && (
                                        <div className="text-xs text-muted-foreground mt-0.5">
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
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No timetable built for this class yet. Switch to the <strong>Build</strong> tab to create one.
                </div>
              )}

              {/* Legacy File Upload Timetables list */}
              <div className="pt-8">
                <TimetableDisplay timetables={timetables} isAdmin={true} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Period Modal for Add / Edit Time Slot */}
      <PeriodModal
        open={periodModalOpen}
        setOpen={setPeriodModalOpen}
        periodToEdit={editingPeriod}
      />
    </div>
  );
}
