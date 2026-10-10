"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, Clock, AlertCircle, X, Maximize2 } from "lucide-react";
import { PrintGridTimetableButton } from "./PrintGridTimetableButton";
import { TIMETABLE_TARGET_GROUP_LABELS, TimetableTargetGroup } from "@/lib/utils";

interface ViewGridTimetableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetGroup: string;
  title: string;
  semester: string;
  academicYear: string;
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
const DAY_NAMES: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

export function ViewGridTimetableModal({
  open,
  onOpenChange,
  targetGroup,
  title,
  semester,
  academicYear,
}: ViewGridTimetableModalProps) {
  const [loading, setLoading] = useState(false);
  const [timetables, setTimetables] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState<number>(0);

  const targetGroupKey = (
    targetGroup === "PRE_SCHOOL" ||
    targetGroup === "LOWER_PRIMARY" ||
    targetGroup === "UPPER_PRIMARY" ||
    targetGroup === "JUNIOR_HIGH"
      ? targetGroup
      : "JUNIOR_HIGH"
  ) as TimetableTargetGroup;

  const targetGroupLabel = TIMETABLE_TARGET_GROUP_LABELS[targetGroupKey] || targetGroup;

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setLoading(true);

    fetch(`/api/timetables/grid?targetGroup=${encodeURIComponent(targetGroup)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success) {
          setTimetables(data.timetables || []);
          setPeriods(data.periods || []);
          if (data.timetables && data.timetables.length > 0) {
            setSelectedTimetableId(data.timetables[0].id);
          }
        }
      })
      .catch((err) => console.error("Failed to load modal timetables:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, targetGroup]);

  const activeTimetable =
    timetables.find((st) => st.id === selectedTimetableId) || timetables[0];

  const entryMap: Record<string, any> = {};
  if (activeTimetable?.entries) {
    for (const entry of activeTimetable.entries) {
      entryMap[`${entry.periodId}-${entry.day}`] = entry;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen m-0 rounded-none p-6 md:p-8 overflow-y-auto bg-background flex flex-col justify-between border-none shadow-none focus:outline-none">
        <div>
          <DialogHeader className="pb-4 border-b">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                    {title} — Class Timetable Grid
                  </DialogTitle>
                  <DialogDescription className="font-bold text-primary text-sm mt-0.5">
                    {semester} · Academic Year {academicYear} ({targetGroupLabel})
                  </DialogDescription>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {timetables.length > 1 && (
                  <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
                      Class:
                    </span>
                    <select
                      value={selectedTimetableId}
                      onChange={(e) => setSelectedTimetableId(parseInt(e.target.value))}
                      className="h-9 px-3 py-1 text-sm font-bold rounded-lg border border-input bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {timetables.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.class?.name} — {st.term} ({st.academicYear})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTimetable && periods.length > 0 && (
                  <PrintGridTimetableButton
                    className={activeTimetable.class?.name || "Class"}
                    term={activeTimetable.term || semester}
                    academicYear={activeTimetable.academicYear || academicYear}
                    periods={periods}
                    entries={activeTimetable.entries || []}
                    size="default"
                  />
                )}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl h-10 w-10 shrink-0"
                >
                  <X className="w-5 h-5" />
                  <span className="sr-only">Close Fullscreen</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="py-32 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-base font-bold text-muted-foreground">Loading Fullscreen Timetable...</p>
            </div>
          ) : timetables.length === 0 ? (
            <div className="py-24 text-center space-y-4">
              <div className="p-4 bg-amber-500/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-amber-600" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-foreground">No Published Grid Timetable Found</h4>
                <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
                  No interactive grid timetable has been created for {targetGroupLabel} yet.
                </p>
                <p className="text-xs text-muted-foreground/60 mt-2">
                  School administrators can build and publish class timetables in the Timetable Builder.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pt-6">
              {activeTimetable && (
                <Card className="overflow-hidden border shadow-md rounded-2xl">
                  <div className="bg-primary/5 p-4 md:p-5 border-b flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="font-extrabold text-xl text-foreground">
                        {activeTimetable.class?.name} Class Schedule
                      </h4>
                      <p className="text-xs font-semibold text-primary mt-0.5">
                        {activeTimetable.term} · Academic Year {activeTimetable.academicYear}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        Official Published Schedule
                      </span>
                    </div>
                  </div>

                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-muted/60 text-muted-foreground uppercase text-xs tracking-wider border-b">
                          <th className="p-4 text-left w-48 font-black">Time Slot</th>
                          {DAYS.map((day) => (
                            <th key={day} className="p-4 text-center font-black">
                              {DAY_NAMES[day]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {periods.map((period) => (
                          <tr key={period.id} className={period.isBreak ? "bg-amber-500/10" : "hover:bg-muted/20"}>
                            <td className="p-4 font-bold border-r bg-muted/20">
                              <div className="text-sm font-extrabold text-foreground">{period.name}</div>
                              <div className="text-xs text-muted-foreground font-semibold mt-0.5">
                                {period.startTime} – {period.endTime}
                              </div>
                            </td>
                            {DAYS.map((day) => {
                              if (period.isBreak) {
                                return (
                                  <td key={day} className="p-4 text-center border-r bg-amber-500/15">
                                    <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-300 tracking-wider">
                                      {period.name}
                                    </span>
                                  </td>
                                );
                              }
                              const entry = entryMap[`${period.id}-${day}`];
                              return (
                                <td key={day} className="p-4 text-center border-r align-top">
                                  {entry?.subject ? (
                                    <div className="space-y-1 py-1">
                                      <div className="font-extrabold text-foreground text-sm leading-tight">
                                        {entry.subject.name}
                                      </div>
                                      {entry.teacher && (
                                        <div className="text-xs text-muted-foreground font-medium">
                                          {entry.teacher.name} {entry.teacher.surname}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/30 italic">—</span>
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
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-6 border-t mt-6">
          <span className="text-xs text-muted-foreground font-medium">
            Acadeal Academic Schedule Portal · Fullscreen View
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2 font-bold">
            <X className="w-4 h-4" />
            Close Fullscreen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
