"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Banknote,
  RefreshCw,
  FileText,
  MessageSquare,
  Edit2,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { generateDailyAuxiliaryFees } from "@/lib/actions";

interface Student {
  id: string;
  name: string;
  surname: string;
  othername?: string | null;
  grade: { level: number };
  auxiliaryFeeStatus?: "PAID" | "PENDING" | "OVERDUE" | "N/A";
  attendancePresent?: boolean;
}

interface Class {
  id: number;
  name: string;
  dailyAuxiliaryFeeAmount?: number | null;
  students: Student[];
}

interface AttendanceSummaryStudent {
  id: string;
  name: string;
  grade: string;
  totalSessions: number;
  present: number;
  absent: number;
  attendanceRate: number;
}

interface AttendanceSummaryData {
  className: string;
  dateRange: {
    start: string;
    end: string;
  };
  overview: {
    totalStudents: number;
    totalSessions: number;
    totalPresent: number;
    totalAbsent: number;
    overallAttendanceRate: number;
  };
  highlights: {
    perfectAttendance: string[];
    lowAttendance: Array<{
      name: string;
      rate: number;
    }>;
  };
  studentStats: AttendanceSummaryStudent[];
}

interface AttendanceSmsResponse {
  success: boolean;
  message?: string;
  sent?: number;
  failed?: number;
  error?: string;
}

interface AttendanceSummaryResponse {
  success: boolean;
  error?: string;
  data?: AttendanceSummaryData;
}

interface AttendanceSessionData {
  classId: number;
  className: string;
  date: string;
  dailyAuxiliaryFeeAmount: number | null;
  hasAttendanceRecords: boolean;
  hasAuxiliaryFeeRecords: boolean;
  attendanceMarks: Record<string, boolean>;
  auxiliaryFeeMarks: Record<string, boolean>;
  students: Student[];
}

interface AttendanceSessionResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: AttendanceSessionData;
}

interface AttendanceClientProps {
  classes: Class[];
}

export function AttendanceClient({
  classes,
}: AttendanceClientProps) {
  const [selectedClassId, setSelectedClassId] = useState<number>(
    classes.length > 0 ? classes[0].id : 0
  );
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, boolean>>({});
  const [auxiliaryFeeMarks, setAuxiliaryFeeMarks] = useState<Record<string, boolean>>({});
  const [submittedMarks, setSubmittedMarks] = useState<Record<string, boolean> | null>(null);
  const [submittedAuxFeeMarks, setSubmittedAuxFeeMarks] = useState<Record<string, boolean> | null>(null);
  const [sessionStudents, setSessionStudents] = useState<Student[] | null>(null);
  const [loadedAuxiliaryFeeAmount, setLoadedAuxiliaryFeeAmount] = useState<number | null | undefined>(undefined);
  const [loadedSessionLabel, setLoadedSessionLabel] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<AttendanceSummaryData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const activeStudents = sessionStudents ?? selectedClass?.students ?? [];
  const currentAuxiliaryFeeAmount =
    loadedAuxiliaryFeeAmount !== undefined
      ? loadedAuxiliaryFeeAmount
      : selectedClass?.dailyAuxiliaryFeeAmount ?? null;
  const hasGeneratedDailyAuxiliaryFee = currentAuxiliaryFeeAmount != null;
  const [auxiliaryFeeAmount, setAuxiliaryFeeAmount] = useState(
    currentAuxiliaryFeeAmount != null ? currentAuxiliaryFeeAmount.toFixed(2) : "10"
  );
  const markedCount = Object.values(attendanceMarks).length;
  const isSubmitted = markedCount === 0;

  useEffect(() => {
    setAuxiliaryFeeAmount(currentAuxiliaryFeeAmount != null ? currentAuxiliaryFeeAmount.toFixed(2) : "10");
  }, [selectedClassId, currentAuxiliaryFeeAmount]);

  const handleToggleAttendance = (studentId: string) => {
    setAttendanceMarks((prev) => {
      const updated = { ...prev };
      if (updated[studentId]) {
        delete updated[studentId];
      } else {
        updated[studentId] = true;
      }
      return updated;
    });
  };

  const isAllChecked =
    selectedClass &&
    activeStudents.length > 0 &&
    activeStudents.every((student) => attendanceMarks[student.id]);

  const handleToggleAllAttendance = (checked: boolean) => {
    if (!selectedClass) return;

    setAttendanceMarks((prev) => {
      const updated = { ...prev };
      activeStudents.forEach((student) => {
        if (checked) {
          updated[student.id] = true;
        } else {
          delete updated[student.id];
        }
      });
      return updated;
    });
  };

  const handleToggleAuxiliaryFee = (studentId: string) => {
    setAuxiliaryFeeMarks((prev) => {
      const updated = { ...prev };
      if (updated[studentId]) {
        delete updated[studentId];
      } else {
        updated[studentId] = true;
      }
      return updated;
    });
  };

  const isAllAuxChecked =
    selectedClass &&
    activeStudents.length > 0 &&
    activeStudents.every(
      (student) =>
        (student.auxiliaryFeeStatus === "PAID" && !isEditMode) ||
        student.auxiliaryFeeStatus === "N/A" ||
        auxiliaryFeeMarks[student.id]
    );

  const handleToggleAllAuxiliaryFees = (checked: boolean) => {
    if (!selectedClass) return;

    setAuxiliaryFeeMarks((prev) => {
      const updated = { ...prev };
      activeStudents.forEach((student) => {
        //* Only toggle students who have a pending fee today, or if in edit mode
        if (student.auxiliaryFeeStatus !== "N/A" && (student.auxiliaryFeeStatus !== "PAID" || isEditMode)) {
          if (checked) {
            updated[student.id] = true;
          } else {
            delete updated[student.id];
          }
        }
      });
      return updated;
    });
  };

  const loadAttendanceSession = async (enterEditMode: boolean) => {
    if (!selectedClassId || !startDate) {
      alert("Please select a class and date first.");
      return false;
    }

    setIsLoadingSession(true);
    try {
      const response = await fetch("/api/attendance/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          date: startDate,
        }),
      });

      const result = (await response.json()) as AttendanceSessionResponse;

      if (response.ok && result.success && result.data) {
        const attendanceSnapshot = { ...result.data.attendanceMarks };
        const auxiliaryFeeSnapshot = { ...result.data.auxiliaryFeeMarks };

        setSessionStudents(result.data.students);
        setLoadedAuxiliaryFeeAmount(result.data.dailyAuxiliaryFeeAmount);
        setLoadedSessionLabel(format(startDate, "MMM dd, yyyy"));
        setAttendanceMarks(attendanceSnapshot);
        setAuxiliaryFeeMarks(auxiliaryFeeSnapshot);
        setSubmittedMarks(result.data.hasAttendanceRecords ? attendanceSnapshot : null);
        setSubmittedAuxFeeMarks(result.data.hasAuxiliaryFeeRecords ? auxiliaryFeeSnapshot : null);
        setIsEditMode(enterEditMode);
        return true;
      }

      alert(`❌ ${result.error || "Failed to load attendance session"}`);
      return false;
    } catch (error) {
      console.error("Error loading attendance session:", error);
      alert("An unexpected error occurred while loading the selected date.");
      return false;
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleSubmitAttendance = () => {
    startTransition(async () => {
      try {
        if (!startDate) {
          alert("Please select a date first.");
          return;
        }

        const attendanceData = {
          classId: selectedClassId,
          date: startDate,
          attendances: Object.entries(attendanceMarks).map(([studentId, present]) => ({
            studentId,
            present,
          })),
          paidAuxiliaryFeeStudentIds: Object.entries(auxiliaryFeeMarks)
            .filter(([, paid]) => paid)
            .map(([studentId]) => studentId),
        };

        const response = await fetch("/api/attendance/mark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attendanceData),
        });

        if (response.ok) {
          await loadAttendanceSession(false);
          alert("Attendance submitted successfully!");
        }
      } catch (error) {
        console.error("Error submitting attendance:", error);
      }
    });
  };

  const handleGenerateReport = () => {
    //* Generate CSV report
    if (!selectedClass) return;

    // Determine what marks to use
    // If we have submittedMarks, use those. 
    // If not, but we have 0 attendance marks right now (meaning everything is submitted/saved in DB or hasn't started), 
    // then let the backend records be retrieved or use whatever is currently saved.
    // However, since this generates CSV directly from UI state, it relies entirely on the UI state.
    // For now, if there are pending attendanceMarks (not submitted), let them submit first.
    if (!submittedMarks && markedCount > 0) {
      alert("Attendance not submitted. Please submit attendance before generating the report.");
      return;
    }

    const headers = ["S/N", "LASTNAME", "FIRSTNAME", "OTHERNAME", "LEVEL", "GENDER", "STATUS", "AUXILIARY FEE"];
    const activeMarks = submittedMarks || attendanceMarks;
    const dailyAuxiliaryFee = currentAuxiliaryFeeAmount ?? Number.parseFloat(auxiliaryFeeAmount);

    if (!Number.isFinite(dailyAuxiliaryFee) || dailyAuxiliaryFee <= 0) {
      alert("Please set a valid daily auxiliary fee amount before generating the report.");
      return;
    }

    let paidAuxiliaryFeeStudentCount = 0;
    const rows = activeStudents.map((student, idx) => {
      //* Determine aux fee status for the report
      //* Use submitted snapshot if available, otherwise use live marks
      const activeFeeMarks = submittedAuxFeeMarks || auxiliaryFeeMarks;
      let auxFeeLabel: string;
      if (student.auxiliaryFeeStatus === "N/A" && !activeFeeMarks[student.id]) {
        auxFeeLabel = "N/A";
      } else if (
        activeFeeMarks[student.id] ||
        student.auxiliaryFeeStatus === "PAID"
      ) {
        auxFeeLabel = "Paid";
      } else {
        auxFeeLabel = "Not Paid";
      }

      if (auxFeeLabel === "Paid") {
        paidAuxiliaryFeeStudentCount += 1;
      }

      return [
        idx + 1,
        student.surname,
        student.name,
        student.othername || "",
        `BASIC ${student.grade.level}`,
        "", //* Gender would need to be added to student model
        activeMarks[student.id] ? "Present" : "Absent",
        auxFeeLabel,
      ];
    });

    const totalAuxiliaryFee = dailyAuxiliaryFee * paidAuxiliaryFeeStudentCount;

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ["", "", "", "", "", "", "TOTAL", totalAuxiliaryFee.toFixed(2)]
        .map((cell) => `"${cell}"`)
        .join(","),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${format(startDate || new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleGenerateAuxiliaryFees = async () => {
    if (!selectedClassId) return;
    const amount = parseFloat(auxiliaryFeeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateDailyAuxiliaryFees(selectedClassId, amount, startDate || new Date());
      alert(res.message);
      if (res.success) {
        await loadAttendanceSession(isEditMode);
      }
    } catch {
      alert("An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendAbsentSms = async () => {
    if (!selectedClassId || !startDate || !selectedClass) {
      alert("Please select a class and date first.");
      return;
    }

    const absentCount = activeStudents.filter(
      (student) => !attendanceMarks[student.id]
    ).length;

    if (absentCount === 0) {
      alert("All students are marked present. No SMS to send.");
      return;
    }

    const confirmMsg = `Send SMS to ${absentCount} parent(s) of absent student(s)?\n\nMessage will inform them about their child's absence from school on ${format(startDate, "MMM dd, yyyy")}.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsSendingSms(true);
    try {
      const response = await fetch("/api/attendance/send-absent-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          date: startDate,
        }),
      });

      const result = (await response.json()) as AttendanceSmsResponse;

      if (response.ok && result.success) {
        alert(`✅ ${result.message || "SMS sent successfully."}\n\nSent: ${result.sent ?? 0}\nFailed: ${result.failed ?? 0}`);
      } else {
        alert(`❌ ${result.error || "Failed to send SMS"}`);
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
      alert("An unexpected error occurred while sending SMS.");
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleShowSummary = async () => {
    if (!selectedClassId || !startDate || !endDate) {
      alert("Please select a class and date range first.");
      return;
    }

    setIsLoadingSummary(true);
    setShowSummaryModal(true);

    try {
      const response = await fetch("/api/attendance/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClassId,
          startDate,
          endDate,
        }),
      });

      const result = (await response.json()) as AttendanceSummaryResponse;

      if (response.ok && result.success && result.data) {
        setSummaryData(result.data);
      } else {
        alert(`❌ ${result.error || "Failed to load summary"}`);
        setShowSummaryModal(false);
      }
    } catch (error) {
      console.error("Error loading summary:", error);
      alert("An unexpected error occurred while loading summary.");
      setShowSummaryModal(false);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ! Header */}
      <div>
        <h1 className="text-foreground font-bold">
          STUDENTS DAILY ATTENDANCE – (MARK CLASS REGISTER HERE)
        </h1>
      </div>

      {/* ! Class Selector Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {classes.map((cls) => (
          <button
            key={cls.id}
            onClick={() => {
              setSelectedClassId(cls.id);
              setAttendanceMarks({});
              setAuxiliaryFeeMarks({});
              setSubmittedMarks(null);
              setSubmittedAuxFeeMarks(null);
              setSessionStudents(null);
              setLoadedAuxiliaryFeeAmount(undefined);
              setLoadedSessionLabel(null);
              setIsEditMode(false);
              setAuxiliaryFeeAmount(cls.dailyAuxiliaryFeeAmount != null ? cls.dailyAuxiliaryFeeAmount.toFixed(2) : "10");
            }}
            className={`px-4 py-2 rounded-xl font-semibold transition-all ${
              selectedClassId === cls.id
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            {cls.name}
          </button>
        ))}

        {loadedSessionLabel && (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm">
            Loaded session: {loadedSessionLabel}
          </span>
        )}
      </div>

      {/* ! Auxiliary Fee Setup */}
      <Card className="border-amber-200/80  shadow-sm">
        <CardHeader className="flex flex-col gap-3 pb-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Banknote className="h-5 w-5 text-amber-600" />
              Daily Auxiliary Fee
            </CardTitle>
            <CardDescription>
              Set the amount for the selected class, then generate the daily auxiliary fees.
            </CardDescription>
          </div>
          <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            {currentAuxiliaryFeeAmount != null ? "Fee Set" : "Awaiting setup"}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="auxiliary-fee-amount">Amount (GH₵)</Label>
            <Input
              id="auxiliary-fee-amount"
              type="number"
              min="0"
              step="0.01"
              value={auxiliaryFeeAmount}
              onChange={(e) => setAuxiliaryFeeAmount(e.target.value)}
              placeholder="Enter daily fee amount"
              disabled={!selectedClass || hasGeneratedDailyAuxiliaryFee}
            />
            <p className="text-xs text-muted-foreground">
              {hasGeneratedDailyAuxiliaryFee
                ? "This class already has a daily auxiliary fee for today."
                : "Teachers and admins can set the daily class charge here before generating fees."}
            </p>
          </div>

          <Button
            size="lg"
            className="bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={handleGenerateAuxiliaryFees}
            disabled={isGenerating || !selectedClass || hasGeneratedDailyAuxiliaryFee}
          >
            <Banknote className="mr-2 h-4 w-4" />
            {isGenerating
              ? "Generating..."
              : hasGeneratedDailyAuxiliaryFee
              ? "Fee Already Set"
              : "Generate Daily Auxiliary Fee"}
          </Button>

          <div className="min-w-[220px] rounded-2xl border border-amber-200 bg-gray p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Current daily fee
            </p>
            <p className="mt-2 text-2xl font-black text-foreground">
              {currentAuxiliaryFeeAmount != null
                ? `GH₵${currentAuxiliaryFeeAmount.toFixed(2)}`
                : "Not generated yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {currentAuxiliaryFeeAmount != null
                ? loadedSessionLabel
                  ? "Shown for the loaded session date."
                  : "Shown for the selected class today."
                : "Generate once to display the amount here."}
            </p>
            {loadedSessionLabel && (
              <p className="mt-2 text-xs font-medium text-amber-700">
                Loaded session: {loadedSessionLabel}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ! Action Buttons Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* * Left side action buttons */}
        <Button
          size="sm"
          className="bg-yellow-400 text-black hover:bg-yellow-500"
          onClick={handleGenerateReport}
        >
          <FileText className="w-4 h-4 mr-2" />
          Gen. Report
        </Button>

        <Button size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={handleSendAbsentSms} disabled={isSendingSms}>
          <MessageSquare className="w-4 h-4 mr-2" />
          {isSendingSms ? "Sending..." : "Send SMS"}
        </Button>

        <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => {
          if (!isEditMode) {
            // Pre-seed auxiliary fee marks from the submitted snapshot
            if (submittedAuxFeeMarks) {
              setAuxiliaryFeeMarks({ ...submittedAuxFeeMarks });
            } else if (activeStudents.length > 0) {
              // Fallback: pre-seed from server props
              const seed: Record<string, boolean> = {};
              activeStudents.forEach((student) => {
                if (student.auxiliaryFeeStatus === "PAID") {
                  seed[student.id] = true;
                }
              });
              setAuxiliaryFeeMarks(seed);
            }
            // Pre-seed attendance marks from submitted snapshot
            if (submittedMarks) {
              setAttendanceMarks({ ...submittedMarks });
            }
          } else {
            // Cancelling edit — restore to clean state
            setAttendanceMarks({});
            setAuxiliaryFeeMarks({});
          }
          setIsEditMode(!isEditMode);
        }}>
          <Edit2 className="w-4 h-4 mr-2" />
          {isEditMode ? "Cancel Edit" : "Edit Attendance"}
        </Button>

        {/* * Right side info */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-orange-600 font-semibold">
            LEVEL: {selectedClass?.name || "N/A"}
          </span>
          <Button size="sm" className="bg-yellow-600 text-white hover:bg-yellow-700" onClick={handleShowSummary}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Summary
          </Button>
        </div>
      </div>

      {/* * Date Range and Generate */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                placeholder="Start Date"
                className="w-40"
              />
              <span className="text-muted-foreground">to</span>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                placeholder="End Date"
                className="w-40"
              />
            </div>

            <Button
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={() => loadAttendanceSession(true)}
              disabled={isLoadingSession || !selectedClass}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingSession ? "animate-spin" : ""}`} />
              {isLoadingSession ? "Loading..." : "Load Session"}
            </Button>

            <div className="ml-auto flex items-center gap-3">
              <span className="text-foreground font-semibold">
                Today&apos;s Attendance:{" "}
                <span className={isSubmitted ? "text-red-600" : "text-green-600"}>
                  {isSubmitted ? "Unmarked" : `${markedCount} marked`}
                </span>
              </span>
              <Button
                className="bg-purple-600 text-white hover:bg-purple-700"
                onClick={handleSubmitAttendance}
                disabled={(!!submittedMarks && !isEditMode) || isPending}
              >
                {isPending ? "Submitting..." : (submittedMarks && isEditMode) ? "UPDATE ATTENDANCE" : "SUBMIT ATTENDANCE"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ! Attendance Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-border">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">S/N</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">LASTNAME</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">FIRSTNAME</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">OTHERNAME</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">LEVEL</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">GENDER</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!isAllChecked}
                        onChange={(e) => handleToggleAllAttendance(e.target.checked)}
                        className="w-4 h-4 cursor-pointer disabled:opacity-50"
                        title="Check All"
                        disabled={!!submittedMarks && !isEditMode}
                      />
                      <span>PRESENT</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">
                    <div className="flex items-center justify-center gap-2">
                       <input
                        type="checkbox"
                        checked={!!isAllAuxChecked}
                        onChange={(e) => handleToggleAllAuxiliaryFees(e.target.checked)}
                        className="w-4 h-4 cursor-pointer disabled:opacity-50"
                        title="Mark All Paid"
                        disabled={!!submittedMarks && !isEditMode}
                      />
                      <span>AUXILIARY FEE</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeStudents.map((student, idx) => (
                  <tr key={student.id} className="border-b hover:bg-muted/50 transition-colors transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 text-foreground font-medium">
                      {student.surname.toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {student.othername || ""}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      BASIC {student.grade.level}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {/* * Add gender field here */}
                      -
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={attendanceMarks[student.id] || false}
                        onChange={() => handleToggleAttendance(student.id)}
                        className="w-5 h-5 cursor-pointer disabled:opacity-50"
                        disabled={!!submittedMarks && !isEditMode}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* In edit mode show checkbox for ALL students; otherwise only show for non-N/A, non-PAID */}
                        {isEditMode ? (
                          <input
                            type="checkbox"
                            checked={auxiliaryFeeMarks[student.id] || false}
                            onChange={() => handleToggleAuxiliaryFee(student.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        ) : (
                          student.auxiliaryFeeStatus !== "PAID" &&
                          student.auxiliaryFeeStatus !== "N/A" && (
                            <input
                              type="checkbox"
                              checked={auxiliaryFeeMarks[student.id] || false}
                              onChange={() => handleToggleAuxiliaryFee(student.id)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          )
                        )}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            auxiliaryFeeMarks[student.id]
                              ? "bg-green-100 text-green-700"
                              : student.auxiliaryFeeStatus === "PAID"
                              ? "bg-green-100 text-green-700"
                              : student.auxiliaryFeeStatus === "N/A"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {auxiliaryFeeMarks[student.id]
                            ? "PAID"
                            : student.auxiliaryFeeStatus === "PAID"
                            ? "PAID"
                            : student.auxiliaryFeeStatus === "N/A"
                            ? "N/A"
                            : student.auxiliaryFeeStatus || "PENDING"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {activeStudents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No students found in this class.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ! SUMMARY MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Attendance Summary Report
              </h2>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-white/80 hover:text-white transition-colors text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {isLoadingSummary ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading summary data...</p>
                </div>
              ) : summaryData ? (
                <div className="space-y-6">
                  {/* Header Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-lg text-blue-900">{summaryData.className}</h3>
                        <p className="text-sm text-blue-700">
                          {summaryData.dateRange.start} - {summaryData.dateRange.end}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Overview Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="text-sm text-blue-600 font-medium">Total Students</div>
                      <div className="text-2xl font-bold text-blue-900">{summaryData.overview.totalStudents}</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="text-sm text-purple-600 font-medium">Total Sessions</div>
                      <div className="text-2xl font-bold text-purple-900">{summaryData.overview.totalSessions}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="text-sm text-green-600 font-medium">Total Present</div>
                      <div className="text-2xl font-bold text-green-900">{summaryData.overview.totalPresent}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="text-sm text-red-600 font-medium">Total Absent</div>
                      <div className="text-2xl font-bold text-red-900">{summaryData.overview.totalAbsent}</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <div className="text-sm text-amber-600 font-medium">Attendance Rate</div>
                      <div className="text-2xl font-bold text-amber-900">{summaryData.overview.overallAttendanceRate}%</div>
                    </div>
                  </div>

                  {/* Highlights */}
                  {(summaryData.highlights.perfectAttendance.length > 0 || summaryData.highlights.lowAttendance.length > 0) && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {summaryData.highlights.perfectAttendance.length > 0 && (
                        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                          <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                            <span className="text-xl">🏆</span> Perfect Attendance (100%)
                          </h4>
                          <ul className="space-y-1">
                            {summaryData.highlights.perfectAttendance.map((name: string, idx: number) => (
                              <li key={idx} className="text-emerald-700 text-sm">• {name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {summaryData.highlights.lowAttendance.length > 0 && (
                        <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
                          <h4 className="font-bold text-rose-800 mb-2 flex items-center gap-2">
                            <span className="text-xl">⚠️</span> Low Attendance (&lt;75%)
                          </h4>
                          <ul className="space-y-1">
                            {summaryData.highlights.lowAttendance.map((item: { name: string; rate: number }, idx: number) => (
                              <li key={idx} className="text-rose-700 text-sm">• {item.name} ({item.rate}%)</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Student Details Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h4 className="font-bold text-gray-700">Individual Student Statistics</h4>
                    </div>
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">S/N</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm">Student Name</th>
                            <th className="px-4 py-3 text-center font-semibold text-gray-700 text-sm">Grade</th>
                            <th className="px-4 py-3 text-center font-semibold text-gray-700 text-sm">Sessions</th>
                            <th className="px-4 py-3 text-center font-semibold text-green-700 text-sm">Present</th>
                            <th className="px-4 py-3 text-center font-semibold text-red-700 text-sm">Absent</th>
                            <th className="px-4 py-3 text-center font-semibold text-blue-700 text-sm">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summaryData.studentStats.map((student, idx: number) => (
                            <tr key={student.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-600">{idx + 1}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                              <td className="px-4 py-3 text-sm text-center text-gray-600">{student.grade}</td>
                              <td className="px-4 py-3 text-sm text-center text-gray-600">{student.totalSessions}</td>
                              <td className="px-4 py-3 text-sm text-center text-green-600 font-medium">{student.present}</td>
                              <td className="px-4 py-3 text-sm text-center text-red-600 font-medium">{student.absent}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                  student.attendanceRate >= 90 ? 'bg-green-100 text-green-700' :
                                  student.attendanceRate >= 75 ? 'bg-blue-100 text-blue-700' :
                                  student.attendanceRate >= 60 ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {student.attendanceRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Close Button */}
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => setShowSummaryModal(false)}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
