"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PrintGridTimetableButton } from "./PrintGridTimetableButton";

interface PublishedTimetableViewerProps {
  publishedTimetables: any[];
  periods: any[];
  teacherId?: string | null;
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const DAY_NAMES: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

export function PublishedTimetableViewer({
  publishedTimetables,
  periods,
  teacherId,
}: PublishedTimetableViewerProps) {
  const [selectedTimetableId, setSelectedTimetableId] = useState<number>(
    publishedTimetables[0]?.id || 0
  );

  if (publishedTimetables.length === 0) return null;

  const currentTimetable =
    publishedTimetables.find((st) => st.id === selectedTimetableId) || publishedTimetables[0];

  const entryMap: Record<string, any> = {};
  if (currentTimetable?.entries) {
    for (const entry of currentTimetable.entries) {
      entryMap[`${entry.periodId}-${entry.day}`] = entry;
    }
  }

  return (
    <div className="space-y-4 my-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card border rounded-2xl shadow-sm">
        <div>
          <h3 className="font-bold text-lg">Published Termly Timetables</h3>
          <p className="text-xs text-muted-foreground">Select a class timetable to view</p>
        </div>
        <select
          value={selectedTimetableId}
          onChange={(e) => setSelectedTimetableId(parseInt(e.target.value))}
          className="h-10 px-3 py-2 text-sm font-bold rounded-xl border border-input bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {publishedTimetables.map((st) => (
            <option key={st.id} value={st.id}>
              {st.class?.name} — {st.term} ({st.academicYear})
            </option>
          ))}
        </select>
      </div>

      {currentTimetable && periods.length > 0 && (
        <Card id="official-timetable-grid" className="overflow-hidden border shadow-sm scroll-mt-6">
          <CardHeader className="bg-primary/5 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold">
                  {currentTimetable.class?.name} Timetable
                </CardTitle>
                <CardDescription className="font-semibold text-primary">
                  {currentTimetable.term} ({currentTimetable.academicYear})
                </CardDescription>
              </div>
              <PrintGridTimetableButton
                className={currentTimetable.class?.name || "Class"}
                term={currentTimetable.term}
                academicYear={currentTimetable.academicYear}
                periods={periods}
                entries={currentTimetable.entries || []}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider border-b">
                  <th className="p-4 text-left w-40 font-black">Time Slot</th>
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
                      const isAssignedToCurrentTeacher =
                        teacherId && entry?.teacherId === teacherId;

                      return (
                        <td
                          key={day}
                          className={`p-3 text-center border-r ${
                            isAssignedToCurrentTeacher
                              ? "bg-primary/10 border-primary/30"
                              : ""
                          }`}
                        >
                          {entry?.subject ? (
                            <div>
                              <div className="font-bold text-foreground">{entry.subject.name}</div>
                              {entry.teacher && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {entry.teacher.name} {entry.teacher.surname}
                                </div>
                              )}
                              {isAssignedToCurrentTeacher && (
                                <span className="inline-block mt-1 text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                                  Your Lesson
                                </span>
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
      )}
    </div>
  );
}
