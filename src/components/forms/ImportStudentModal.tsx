"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GRADE_NAMES } from "@/lib/utils";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface ImportStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parents: { id: string; name: string; surname: string }[];
  classes: { id: number; name: string; gradeId?: number }[];
  grades: { id: number; level: number }[];
}

type ParsedStudentRow = Record<string, unknown>;

interface PreviewRow {
  name: string;
  surname: string;
  email: string;
  classValue: string;
  gradeValue: string;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: { row: number; message: string }[];
  feesAssigned?: number;
}

const PREVIEW_ALIASES = {
  name: ["name", "first name", "firstname"],
  surname: ["surname", "last name", "lastname"],
  fullName: ["student", "student name", "full name", "fullname"],
  email: ["email", "email address", "emailaddress", "contact email"],
  contact: ["contact", "contact number", "contactnumber"],
  classValue: ["class", "class name", "classname", "class id", "classid"],
  gradeValue: ["grade", "grade name", "gradename", "grade level", "gradelevel", "grade id", "gradeid"],
} as const;

//* Mirrors MAX_IMPORT_ROWS in /api/students/import so oversized files are
//* caught before the upload rather than after it.
const MAX_IMPORT_ROWS = 1000;

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const toText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
};

const normalizeRow = (row: ParsedStudentRow): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeKey(key)] = value;
  }
  return normalized;
};

const pickValue = (row: Record<string, unknown>, aliases: readonly string[]): string | undefined => {
  for (const alias of aliases) {
    const value = row[normalizeKey(alias)];
    const text = toText(value);
    if (text !== undefined) {
      return text;
    }
  }
  return undefined;
};

const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

const parseUploadedFile = async (selectedFile: File): Promise<ParsedStudentRow[]> => {
  const fileType = selectedFile.name.split(".").pop()?.toLowerCase();
  let data: ParsedStudentRow[] = [];

  if (fileType === "xlsx" || fileType === "xls") {
    const buffer = await selectedFile.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    data = XLSX.utils.sheet_to_json<ParsedStudentRow>(worksheet, {
      defval: "",
      raw: true,
    });
  } else if (fileType === "csv") {
    const text = await selectedFile.text();
    const result = Papa.parse<ParsedStudentRow>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (result.errors.length > 0) {
      throw new Error(result.errors[0].message);
    }

    data = result.data;
  } else {
    throw new Error("Please upload an Excel (.xlsx, .xls) or CSV (.csv) file");
  }

  return data.filter((row) =>
    Object.values(row).some((value) => String(value ?? "").trim() !== "")
  );
};

const mapPreviewRow = (row: ParsedStudentRow): PreviewRow => {
  const normalized = normalizeRow(row);

  let name = pickValue(normalized, PREVIEW_ALIASES.name);
  let surname = pickValue(normalized, PREVIEW_ALIASES.surname);
  const fullName = pickValue(normalized, PREVIEW_ALIASES.fullName);

  if ((!name || !surname) && fullName) {
    const split = splitFullName(fullName);
    name = name || split.firstName;
    surname = surname || split.lastName;
  }

  let email = pickValue(normalized, PREVIEW_ALIASES.email);
  const contact = pickValue(normalized, PREVIEW_ALIASES.contact);
  if (!email && contact && contact.includes("@")) {
    email = contact;
  }

  return {
    name: name || "-",
    surname: surname || "-",
    email: email || "-",
    classValue: pickValue(normalized, PREVIEW_ALIASES.classValue) || "-",
    gradeValue: pickValue(normalized, PREVIEW_ALIASES.gradeValue) || "-",
  };
};

export function ImportStudentModal({ open, onOpenChange, parents: _parents, classes, grades }: ImportStudentModalProps) {
  const router = useRouter();
  void _parents;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string>("");
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError("");
    setFile(selectedFile);

    try {
      const data = await parseUploadedFile(selectedFile);

      if (data.length === 0) {
        setError("File is empty or has no valid data");
        setFile(null);
        setParsedRows([]);
        return;
      }

      if (data.length > MAX_IMPORT_ROWS) {
        setError(
          `This file has ${data.length} rows. Imports are limited to ${MAX_IMPORT_ROWS} rows at a time — split the file and import each part.`
        );
        setFile(null);
        setParsedRows([]);
        return;
      }

      setParsedRows(data);
      setPreview(data.slice(0, 5).map(mapPreviewRow));
      setStep("preview");
    } catch (err) {
      console.error("File parsing error:", err);
      setError(err instanceof Error ? err.message : "Failed to parse file. Please check the file format.");
      setFile(null);
      setParsedRows([]);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    setError("");

    try {
      const data = parsedRows.length > 0 ? parsedRows : await parseUploadedFile(file);

      const response = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: data }),
      });

      const importResult = await response.json();

      if (!response.ok) {
        setError(importResult.message || "Import failed");
        setIsLoading(false);
        return;
      }

      setResult(importResult);
      setStep("result");
      router.refresh();
    } catch (err) {
      console.error("Import error:", err);
      setError("Failed to import students. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const firstGradeLevel = grades[0]?.level || 6;
    const firstClass =
      classes[0]?.name || GRADE_NAMES[firstGradeLevel] || `Grade ${firstGradeLevel}`;
    const firstGrade = GRADE_NAMES[firstGradeLevel] || `Grade ${firstGradeLevel}`;

    const templateData = [
      {
        name: "John",
        surname: "Doe",
        otherNames: "Kwame",
        sex: "MALE",
        birthday: "2012-05-15",
        class: firstClass,
        grade: firstGrade,
        residencyStatus: "DAY",
        parentFirstName: "Jane",
        parentLastName: "Doe",
        parentPhone: "+233200000000",
        parentEmail: "jane.doe@example.com",
        email: "john.doe@example.com",
        occupation: "Teacher",
        nhisNumber: "NHIS-0001",
        admissionDate: "2026-01-12",
        emergencyContact: "+233201111111",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "student-import-template.xlsx");
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setPreview([]);
    setResult(null);
    setError("");
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Students from File</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file with student information to bulk import them into the system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Drag and drop your file here, or click to select
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Supported formats: Excel (.xlsx, .xls) or CSV (.csv) — up to {MAX_IMPORT_ROWS} rows per file
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Required Columns:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                  <div>- name (or firstName)</div>
                  <div>- surname (or lastName)</div>
                  <div>- sex (MALE/FEMALE or Male/Female)</div>
                  <div>- birthday (YYYY-MM-DD or valid date)</div>
                  <div>- class (configured class name or classId)</div>
                  <div>- grade (grade name, level, or gradeId)</div>
                </div>
                <p className="text-xs text-blue-700 mt-3">
                  Make sure each class matches a class this school has already created, such as
                  {" "}
                  <span className="font-medium">Basic 1</span> or{" "}
                  <span className="font-medium">Basic 1 B</span>.
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  Optional: parentId or parentFirstName + parentLastName + parentPhone, email, house, occupation,
                  nhisNumber, admissionDate, emergencyContact, residencyStatus (DAY/BOARDING).
                </p>
              </div>

              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Sample Template
              </Button>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Preview (First 5 rows)</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-2 text-left">Name</th>
                        <th className="px-2 py-2 text-left">Surname</th>
                        <th className="px-2 py-2 text-left">Email</th>
                        <th className="px-2 py-2 text-left">Class</th>
                        <th className="px-2 py-2 text-left">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/50 transition-colors">
                          <td className="px-2 py-2">{row.name}</td>
                          <td className="px-2 py-2">{row.surname}</td>
                          <td className="px-2 py-2">{row.email}</td>
                          <td className="px-2 py-2">{row.classValue}</td>
                          <td className="px-2 py-2">{row.gradeValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleImport} disabled={isLoading} className="flex-1">
                  {isLoading ? "Importing..." : "Import Students"}
                </Button>
              </div>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="font-medium text-green-900">Successful</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{result.successful}</p>
                </div>
                <div
                  className={`border rounded-lg p-4 ${
                    result.failed > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {result.failed > 0 && <AlertCircle className="w-5 h-5 text-red-600" />}
                    <p className={`font-medium ${result.failed > 0 ? "text-red-900" : "text-green-900"}`}>
                      Failed
                    </p>
                  </div>
                  <p className={`text-2xl font-bold ${result.failed > 0 ? "text-red-600" : "text-green-600"}`}>
                    {result.failed}
                  </p>
                </div>
              </div>

              {result.feesAssigned !== undefined && result.feesAssigned > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  {result.feesAssigned} fee record{result.feesAssigned === 1 ? " was" : "s were"} created
                  from the term and admission bills already set for their class.
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-900 mb-2">Errors:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((err, idx) => (
                      <p key={idx} className="text-xs text-yellow-800">
                        Row {err.row}: {err.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
