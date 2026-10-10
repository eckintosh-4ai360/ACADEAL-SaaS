"use client";

import { FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel, exportToPDF, formatActivityLogsForExport, RawLogEntry } from "@/lib/export-utils";

interface ActivityLogExportProps {
  logs: RawLogEntry[];
}

export function ActivityLogExport({ logs }: ActivityLogExportProps) {
  const handleExportExcel = () => {
    const formattedData = formatActivityLogsForExport(logs);
    exportToExcel(formattedData, `activity_logs_${new Date().getTime()}`);
  };

  const handleExportPDF = () => {
    const formattedData = formatActivityLogsForExport(logs);
    const headers = ["USER_ID", "USER_NAME", "ROLE", "IP_ADDRESS", "ACTION", "DATE_TIME"];
    exportToPDF(
      formattedData, 
      headers, 
      `activity_logs_${new Date().getTime()}`,
      "Activity Logs Report"
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        onClick={handleExportExcel}
        variant="outline" 
        size="sm" 
        className="bg-green-600 text-white hover:bg-green-700 border-0"
      >
        <FileDown className="w-4 h-4 mr-2" />
        Excel
      </Button>
      <Button 
        onClick={handleExportPDF}
        variant="outline" 
        size="sm" 
        className="bg-orange-500 text-white hover:bg-orange-600 border-0"
      >
        <FileText className="w-4 h-4 mr-2" />
        PDF
      </Button>
    </div>
  );
}
