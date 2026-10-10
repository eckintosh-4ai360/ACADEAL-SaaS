"use client";

import { FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  exportAuditLogsToExcel,
  exportAuditLogsToPDF,
  formatAuditLogsForExport,
  type RawAuditLogEntry,
} from "@/lib/audit-export-utils";

interface AuditLogExportProps {
  logs: RawAuditLogEntry[];
}

export function AuditLogExport({ logs }: AuditLogExportProps) {
  const formattedData = formatAuditLogsForExport(logs);
  const timestamp = new Date().getTime();
  const hasLogs = formattedData.length > 0;

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => exportAuditLogsToExcel(formattedData, `audit_logs_${timestamp}`)}
        variant="outline"
        size="sm"
        disabled={!hasLogs}
        className="bg-green-600 text-white hover:bg-green-700 border-0"
      >
        <FileDown className="w-4 h-4 mr-2" />
        Excel
      </Button>
      <Button
        onClick={() =>
          exportAuditLogsToPDF(
            formattedData,
            `audit_logs_${timestamp}`,
            "Canonical Audit Logs Report"
          )
        }
        variant="outline"
        size="sm"
        disabled={!hasLogs}
        className="bg-orange-500 text-white hover:bg-orange-600 border-0"
      >
        <FileText className="w-4 h-4 mr-2" />
        PDF
      </Button>
    </div>
  );
}
