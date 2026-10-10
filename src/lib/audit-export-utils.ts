import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface RawAuditLogEntry {
  id: string;
  requestId: string;
  action: string;
  category: string;
  status: "SUCCESS" | "FAILURE";
  actorName: string | null;
  actorRole: string | null;
  actorLoginId: string | null;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  source: string;
  path: string | null;
  ipAddress: string | null;
  summary: string;
  canonicalLine: string;
  createdAt: Date | string;
}

export interface ExportAuditLogEntry {
  REQUEST_ID: string;
  DATE_TIME: string;
  ACTION: string;
  CATEGORY: string;
  STATUS: string;
  ACTOR: string;
  ACTOR_ROLE: string;
  ACTOR_LOGIN_ID: string;
  TARGET: string;
  SOURCE: string;
  PATH: string;
  IP_ADDRESS: string;
  SUMMARY: string;
  CANONICAL_LINE: string;
}

function formatTarget(log: RawAuditLogEntry) {
  if (log.entityLabel && log.entityType) {
    return `${log.entityType}: ${log.entityLabel}`;
  }

  if (log.entityLabel) {
    return log.entityLabel;
  }

  if (log.entityType && log.entityId) {
    return `${log.entityType}: ${log.entityId}`;
  }

  return log.entityType || log.entityId || "n/a";
}

export function formatAuditLogsForExport(
  logs: RawAuditLogEntry[]
): ExportAuditLogEntry[] {
  return logs.map((log) => ({
    REQUEST_ID: log.requestId,
    DATE_TIME: format(new Date(log.createdAt), "dd-MM-yyyy HH:mm:ss"),
    ACTION: log.action,
    CATEGORY: log.category,
    STATUS: log.status,
    ACTOR: log.actorName || "Unknown",
    ACTOR_ROLE: log.actorRole || "unknown",
    ACTOR_LOGIN_ID: log.actorLoginId || "n/a",
    TARGET: formatTarget(log),
    SOURCE: log.source,
    PATH: log.path || "n/a",
    IP_ADDRESS: log.ipAddress || "unknown",
    SUMMARY: log.summary,
    CANONICAL_LINE: log.canonicalLine,
  }));
}

export function exportAuditLogsToExcel(
  data: ExportAuditLogEntry[],
  fileName: string
) {
  const worksheet = utils.json_to_sheet(data);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Audit Logs");
  writeFile(workbook, `${fileName}.xlsx`);
}

export function exportAuditLogsToPDF(
  data: ExportAuditLogEntry[],
  fileName: string,
  title: string
) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(18);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${format(new Date(), "dd-MM-yyyy HH:mm:ss")}`, 14, 25);

  const headers = [
    "DATE_TIME",
    "ACTION",
    "CATEGORY",
    "STATUS",
    "ACTOR",
    "TARGET",
    "SOURCE",
    "SUMMARY",
  ];

  autoTable(doc, {
    head: [headers],
    body: data.map((item) => [
      item.DATE_TIME,
      item.ACTION,
      item.CATEGORY,
      item.STATUS,
      item.ACTOR,
      item.TARGET,
      item.SOURCE,
      item.SUMMARY,
    ]),
    startY: 30,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [13, 148, 136] },
  });

  doc.save(`${fileName}.pdf`);
}
