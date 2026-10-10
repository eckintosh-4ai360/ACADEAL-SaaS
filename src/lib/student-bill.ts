//* Student bill shape shared by the server, the admin panel, the portals and
//* the printable document. Keep this file free of server-only imports.

export type StudentBillLine = { label: string; amount: number };

//* Everything a bill document needs, serializable for client components.
export type StudentBillView = {
  id: number;
  billNumber: string;
  studentId: string; //* Student.id
  studentCode: string; //* the school's student ID, e.g. "STU0328"
  studentName: string;
  className: string | null;
  term: string;
  academicYear: string;
  items: StudentBillLine[];
  totalAmount: number;
  arrears: number;
  grandTotal: number;
  billDate: string; //* ISO
  resumptionDate: string | null; //* ISO, stored at 12:00 UTC so it never shifts a day
  notes: string | null;
  preparedBy: string;
  publishedAt: string | null;
};

//* A Prepare Bill template, as the Generate Bill panel lists it.
export type StudentBillTemplate = {
  id: number;
  label: string; //* e.g. "Class 5A"
  term: string;
  academicYear: string;
  totalAmount: number;
  itemCount: number;
  billCount: number;
  publishedCount: number;
};

export function formatBillNumber(id: number) {
  return `BIL#${String(id).padStart(4, "0")}`;
}

//* "2026-09-07" → a Date at noon UTC, so every timezone formats the same day.
export function parseBillDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

//* The inverse, for <input type="date"> values.
export function toBillDateInput(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}
