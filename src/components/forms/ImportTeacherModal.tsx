"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface ImportTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: { id: number; name: string }[];
}

type ParsedTeacherRow = Record<string, unknown>;

interface PreviewRow {
  username: string;
  name: string;
  surname: string;
  email: string;
  subjects: string;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const PREVIEW_ALIASES = {
  username: ["username", "user name", "teacher username", "teacherusername", "login"],
  name: ["name", "first name", "firstname", "givenname"],
  surname: ["surname", "last name", "lastname", "familyname"],
  fullName: ["teacher", "teacher name", "full name", "fullname"],
  email: ["email", "email address", "emailaddress", "contact email"],
  subjects: ["subjects", "subject", "subject name", "subject names", "subjectname", "subjectnames"],
  subjectIds: ["subject ids", "subjectids", "subject id", "subjectid"],
} as const;

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const toText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
};

const normalizeRow = (row: ParsedTeacherRow): Record<string, unknown> => {
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

const parseUploadedFile = async (selectedFile: File): Promise<ParsedTeacherRow[]> => {
  const fileType = selectedFile.name.split(".").pop()?.toLowerCase();
  let data: ParsedTeacherRow[] = [];

  if (fileType === "xlsx" || fileType === "xls") {
    const buffer = await selectedFile.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    data = XLSX.utils.sheet_to_json<ParsedTeacherRow>(worksheet, {
      defval: "",
      raw: true,
    });
  } else if (fileType === "csv") {
    const text = await selectedFile.text();
    const result = Papa.parse<ParsedTeacherRow>(text, {
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

const getSubjectsPreviewValue = (row: Record<string, unknown>) => {
  const subjectNames = pickValue(row, PREVIEW_ALIASES.subjects);
  const subjectIds = pickValue(row, PREVIEW_ALIASES.subjectIds);
  return subjectNames || subjectIds || "-";
};

const mapPreviewRow = (row: ParsedTeacherRow): PreviewRow => {
  const normalized = normalizeRow(row);

  let name = pickValue(normalized, PREVIEW_ALIASES.name);
  let surname = pickValue(normalized, PREVIEW_ALIASES.surname);
  const fullName = pickValue(normalized, PREVIEW_ALIASES.fullName);

  if ((!name || !surname) && fullName) {
    const split = splitFullName(fullName);
    name = name || split.firstName;
    surname = surname || split.lastName;
  }

  return {
    username: pickValue(normalized, PREVIEW_ALIASES.username) || "(auto)",
    name: name || "-",
    surname: surname || "-",
    email: pickValue(normalized, PREVIEW_ALIASES.email) || "-",
    subjects: getSubjectsPreviewValue(normalized),
  };
};

export function ImportTeacherModal({ open, onOpenChange, subjects }: ImportTeacherModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedTeacherRow[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
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

      const response = await fetch("/api/teachers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teachers: data }),
      });

      const importResult = (await response.json()) as ImportResult & { message?: string };

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
      setError("Failed to import teachers. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const firstSubjectName = subjects[0]?.name || "Mathematics";

    const templateData = [
      {
        username: "akusi.boateng",
        password: "",
        name: "Akusi",
        surname: "Boateng",
        sex: "FEMALE",
        birthday: "1991-08-14",
        address: "Madina, Accra",
        email: "akusi.boateng@example.com",
        phone: "+233200000000",
        subjects: firstSubjectName,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");
    XLSX.writeFile(workbook, "teacher-import-template.xlsx");
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
          <DialogTitle>Import Teachers from File</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file with teacher information to bulk import them into the system
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
                <p className="text-xs text-gray-500 mb-4">Supported formats: Excel (.xlsx, .xls) or CSV (.csv)</p>
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
                  <div>- username (optional, auto-generated if missing)</div>
                  <div>- name and surname, or full name</div>
                  <div>- sex (MALE/FEMALE or Male/Female)</div>
                  <div>- birthday (YYYY-MM-DD or valid date)</div>
                  <div>- address</div>
                  <div>- subjects or subjectIds (optional)</div>
                </div>
                <p className="text-xs text-blue-700 mt-3">
                  Optional: password, email, phone. Multiple subjects can be separated with commas, semicolons,
                  or pipes.
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
                        <th className="px-2 py-2 text-left">Username</th>
                        <th className="px-2 py-2 text-left">Name</th>
                        <th className="px-2 py-2 text-left">Surname</th>
                        <th className="px-2 py-2 text-left">Email</th>
                        <th className="px-2 py-2 text-left">Subjects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/50 transition-colors">
                          <td className="px-2 py-2">{row.username}</td>
                          <td className="px-2 py-2">{row.name}</td>
                          <td className="px-2 py-2">{row.surname}</td>
                          <td className="px-2 py-2">{row.email}</td>
                          <td className="px-2 py-2">{row.subjects}</td>
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
                  {isLoading ? "Importing..." : "Import Teachers"}
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
