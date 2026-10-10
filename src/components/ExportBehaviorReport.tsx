"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface BehaviorRecord {
  id: number;
  title: string;
  description: string;
  type: string;
  severity: string;
  date: Date;
  reportedBy: string;
  actionTaken: string | null;
  student: {
    id: string;
    name: string;
    surname: string;
    class: { name: string };
    grade: { level: number };
  };
}

interface ExportBehaviorReportProps {
  behaviors: BehaviorRecord[];
}

export function ExportBehaviorReport({ behaviors }: ExportBehaviorReportProps) {
  const exportToCSV = () => {
    const headers = [
      "Referral ID",
      "Student Name",
      "Class",
      "Grade",
      "Date",
      "Incident Title",
      "Description",
      "Type",
      "Severity",
      "Reported By",
      "Action Taken",
    ];

    const rows = behaviors.map((b) => [
      `REF${b.id}`,
      `${b.student.name} ${b.student.surname}`,
      b.student.class.name,
      b.student.grade.level,
      format(new Date(b.date), "MMM dd, yyyy"),
      b.title,
      b.description,
      b.type,
      b.severity,
      b.reportedBy,
      b.actionTaken || "No action taken",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${cell}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `behavior-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToCSV}
      disabled={behaviors.length === 0}
    >
      <Download className="w-4 h-4 mr-2" />
      Export Report
    </Button>
  );
}
