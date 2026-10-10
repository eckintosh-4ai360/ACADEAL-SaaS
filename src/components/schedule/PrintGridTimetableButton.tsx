"use client";

import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

interface Period {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

interface Entry {
  periodId: number;
  day: string;
  subject?: { name: string } | null;
  teacher?: { name: string; surname?: string | null } | null;
}

interface PrintGridTimetableButtonProps {
  className: string;
  term: string;
  academicYear: string;
  periods: Period[];
  entries: Entry[];
  schoolName?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  buttonText?: string;
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
const DAY_NAMES: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

export function PrintGridTimetableButton({
  className: targetClassName,
  term,
  academicYear,
  periods,
  entries,
  schoolName = "School Academic Timetable",
  variant = "outline",
  size = "sm",
  buttonText = "Print / Download PDF",
}: PrintGridTimetableButtonProps) {

  const handlePrint = () => {
    const entryMap: Record<string, Entry> = {};
    for (const entry of entries) {
      entryMap[`${entry.periodId}-${entry.day}`] = entry;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the timetable.");
      return;
    }

    const rowsHtml = periods
      .map((period) => {
        if (period.isBreak) {
          return `
            <tr class="break-row">
              <td class="time-cell">
                <div class="period-name">${period.name}</div>
                <div class="period-time">${period.startTime} – ${period.endTime}</div>
              </td>
              <td colspan="5" class="break-cell">
                <span>${period.name.toUpperCase()}</span>
              </td>
            </tr>
          `;
        }

        const dayCells = DAYS.map((day) => {
          const entry = entryMap[`${period.id}-${day}`];
          if (entry?.subject) {
            const teacherText = entry.teacher
              ? `${entry.teacher.name} ${entry.teacher.surname || ""}`.trim()
              : "";
            return `
              <td class="entry-cell">
                <div class="subject-name">${entry.subject.name}</div>
                ${teacherText ? `<div class="teacher-name">${teacherText}</div>` : ""}
              </td>
            `;
          }
          return `<td class="entry-cell empty">—</td>`;
        }).join("");

        return `
          <tr>
            <td class="time-cell">
              <div class="period-name">${period.name}</div>
              <div class="period-time">${period.startTime} – ${period.endTime}</div>
            </td>
            ${dayCells}
          </tr>
        `;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${targetClassName} Timetable - ${term} ${academicYear}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 landscape;
              margin: 12mm;
            }
            body {
              font-family: 'Sora', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 16px;
              background: #ffffff;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 12px;
            }
            .school-name {
              font-size: 22px;
              font-weight: 800;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .title {
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 4px;
            }
            .subtitle {
              font-size: 13px;
              color: #475569;
              font-weight: 600;
              margin-top: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              table-layout: fixed;
            }
            th {
              background-color: #2563eb;
              color: #ffffff;
              font-weight: 700;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 10px 8px;
              border: 1px solid #1d4ed8;
              text-align: center;
            }
            th.time-header {
              width: 15%;
              text-align: left;
            }
            td {
              border: 1px solid #cbd5e1;
              padding: 8px 6px;
              vertical-align: middle;
              font-size: 12px;
              height: 48px;
            }
            .time-cell {
              background-color: #f8fafc;
              font-weight: 600;
              text-align: left;
              padding-left: 10px;
            }
            .period-name {
              font-weight: 700;
              color: #0f172a;
              font-size: 12px;
            }
            .period-time {
              font-size: 11px;
              color: #64748b;
              font-weight: 500;
              margin-top: 2px;
            }
            .entry-cell {
              text-align: center;
              background-color: #ffffff;
            }
            .entry-cell.empty {
              color: #cbd5e1;
            }
            .subject-name {
              font-weight: 700;
              color: #1e293b;
              font-size: 12px;
              line-height: 1.2;
            }
            .teacher-name {
              font-size: 10px;
              color: #64748b;
              margin-top: 3px;
              font-weight: 500;
            }
            .break-row {
              background-color: #fef3c7;
            }
            .break-cell {
              text-align: center;
              font-weight: 800;
              color: #d97706;
              letter-spacing: 2px;
              font-size: 12px;
              background-color: #fffbeb;
            }
            .footer {
              margin-top: 24px;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${schoolName}</div>
            <div class="title">${targetClassName} Class Timetable</div>
            <div class="subtitle">${term} · Academic Year ${academicYear}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="time-header">Time Slot</th>
                ${DAYS.map((day) => `<th>${DAY_NAMES[day]}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <span>Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            <span>Acadeal School Management System</span>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Button
      type="button"
      onClick={handlePrint}
      variant={variant}
      size={size}
      className="gap-2 font-semibold shadow-sm"
    >
      <Printer className="w-4 h-4 text-primary" />
      {buttonText}
    </Button>
  );
}
