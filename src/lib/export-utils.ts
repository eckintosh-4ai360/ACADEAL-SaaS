import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface ExportLogEntry {
  USER_ID: string;
  USER_NAME: string;
  ROLE: string;
  IP_ADDRESS: string;
  ACTION: string;
  DATE_TIME: string;
}

export interface RawLogEntry {
  id: number | string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  ipAddress: string | null;
  createdAt: Date | string;
}

export function exportToExcel(data: ExportLogEntry[], fileName: string) {
  const worksheet = utils.json_to_sheet(data);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Sheet1");
  writeFile(workbook, `${fileName}.xlsx`);
}

export function exportToPDF(data: ExportLogEntry[], headers: string[], fileName: string, title: string) {
  const doc = new jsPDF();
  
  //* Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${format(new Date(), "dd-MM-yyyy HH:mm:ss")}`, 14, 30);
  
  autoTable(doc, {
    head: [headers],
    body: data.map(item => Object.values(item) as string[]),
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [45, 133, 115] }, //* Teal color matching the UI
  });
  
  doc.save(`${fileName}.pdf`);
}

export function formatActivityLogsForExport(logs: RawLogEntry[]): ExportLogEntry[] {
  return logs.map(log => ({
    USER_ID: log.userId,
    USER_NAME: log.userName,
    ROLE: log.role,
    IP_ADDRESS: log.ipAddress || "0.0.0.0",
    ACTION: log.action,
    DATE_TIME: format(new Date(log.createdAt), "dd-MM-yyyy HH:mm:ss"),
  }));
}
