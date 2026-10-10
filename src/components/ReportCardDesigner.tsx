"use client";

import { useState, useCallback, useRef, useEffect, type CSSProperties } from "react";
import { saveReportCard, getSavedReportCards, deleteSavedReportCard, updateReportCardRanks, getReportCardAutoFields, updateReportCardSubjectPositions, upsertReportCardEntries, getStudentReportCardEntries } from "@/lib/actions/reportCardActions";
import { saveReportArchive, getReportArchives, deleteReportArchive } from "@/lib/actions/reportArchiveActions";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export type StudentEntry = {
  id: string;
  name: string;
  studentId: string;
  className: string;
  serialNo?: number;
};

export type ClassGroup = {
  label: string;
  className: string;
  students: StudentEntry[];
  /** Subject names this teacher is assigned to for this class (undefined = all editable) */
  assignedSubjectNames?: string[];
};

interface ReportCardDesignerProps {
  defaultAttendanceOut?: string;
  defaultNextTerm?: string;
  schoolStamp?: string | null;
  /** Admin mode: flat list of all students, no serial numbers */
  students?: { id: string; name: string; studentId: string; className: string }[];
  /** Teacher mode: grouped by supervised class / taught classes, with serial numbers */
  studentGroups?: ClassGroup[];
  /** The logged-in teacher's ID (used to attribute per-subject saves) */
  teacherId?: string;
  /** The logged-in teacher's display name */
  teacherName?: string;
}

// ─── GRADING LOGIC ────────────────────────────────────────────────
const DEFAULT_GRADE_SCALE = [
  { min: 80, max: 100, grade: "A", remark: "Excellence" },
  { min: 70, max: 79,  grade: "B", remark: "Very Good" },
  { min: 60, max: 69,  grade: "C", remark: "Good" },
  { min: 50, max: 59,  grade: "D", remark: "Average" },
  { min: 45, max: 49,  grade: "E", remark: "Pass" },
  { min: 40, max: 44,  grade: "F", remark: "Very Weak" },
  { min: 35, max: 39,  grade: "G", remark: "Very Weak" },
  { min: 0,  max: 34,  grade: "F", remark: "Fail" },
];

const DEFAULT_REPORT_SCHOOL_NAME = "School Name";

// ─── DROPDOWN OPTIONS ─────────────────────────────────────────────
const CONDUCT_OPTIONS = [
  "Calm",
  "Sociable",
  "Respectful",
  "Responsible",
  "Well-Behaved",
];

const INTEREST_OPTIONS = [
  "Football",
  "Netball",
  "Debate",
  "Creativity",
  "Athletics",
];

const CLASS_REMARK_OPTIONS = [
  "Outstanding performance, keep it up.",
  "Very good progress this term.",
  "Good work but can do better.",
  "Showing improvement, continue working hard.",
  "Needs to put in more effort next term.",
];

const HEAD_REMARK_OPTIONS = [
  "Excellent academic performance.",
  "Very commendable effort.",
  "Good progress, maintain consistency.",
  "Satisfactory performance.",
  "Needs improvement in the next term.",
];

type GradeBand = { min: number; max: number; grade: string; remark: string };
type ScoreCol = { id: string; label: string; weight: number; editable: boolean };
type Row = {
  id: string;
  subject: string;
  classScore: string;
  examScore: string;
  total: string;
  grade: string;
  position: string;
  remarks: string;
  [key: string]: string;
};

// Saved card snapshot
type SavedCard = {
  id: string;
  savedAt: string;
  studentName: string;
  className: string;
  rollNo: string;
  nextTerm: string;
  overallPos: string;
  attendance: string;
  attendOut: string;
  promotedTo: string;
  conduct: string;
  interest: string;
  classRemark: string;
  headRemark: string;
  schoolName: string;
  reportTitle: string;
  level: string;
  rows: Row[];
  scoreCols: ScoreCol[];
  gradeScale: GradeBand[];
};

type StoredArchive = {
  id: string;
  title: string;
  fileUrl: string;
  academicYear: string;
  term: string;
  createdAt: string;
};

type PublicSettingsResponse = {
  schoolName?: string | null;
  schoolStamp?: string | null;
};

function getGrade(total: string, scale: GradeBand[]): { grade: string; remark: string } {
  if (total === "" || total === null || isNaN(Number(total))) return { grade: "", remark: "" };
  const n = Number(total);
  const found = scale.find(s => n >= s.min && n <= s.max);
  return found ? { grade: found.grade, remark: found.remark } : { grade: "F", remark: "Fail" };
}

const GRADE_COLORS: Record<string, string> = {
  A: "#16a34a", B: "#2563eb", C: "#0891b2",
  D: "#d97706", E: "#ea580c", F: "#dc2626", G: "#dc2626",
};

// ─── TOOLBAR STYLES ────────────────
const toolbarSectionStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  padding: "6px",
  border: "1px solid #31547a",
  borderRadius: 8,
  background: "rgba(15, 23, 42, 0.28)",
};

const toolbarLabelStyle: CSSProperties = {
  color: "#93a9c7",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 0,
  textTransform: "uppercase",
  margin: "0 2px",
};

// ─── DEFAULT DATA ────────────────
const DEFAULT_SUBJECTS = [
  "English Language", "Mathematics", "Integrated Science",
  "R.M.E", "Fanti", "Career Technology", "Creative Arts", "Social Studies", "Computing",
];

const mkRow = (subject = ""): Row => ({
  id: crypto.randomUUID(),
  subject,
  classScore: "",
  examScore: "",
  total: "",
  grade: "",
  position: "",
  remarks: "",
});

const DEFAULT_ROWS: Row[] = DEFAULT_SUBJECTS.map(s => mkRow(s));

// ─── INLINE CELL EDITOR ─────────────
interface CellProps {
  value: string;
  onChange: (v: string) => void;
  align?: "center" | "left" | "right";
  bold?: boolean;
  italic?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  highlight?: string;
  minW?: number;
  minHeight?: number;
  fontSize?: number;
  onTab?: () => void;
}

function Cell({
  value, onChange, align = "center", bold = false, italic = false,
  placeholder = "", readOnly = false, highlight = "", minW = 50, minHeight = 42, fontSize = 13, onTab,
}: CellProps) {
  const [edit, setEdit] = useState(false);
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => { if (edit && ref.current) ref.current.focus(); }, [edit]);

  const commit = () => { setEdit(false); if (local !== value) onChange(local); };

  if (readOnly) return (        
    <td style={{
      minWidth: minW, minHeight, padding: "4px 6px", textAlign: align, fontSize,
      fontWeight: bold ? 700 : 400, fontStyle: italic ? "italic" : "normal",
      color: GRADE_COLORS[value] || (highlight || "#1e293b"),
      background: highlight ? highlight + "18" : "transparent",
    }}>
      {value || <span style={{ color: "#cbd5e1" }}>{placeholder}</span>}
    </td>
  );

  return (
    <td
      onClick={() => setEdit(true)}
      style={{
        minWidth: minW, minHeight, padding: 0, textAlign: align, cursor: "text",
        background: edit ? "#eff6ff" : "transparent", transition: "background .15s",
      }}
    >
      {edit ? (
        <input
          ref={ref} value={local} onChange={e => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault(); commit(); onTab && onTab();
            }
          }}
          style={{
            width: "100%", minWidth: minW, border: "none", outline: "2px solid #3b82f6",
            background: "#eff6ff", padding: "4px 6px", fontSize, fontWeight: bold ? 700 : 400,
            textAlign: align, borderRadius: 4, color: "#1e293b",
          }}
        />
      ) : (
        <div style={{
          padding: "8px 6px", fontSize, fontWeight: bold ? 700 : 400,
          fontStyle: italic ? "italic" : "normal", color: GRADE_COLORS[value] || "#1e293b",
          minHeight, display: "flex", alignItems: "center", justifyContent: align, whiteSpace: "nowrap",
        }}>
          {value || <span style={{ color: "#cbd5e1" }}>{placeholder}</span>}
        </div>
      )}
    </td>
  );
}

// ─── DROPDOWN FIELD ──────────────────
function DropdownField({
  label, value, onChange, options, isPreview,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  isPreview: boolean;
}) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const isOther = showCustomInput || Boolean(value && !options.includes(value));

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", minWidth: 180, paddingTop: 4 }}>
        {label}:
      </span>
      {isPreview ? (
        <div style={{ 
          flex: 1, borderBottom: "1px solid #94a3b8", minHeight: 28, fontSize: 13,
          display: "flex", alignItems: "flex-end", paddingBottom: "8px", color: "#1e293b"
        }}>{value}</div>
      ) : isOther ? (
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          <input
            autoFocus
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Type custom text..."
            style={{
              flex: 1,
              border: "none",
              borderBottom: "2px solid #3b82f6",
              fontSize: 13,
              outline: "none",
              background: "transparent",
              padding: "2px 4px",
              color: "#1e293b",
            }}
          />
          <button
            onClick={() => {
              setShowCustomInput(false);
              onChange(""); // reset
            }}
            title="Back to dropdown"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "2px 4px",
              fontSize: 12,
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <select
          value={value}
          onChange={e => {
            if (e.target.value === "___OTHER___") {
              setShowCustomInput(true);
              onChange(""); // clear value for them to start typing
            } else {
              onChange(e.target.value);
            }
          }}
          style={{
            flex: 1,
            border: "none",
            borderBottom: "2px solid #94a3b8",
            fontSize: 13,
            outline: "none",
            background: "transparent",
            padding: "2px 4px",
            cursor: "pointer",
            color: value ? "#1e293b" : "#94a3b8",
            appearance: "auto",
          }}
        >
          <option value="">— Select —</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <option value="___OTHER___" style={{ fontStyle: "italic", fontWeight: "bold" }}>Other (Type custom...)</option>
        </select>
      )}
    </div>
  );
}

// ─── SINGLE CARD RENDERER (for print-all) ────────────
function ReportCardView({ card, gradeScale, stampSrc }: { card: SavedCard; gradeScale: GradeBand[]; stampSrc?: string | null }) {
  const computedRows = card.rows.map(row => {
    const total = card.scoreCols.reduce((sum, col) => {
      const v = parseFloat(row[col.id] ?? "");
      const scaled = isNaN(v) ? 0 : (v / 100) * col.weight;
      return sum + scaled;
    }, 0);
    const hasAny = card.scoreCols.some(c => (row[c.id] ?? "") !== "" && !isNaN(parseFloat(row[c.id] ?? "")));
    const totalStr = hasAny ? total.toFixed(1) : "";
    const { grade, remark } = getGrade(totalStr, gradeScale);
    return { ...row, total: totalStr, grade, remarks: remark };
  });

  return (
    <div
      className="rc-card-break"
      style={{
        maxWidth: 860, margin: "0 auto 32px", background: "#fff",
        color: "#1e293b", // Force dark text for PDF/Print
        border: "2px solid #1e3a5f", fontFamily: "var(--font-sora), 'Sora', 'Segoe UI', system-ui, sans-serif",
        pageBreakAfter: "always", breakAfter: "page",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ background: "#1e3a5f", padding: "18px 24px", textAlign: "center" }}>
        <h1 style={{ color: "#fff", margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>{card.schoolName}</h1>
        <div style={{ color: "#93c5fd", fontSize: 13, marginTop: 4, fontWeight: 600 }}>{card.reportTitle}</div>
        <div style={{ color: "#dbeafe", fontSize: 14, marginTop: 2, fontWeight: 700, letterSpacing: 2 }}>{card.level}</div>
      </div>

      {/* Student Info */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
          {([
            ["NAME OF PUPIL", card.studentName],
            ["CLASS", card.className],
            ["NO. ON ROLL", card.rollNo],
            ["NEXT TERM BEGINS", card.nextTerm],
            ["OVERALL POSITION", card.overallPos],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", whiteSpace: "nowrap", minWidth: 120 }}>{label}:</span>
              <span style={{ 
                fontSize: 13, borderBottom: "1px solid #64748b", flex: 1, 
                display: "flex", alignItems: "flex-end", paddingBottom: "8px", minHeight: 24,
                color: "#1e293b", fontWeight: 500
              }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Score Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#1e3a5f", color: "#fff" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, minWidth: 160 }}>SUBJECT</th>
              {card.scoreCols.map(col => (
                <th key={col.id} style={{ padding: "12px 8px", textAlign: "center", fontWeight: 700, fontSize: 11, minWidth: 80 }}>
                  {col.label}<br /><span style={{ fontSize: 10, color: "#93c5fd" }}>({col.weight}%)</span>
                </th>
              ))}
              <th style={{ padding: "8px", textAlign: "center", fontSize: 11, fontWeight: 700, minWidth: 70, background: "#15294d" }}>
                TOTAL<br /><span style={{ fontSize: 10, color: "#93c5fd" }}>(100%)</span>
              </th>
              <th style={{ padding: "8px", textAlign: "center", fontSize: 11, fontWeight: 700, minWidth: 50, background: "#15294d" }}>POS.</th>
              <th style={{ padding: "8px", textAlign: "center", fontSize: 11, fontWeight: 700, minWidth: 50, background: "#15294d" }}>GRADE</th>
              <th style={{ padding: "8px", textAlign: "center", fontSize: 11, fontWeight: 700, minWidth: 120, background: "#15294d" }}>REMARKS</th>
            </tr>
          </thead>
          <tbody>
            {computedRows.map((row, ri) => (
              <tr key={row.id} style={{ background: ri % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px 12px", fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{row.subject}</td>
                {card.scoreCols.map(col => (
                  <td key={col.id} style={{ padding: "12px 8px", textAlign: "center", fontSize: 13 }}>
                    {(row as Record<string, string>)[col.id] ?? ""}
                  </td>
                ))}
                <td style={{ padding: "12px 8px", textAlign: "center", fontWeight: 700, fontSize: 13, color: "#1e3a5f" }}>{row.total}</td>
                <td style={{ padding: "12px 8px", textAlign: "center", fontSize: 13 }}>{row.position}</td>
                <td style={{ padding: "12px 8px", textAlign: "center", fontWeight: 700, fontSize: 13, color: GRADE_COLORS[row.grade] || "#1e293b" }}>{row.grade}</td>
                <td style={{ padding: "12px 8px", textAlign: "center", fontStyle: "italic", fontSize: 12 }}>{row.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: "14px 20px", borderTop: "2px solid #1e3a5f" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 24px", marginBottom: 10, alignItems: "center" }}>
          {([
            ["ATTENDANCE", card.attendance],
            ["OUT OF", card.attendOut],
            ["PROMOTED TO", card.promotedTo],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{label}:</span>
              <span style={{ 
                fontSize: 13, borderBottom: "1px solid #64748b", minWidth: 80, 
                display: "flex", alignItems: "flex-end", paddingBottom: "8px", minHeight: 24,
                color: "#1e293b", fontWeight: 500
              }}>{val}</span>
            </div>
          ))}
        </div>
        {([
          ["CONDUCT", card.conduct],
          ["INTEREST", card.interest],
          ["CLASS TEACHER'S REMARKS", card.classRemark],
          ["HEAD TEACHER'S REMARKS", card.headRemark],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", minWidth: 180, paddingTop: 4 }}>{label}:</span>
            <div style={{ 
              flex: 1, borderBottom: "1px solid #94a3b8", minHeight: 28, fontSize: 13,
              display: "flex", alignItems: "flex-end", paddingBottom: "8px", color: "#1e293b" 
            }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Grade interpretation */}
      <div style={{ padding: "12px 20px", background: "#f8fafc", marginBottom: "30px", borderTop: "1px solid #e2e8f0" }}>
        <p style={{ fontWeight: 700, fontSize: 11, textAlign: "center", color: "#1e3a5f", marginBottom: 8, textDecoration: "underline", letterSpacing: 1 }}>
          INTERPRETATION OF MARKS
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 4 }}>
          {card.gradeScale.map((g, i) => (
            <div key={i} style={{ fontSize: 11, color: "#374151" }}>
              <span style={{ fontWeight: 700, color: GRADE_COLORS[g.grade] || "#374151" }}>({g.grade})</span>
              {" "}{g.min}–{g.max} — {g.remark}
            </div>
          ))}
        </div>
      </div>

  
      {/* Stamp */}
      <div style={{ paddingTop: "80px", paddingRight:"30px",paddingBottom:"20px", textAlign: "right", borderTop: "1px solid #e2e8f0", position: "relative" }}>
        {stampSrc && (
          <img 
            src={stampSrc} 
            alt="Stamp" 
            className="rc-archive-stamp"
            style={{ position: "absolute", right: 60, top: 20, width: 80, height: 80, objectFit: "contain", opacity: 0.9, zIndex: 1 }} 
          />
        )}
        <div style={{ display: "inline-block", borderTop: "2px solid #1e3a5f", paddingTop: 4, minWidth: 200, textAlign: "center", fontSize: 11, fontWeight: 700, color: "#1e3a5f", letterSpacing: 1, position: "relative", zIndex: 2 }}>
          HEAD TEACHER'S SIGNATURE & STAMP
        </div>
      </div>
    </div>
  );
}

function getOrdinalSuffix(i: number) {
  const j = i % 10, k = i % 100;
  if (j === 1 && k !== 11) return i + "st";
  if (j === 2 && k !== 12) return i + "nd";
  if (j === 3 && k !== 13) return i + "rd";
  return i + "th";
}

const getCardTotal = (card: SavedCard) => {
  let grandTotal = 0;
  card.rows.forEach(row => {
    const rowTotal = card.scoreCols.reduce((sum, col) => {
      const v = parseFloat(row[col.id] ?? "");
      const scaled = isNaN(v) ? 0 : (v / 100) * col.weight;
      return sum + scaled;
    }, 0);
    grandTotal += rowTotal;
  });
  return grandTotal;
};

// ─── MAIN COMPONENT ──────────────────
export default function ReportCardDesigner({ defaultAttendanceOut = "", defaultNextTerm = "", schoolStamp = null, students = [], studentGroups, teacherId, teacherName }: ReportCardDesignerProps = {}) {
  // ── School / Header Meta ──
  const [schoolName,  setSchoolName]  = useState(DEFAULT_REPORT_SCHOOL_NAME);
  const [reportTitle, setReportTitle] = useState("END OF TERM ONE REPORT CARD");
  const [level,       setLevel]       = useState("JUNIOR HIGH SCHOOL");
  const [studentName, setStudentName] = useState("");
  const [className,   setClassName]   = useState("");
  const [rollNo,      setRollNo]      = useState("");
  const [nextTerm,    setNextTerm]    = useState(defaultNextTerm);
  const [overallPos,  setOverallPos]  = useState("");
  const [attendance,  setAttendance]  = useState("");
  const [attendOut,   setAttendOut]   = useState(defaultAttendanceOut);
  const [promotedTo,  setPromotedTo]  = useState("");
  const [conduct,     setConduct]     = useState("");
  const [interest,    setInterest]    = useState("");
  const [classRemark, setClassRemark] = useState("");
  const [headRemark,  setHeadRemark]  = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  // Map of subjectName (lower-cased) → { savedBy (teacherId), savedByName } from persisted entries
  const [entriesMap, setEntriesMap] = useState<Record<string, { savedBy: string; savedByName: string; classScore: string; examScore: string; total: string; grade: string; remarks: string }>>({});
  const [studentSearch, setStudentSearch] = useState("");
  const [showStudentResults, setShowStudentResults] = useState(false);
  const settingsSchoolNameRef = useRef<string | null>(null);
  const [schoolStampUrl, setSchoolStampUrl] = useState<string | null>(schoolStamp);
  // ── Teacher-mode group switch ──
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const isGroupMode = !!studentGroups && studentGroups.length > 0;
  // Active student list for searching (group-aware)
  const activeStudents: StudentEntry[] = isGroupMode
    ? (studentGroups![activeGroupIdx]?.students ?? [])
    : (students as StudentEntry[]);

  // ── Subject-level access control (teacher mode) ──
  // When the active group has assignedSubjectNames, only those subjects are score-editable.
  const activeGroupAssignedSubjects: string[] | null = isGroupMode
    ? (studentGroups![activeGroupIdx]?.assignedSubjectNames ?? null)
    : null;
  const assignedSubjectSet: Set<string> | null = activeGroupAssignedSubjects
    ? new Set(activeGroupAssignedSubjects.map(s => s.trim().toLowerCase()))
    : null;
  /**
   * Returns true when a row's subject is locked (scores should be readOnly).
   * A subject is locked if:
   *   (a) this teacher is not assigned to it (assignedSubjectSet filter), OR
   *   (b) it has already been saved by a DIFFERENT teacher (entriesMap conflict check).
   */
  const isSubjectLocked = (subjectName: string): boolean => {
    const key = subjectName.trim().toLowerCase();
    // If another teacher already saved this subject, lock it for us
    const entry = entriesMap[key];
    if (entry && teacherId && entry.savedBy !== teacherId) return true;
    // If we have an explicit subject assignment list, only our subjects are editable
    if (!assignedSubjectSet) return false;
    return !assignedSubjectSet.has(key);
  };
  /** Returns the name of the teacher who owns this subject row (if any) */
  const subjectOwner = (subjectName: string): string | null => {
    const entry = entriesMap[subjectName.trim().toLowerCase()];
    if (!entry) return null;
    if (teacherId && entry.savedBy === teacherId) return null; // it's ours
    return entry.savedByName || "another teacher";
  };

  useEffect(() => {
    let cancelled = false;

    const applySettings = (data: PublicSettingsResponse) => {
      if ("schoolStamp" in data) {
        setSchoolStampUrl(typeof data.schoolStamp === "string" ? data.schoolStamp : null);
      }
      const nextSchoolName = typeof data.schoolName === "string" ? data.schoolName.trim() : "";
      if (!nextSchoolName) return;

      const previousSettingsName = settingsSchoolNameRef.current;
      settingsSchoolNameRef.current = nextSchoolName;

      setSchoolName(prev => {
        const current = prev.trim();
        if (!current || current === DEFAULT_REPORT_SCHOOL_NAME || current === previousSettingsName) {
          return nextSchoolName;
        }

        return prev;
      });
    };

    const fetchSettings = () => {
      fetch("/api/settings")
        .then(res => (res.ok ? res.json() : null))
        .then((data: PublicSettingsResponse | null) => {
          if (!cancelled && data) applySettings(data);
        })
        .catch(() => {});
    };

    fetchSettings();
    window.addEventListener("settings-updated", fetchSettings);

    return () => {
      cancelled = true;
      window.removeEventListener("settings-updated", fetchSettings);
    };
  }, []);



  // ── Grading Scale ──
  const [gradeScale,      setGradeScale]      = useState<GradeBand[]>(DEFAULT_GRADE_SCALE);
  const [showGradeEditor, setShowGradeEditor] = useState(false);

  // ── Score columns config ──
  const [scoreCols, setScoreCols] = useState<ScoreCol[]>([
    { id: "classScore", label: "Class Score", weight: 50, editable: true },
    { id: "examScore",  label: "Exam Score",  weight: 50, editable: true },
  ]);

  // ── Rows ──
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);

  // ── UI State ──
  const [mode,         setMode]         = useState<"edit" | "preview">("edit");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // ── Saved Cards ──
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [showSavedPanel, setShowSavedPanel] = useState(false);
  const [printAllMode,   setPrintAllMode]   = useState(false);
  const [saveSuccess,    setSaveSuccess]    = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isRanking, setIsRanking] = useState(false);
  const [isRankingSubjects, setIsRankingSubjects] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchivingView, setIsArchivingView] = useState(false);

  // ── Archives State ──
  const [archives, setArchives] = useState<StoredArchive[]>([]);
  const [showArchivesPanel, setShowArchivesPanel] = useState(false);
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);

  // Embed the current school's stamp before html2canvas captures archived PDFs.
  const [stampSrc, setStampSrc] = useState<string | null>(schoolStampUrl);
  const stampLoadRef = useRef<Promise<string | null>>(Promise.resolve(schoolStampUrl));
  useEffect(() => {
    if (!schoolStampUrl) {
      setStampSrc(null);
      stampLoadRef.current = Promise.resolve(null);
      return;
    }

    let cancelled = false;
    setStampSrc(schoolStampUrl);
    stampLoadRef.current = fetch(schoolStampUrl)
      .then(response => {
        if (!response.ok) throw new Error(`Stamp request failed: ${response.status}`);
        return response.blob();
      })
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .then(dataUrl => {
        if (!cancelled) setStampSrc(dataUrl);
        return dataUrl;
      })
      .catch(error => {
        console.error("Could not load the school stamp for report cards:", error);
        if (!cancelled) setStampSrc(schoolStampUrl);
        return null;
      });

    return () => { cancelled = true; };
  }, [schoolStampUrl]);


  // ── Archive All to System (PDF) ──
  const doArchive = async () => {
    if (savedCards.length === 0) return;
    setIsArchiving(true);
    setIsArchivingView(true);

    try {
      const embeddedStamp = await stampLoadRef.current;
      if (schoolStampUrl && !embeddedStamp) {
        alert("The school stamp could not be loaded. Please retry before archiving these report cards.");
        return;
      }

      // Wait for React to commit the off-screen cards with the embedded stamp.
      let cardsReady = false;
      for (let attempt = 0; attempt < 120; attempt++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        cardsReady = savedCards.every((_, index) => {
          const card = document.getElementById(`archive-card-${index}`);
          if (!card) return false;
          const image = card.querySelector<HTMLImageElement>("img.rc-archive-stamp");
          return embeddedStamp ? image?.getAttribute("src") === embeddedStamp : !image;
        });
        if (cardsReady) break;
      }
      if (!cardsReady) throw new Error("Report cards did not render for archiving");

      const pdf = new jsPDF("p", "mm", "a4");
      const A4_W = pdf.internal.pageSize.getWidth();  // 210mm
      const A4_H = pdf.internal.pageSize.getHeight(); // 297mm

      for (let i = 0; i < savedCards.length; i++) {
        const el = document.getElementById(`archive-card-${i}`);
        if (!el) throw new Error(`Report card ${i + 1} is missing from the archive view`);

        await Promise.all(
          Array.from(el.querySelectorAll<HTMLImageElement>("img.rc-archive-stamp"))
            .map(image => image.decode())
        );

        const canvas = await html2canvas(el, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: el.offsetWidth,
          height: el.offsetHeight,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.96);

        // Each card fills exactly one A4 page
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, A4_W, A4_H);
      }

      const base64Pdf = pdf.output("datauristring");
      const termTitle = savedCards[0]?.reportTitle || "Report_Cards";
      const academicYear = new Date().getFullYear().toString();

      const res = await saveReportArchive({
        title: `${level} - ${termTitle} Archive (${savedCards.length} Cards)`,
        base64Pdf,
        academicYear,
        term: termTitle,
      });

      if (res.success) {
        alert("PDF Archive saved successfully to the system!");
        if (res.data) {
          setArchives(prev => [{ ...res.data, createdAt: new Date(res.data.createdAt || Date.now()).toISOString() }, ...prev]);
        }
      } else {
        alert(res.error || "Failed to save archive");
      }
    } catch (err) {
      console.error("Archive generation error:", err);
      alert("Error generating PDF Archive");
    } finally {
      setIsArchivingView(false);
      setIsArchiving(false);
    }
  };




  // ── Rank Subjects Per-Subject Using DENSE_RANK ──
  const rankSubjectPositions = async () => {
    if (savedCards.length === 0) return;
    if (!confirm("This will auto-fill the POS. column for every subject row across all saved cards using DENSE_RANK. Are you sure?")) return;

    setIsRankingSubjects(true);

    // Group cards by class + term
    const groups: Record<string, SavedCard[]> = {};
    savedCards.forEach(c => {
      const key = `${c.className}||${c.reportTitle}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });

    // Build { cardId → updatedRows } map
    const cardRowsMap: Record<string, Row[]> = {};
    savedCards.forEach(c => { cardRowsMap[c.id] = JSON.parse(JSON.stringify(c.rows)); });

    Object.values(groups).forEach(group => {
      // Collect all unique subject names across this group
      const subjectNames = Array.from(
        new Set(group.flatMap(c => c.rows.map(r => r.subject.trim()).filter(Boolean)))
      );

      subjectNames.forEach(subjectName => {
        // Gather { cardId, score } for this subject from each card
        const entries: { cardId: string; score: number | null }[] = group.map(card => {
          // Find the matching row by subject name
          const row = card.rows.find(r => r.subject.trim() === subjectName);
          if (!row) return { cardId: card.id, score: null };

          // Compute this card's total score for that row using the card's scoreCols
          const hasAny = card.scoreCols.some(col =>
            (row[col.id] ?? "") !== "" && !isNaN(parseFloat(row[col.id] ?? ""))
          );
          if (!hasAny) return { cardId: card.id, score: null };

          const total = card.scoreCols.reduce((sum, col) => {
            const v = parseFloat(row[col.id] ?? "");
            const scaled = isNaN(v) ? 0 : (v / 100) * col.weight;
            return sum + scaled;
          }, 0);

          return { cardId: card.id, score: parseFloat(total.toFixed(1)) };
        });

        // Apply DENSE_RANK (descending) only for entries that have a score
        const withScores = entries
          .filter(e => e.score !== null)
          .sort((a, b) => (b.score as number) - (a.score as number));

        let denseRank = 1;
        withScores.forEach((entry, idx) => {
          if (idx > 0 && (entry.score as number) < (withScores[idx - 1].score as number)) {
            denseRank++; // Only increment rank when score actually changes
          }
          // Update the position field of the matching row in our map
          const rowsForCard = cardRowsMap[entry.cardId];
          const rowIdx = rowsForCard.findIndex(r => r.subject.trim() === subjectName);
          if (rowIdx !== -1) {
            rowsForCard[rowIdx] = { ...rowsForCard[rowIdx], position: getOrdinalSuffix(denseRank) };
          }
        });
      });
    });

    // Build updates array and persist
    const updates = Object.entries(cardRowsMap).map(([id, rows]) => ({ id, rows }));
    const res = await updateReportCardSubjectPositions(updates);

    if (res.success) {
      setSavedCards(prev =>
        prev.map(c => {
          const updatedRows = cardRowsMap[c.id];
          return updatedRows ? { ...c, rows: updatedRows } : c;
        })
      );
      alert("Subject positions updated successfully using DENSE_RANK!");
    } else {
      alert("Failed to update subject positions.");
    }

    setIsRankingSubjects(false);
  };

  // ── Rank Students (SQL Rank) ──
  const rankStudents = async () => {
    if (savedCards.length === 0) return;
    if (!confirm("This will overwrite 'OVERALL POSITION' for all loaded students based on total marks. Are you sure?")) {
      return;
    }

    setIsRanking(true);
    
    // Group cards by class and term
    const groups: Record<string, SavedCard[]> = {};
    savedCards.forEach(c => {
      const key = `${c.className}-${c.reportTitle}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });

    const updates: { id: string; overallPos: string }[] = [];

    Object.values(groups).forEach(group => {
      // Sort group descending by total score
      const sorted = [...group].sort((a, b) => getCardTotal(b) - getCardTotal(a));
      
      let currentRank = 1;
      let prevScore = -1;
      let tieCount = 0;

      sorted.forEach((c, index) => {
        const score = getCardTotal(c);
        if (index === 0) {
          currentRank = 1;
          tieCount = 0;
        } else if (score === prevScore) {
          tieCount++;
        } else {
          currentRank = currentRank + tieCount + 1;
          tieCount = 0;
        }
        prevScore = score;
        updates.push({ id: c.id, overallPos: getOrdinalSuffix(currentRank) });
      });
    });

    const res = await updateReportCardRanks(updates);
    if (res.success) {
      setSavedCards(prev => prev.map(c => {
        const up = updates.find(u => u.id === c.id);
        if (up) {
          return { ...c, overallPos: up.overallPos };
        }
        return c;
      }));
      alert("Ranking updated successfully!");
    } else {
      alert("Failed to update rankings.");
    }
    setIsRanking(false);
  };

  // Fetch saved cards on mount
  useEffect(() => {
    async function fetchAll() {
      setIsLoadingCards(true);
      const res = await getSavedReportCards();
      if (res.success && res.data) {
        const mapped = res.data.map(d => ({
          ...(d.cardData as Omit<SavedCard, "id" | "savedAt">),
          id: d.id,
          savedAt: d.createdAt.toISOString(),
        })) as SavedCard[];
        setSavedCards(mapped);
      }
      setIsLoadingCards(false);

      setIsLoadingArchives(true);
      const resArch = await getReportArchives();
      if (resArch.success && resArch.data) {
         setArchives(resArch.data.map(a => ({
           ...a,
           createdAt: a.createdAt.toISOString()
         })) as StoredArchive[]);
      }
      setIsLoadingArchives(false);
    }
    fetchAll();
  }, []);

  // ── Auto-load report card fields & saved entries when student is selected ──
  useEffect(() => {
    if (!selectedStudentId) {
      setEntriesMap({});
      return;
    }

    async function loadAutoFields() {
      const result = await getReportCardAutoFields(selectedStudentId!);
      if (result.success && result.data) {
        setRollNo(result.data.rollNo);
        setNextTerm(result.data.nextTerm);
        setAttendance(result.data.attendance);
        setPromotedTo(result.data.promotedTo);
      }
    }

    async function loadSavedEntries() {
      // Derive term & year from current reportTitle / year fields (best-effort)
      const term = reportTitle;
      const academicYear = new Date().getFullYear().toString();
      const result = await getStudentReportCardEntries(selectedStudentId!, term, academicYear);
      if (result.success && result.data) {
        const map: typeof entriesMap = {};
        for (const e of result.data) {
          map[e.subjectName.trim().toLowerCase()] = {
            savedBy: e.savedBy,
            savedByName: e.savedByName,
            classScore: e.classScore,
            examScore: e.examScore,
            total: e.total,
            grade: e.grade,
            remarks: e.remarks,
          };
        }
        setEntriesMap(map);
        // Pre-fill rows with any already-saved scores
        setRows(prev => prev.map(row => {
          const entry = map[row.subject.trim().toLowerCase()];
          if (!entry) return row;
          return {
            ...row,
            classScore: entry.classScore || row.classScore,
            examScore: entry.examScore || row.examScore,
          };
        }));
      }
    }

    loadAutoFields();
    loadSavedEntries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId]);

  // ── Auto-compute totals & grades ──
  const computedRows = rows.map(row => {
    const total = scoreCols.reduce((sum, col) => {
      const v = parseFloat(row[col.id] ?? "");
      const scaled = isNaN(v) ? 0 : (v / 100) * col.weight;
      return sum + scaled;
    }, 0);
    const hasAny = scoreCols.some(c => (row[c.id] ?? "") !== "" && !isNaN(parseFloat(row[c.id] ?? "")));
    const totalStr = hasAny ? total.toFixed(1) : "";
    const { grade, remark } = getGrade(totalStr, gradeScale);
    return { ...row, total: totalStr, grade, remarks: remark };
  });

  // ── Row operations ──
  const updateRow = useCallback((id: string, field: string, val: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  }, []);

  const addRow = () => setRows(prev => [...prev, mkRow()]);

  const deleteSelectedRows = () => {
    setRows(prev => prev.filter(r => !selectedRows.has(r.id)));
    setSelectedRows(new Set());
  };

  const moveRow = (id: string, dir: -1 | 1) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (dir === -1 && idx === 0) return prev;
      if (dir === 1 && idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next;
    });
  };

  // ── Score column operations ──
  const addScoreCol = () => {
    const id = "extra_" + Date.now();
    setScoreCols(prev => [...prev, { id, label: "New Score", weight: 0, editable: true }]);
    setRows(prev => prev.map(r => ({ ...r, [id]: "" })));
  };

  const removeScoreCol = (id: string) => {
    if (scoreCols.length <= 1) return;
    setScoreCols(prev => prev.filter(c => c.id !== id));
  };

  const updateScoreCol = (id: string, field: string, val: string | number) => {
    setScoreCols(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const totalWeight = scoreCols.reduce((s, c) => s + Number(c.weight || 0), 0);

  // ── Print current card ──
  const printCard = () => {
    setMode("preview");
    setTimeout(() => window.print(), 300);
  };

  // ── Save Report Card ──
  const saveCard = async () => {
    const cardData = {
      studentName, className, rollNo, nextTerm, overallPos,
      attendance, attendOut, promotedTo, conduct, interest, classRemark, headRemark,
      schoolName, reportTitle, level,
      rows: JSON.parse(JSON.stringify(rows)),
      scoreCols: JSON.parse(JSON.stringify(scoreCols)),
      gradeScale: JSON.parse(JSON.stringify(gradeScale)),
    };

    const academicYear = new Date().getFullYear().toString();

    // ── Per-subject upsert (concurrency-safe, teacher-attributed) ──
    // Only upsert the rows this teacher is allowed to edit.
    if (selectedStudentId && teacherId && teacherName) {
      const editableRows = computedRows.filter(r => !isSubjectLocked(r.subject));
      if (editableRows.length > 0) {
        await upsertReportCardEntries(
          editableRows.map(r => ({
            studentId: selectedStudentId,
            subjectName: r.subject,
            term: reportTitle,
            academicYear,
            classScore: r.classScore,
            examScore: r.examScore,
            total: r.total,
            grade: r.grade,
            remarks: r.remarks,
            savedBy: teacherId,
            savedByName: teacherName,
          }))
        );
        // Refresh the entries map so lock indicators update
        const refreshed = await getStudentReportCardEntries(selectedStudentId, reportTitle, academicYear);
        if (refreshed.success && refreshed.data) {
          const map: typeof entriesMap = {};
          for (const e of refreshed.data) {
            map[e.subjectName.trim().toLowerCase()] = {
              savedBy: e.savedBy,
              savedByName: e.savedByName,
              classScore: e.classScore,
              examScore: e.examScore,
              total: e.total,
              grade: e.grade,
              remarks: e.remarks,
            };
          }
          setEntriesMap(map);
        }
      }
    }

    // ── Full-blob save (backward-compatible archive / admin) ──
    const res = await saveReportCard({
      studentName,
      className,
      term: reportTitle,
      academicYear,
      level,
      studentId: selectedStudentId || undefined,
      cardData,
    });

    if (res.success && res.data) {
      const newSavedCard: SavedCard = {
        ...cardData,
        id: res.data.id,
        savedAt: res.data.createdAt.toISOString(),
      };
      setSavedCards(prev => [newSavedCard, ...prev]);
      setShowSavedPanel(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } else {
      alert("Failed to save report card");
    }
  };

  // ── Load a saved card into the editor ──
  const loadCard = (card: SavedCard) => {
    setStudentName(card.studentName);
    setClassName(card.className);
    setRollNo(card.rollNo);
    setNextTerm(card.nextTerm);
    setOverallPos(card.overallPos);
    setAttendance(card.attendance);
    setAttendOut(card.attendOut);
    setPromotedTo(card.promotedTo);
    setConduct(card.conduct);
    setInterest(card.interest);
    setClassRemark(card.classRemark);
    setHeadRemark(card.headRemark);
    setSchoolName(card.schoolName);
    setReportTitle(card.reportTitle);
    setLevel(card.level);
    setRows(card.rows);
    setScoreCols(card.scoreCols);
    setGradeScale(card.gradeScale);
    setMode("edit");
  };

  // ── Print single saved card ──
  const printSavedCard = (card: SavedCard) => {
    loadCard(card);
    setMode("preview");
    setTimeout(() => window.print(), 400);
  };

  // ── Delete saved card ──
  const deleteCard = async (id: string) => {
    if (!confirm("Are you sure you want to delete this saved report card?")) return;
    const res = await deleteSavedReportCard(id);
    if (res.success) {
      setSavedCards(prev => prev.filter(c => c.id !== id));
    } else {
      alert("Failed to delete report card");
    }
  };

  // ── Delete Archive ──
  const handleDeleteArchive = async (id: string) => {
    if (!confirm("Are you sure you want to delete this PDF archive?")) return;
    const res = await deleteReportArchive(id);
    if (res.success) {
      setArchives(prev => prev.filter(a => a.id !== id));
    } else {
      alert("Failed to delete archive");
    }
  };

  // ── Print ALL saved cards ──
  const printAllCards = () => {
    if (savedCards.length === 0) return;
    setPrintAllMode(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintAllMode(false), 500);
    }, 300);
  };

  const isPreview = mode === "preview";

  // ── Print-all mode: render all saved cards ──
  if (printAllMode) {
    return (
      <div id="rc-print-root" style={{ background: "#fff", fontFamily: "var(--font-sora), 'Sora', 'Segoe UI', system-ui, sans-serif" }}>
        {savedCards.map(card => (
          <ReportCardView key={card.id} card={card} gradeScale={card.gradeScale} stampSrc={stampSrc} />
        ))}
        <style>{`
          @page {
            size: A4 portrait;
            margin: 0;
          }
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body { margin: 0 !important; padding: 0 !important; overflow: visible !important; }
            body * { visibility: hidden !important; }
            #rc-print-root, #rc-print-root * { visibility: visible !important; }
            #rc-print-root {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 210mm !important;
              height: auto !important;
              z-index: 9999 !important;
              background: #fff !important;
              padding: 0 !important;
              margin: 0 !important;
              overflow: visible !important;
            }
            button, input[type="checkbox"] { display: none !important; }
            /* Each card exactly fills one A4 page, no overflow onto a second page */
            .rc-card-break {
              width: 210mm !important;
              height: 297mm !important;
              max-width: none !important;
              overflow: hidden !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .rc-card-break:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            table { page-break-inside: avoid; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div id="rc-print-root" style={{ fontFamily: "var(--font-sora), 'Sora', 'Segoe UI', system-ui, sans-serif", background: isPreview ? "#f0f0f0ff" : "#0e0d2cff", minHeight: "100vh" }}>
      {!isPreview && (
        <div style={{
          background: "linear-gradient(180deg, #1f3b62 0%, #193150 100%)",
          padding: "14px 18px",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 12px 30px -24px #000",
          borderBottom: "1px solid #2f5278",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 220 }}>
              <span style={{ color: "#ffffff", fontWeight: 800, fontSize: 18, lineHeight: 1 }}>
                Report Card Designer
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  color: "#cbd5e1",
                  background: "rgba(15, 23, 42, 0.35)",
                  border: "1px solid #31547a",
                  borderRadius: 999,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  Saved {savedCards.length}
                </span>
                <span style={{
                  color: "#cbd5e1",
                  background: "rgba(15, 23, 42, 0.35)",
                  border: "1px solid #31547a",
                  borderRadius: 999,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  Archives {archives.length}
                </span>
              </div>
            </div>

            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: `1px solid ${totalWeight === 100 ? "#22c55e" : "#f87171"}`,
              background: totalWeight === 100 ? "rgba(22, 163, 74, 0.18)" : "rgba(185, 28, 28, 0.18)",
              color: totalWeight === 100 ? "#bbf7d0" : "#fecaca",
              borderRadius: 999,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}>
              <span style={{ color: "#cbd5e1", fontWeight: 700 }}>Weight</span>
              <span style={{ fontSize: 15 }}>{totalWeight}%</span>
              {totalWeight !== 100 && <span style={{ fontSize: 11, color: "#fecaca" }}>Target 100%</span>}
            </div>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 12,
          }}>
            <div style={toolbarSectionStyle}>
              <span style={toolbarLabelStyle}>Edit</span>
            {[
              { label: "➕ Add Subject",       action: addRow,                                    color: "#22c55e" },
              { label: "➕ Add Score Column",   action: addScoreCol,                               color: "#3b82f6" },
              { label: "🗑 Delete Selected",    action: deleteSelectedRows,                        color: "#ef4444", disabled: selectedRows.size === 0 },
              { label: "⚖️ Grade Scale",        action: () => setShowGradeEditor(v => !v),         color: "#f59e0b" },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.action}
                disabled={btn.disabled}
                style={{
                  background: btn.disabled ? "#475569" : btn.color, color: "#fff",
                  border: `1px solid ${btn.disabled ? "#64748b" : btn.color}`,
                  borderRadius: 8,
                  padding: "0 12px",
                  minHeight: 34,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: btn.disabled ? "not-allowed" : "pointer",
                  opacity: btn.disabled ? 0.5 : 1,
                  transition: "all .15s",
                  boxShadow: btn.disabled ? "none" : `0 8px 20px -14px ${btn.color}`,
                  whiteSpace: "nowrap",
                }}
              >
                {btn.label}
              </button>
            ))}

            </div>

            <div style={toolbarSectionStyle}>
              <span style={toolbarLabelStyle}>Current</span>
            <button
              onClick={printCard}
              style={{
                background: "#8b5cf6",
                color: "#fff",
                border: "1px solid #a78bfa",
                borderRadius: 8,
                minHeight: 34,
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all .15s",
                boxShadow: "0 8px 20px -14px #8b5cf6",
                whiteSpace: "nowrap",
              }}
            >
              🖨 Print Current
            </button>
            <button
              onClick={saveCard}
              style={{
                background: saveSuccess ? "#16a34a" : "#0369a1",
                color: "#fff",
                border: `1px solid ${saveSuccess ? "#22c55e" : "#0ea5e9"}`,
                borderRadius: 8,
                minHeight: 34,
                padding: "0 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer", transition: "all .2s",
                boxShadow: saveSuccess ? "0 0 0 3px #bbf7d0" : "0 8px 20px -14px #0ea5e9",
                whiteSpace: "nowrap",
              }}
            >
              {saveSuccess ? "✅ Saved!" : "💾 Save Report Card"}
            </button>
            </div>

          {savedCards.length > 0 && (
            <div style={{ ...toolbarSectionStyle, marginLeft: "auto", justifyContent: "flex-end" }}>
              <span style={toolbarLabelStyle}>Batch</span>
                <button
                  onClick={() => setShowSavedPanel(v => !v)}
                  style={{
                    background: "#334155", color: "#e2e8f0", border: "1px solid #475569",
                    borderRadius: 8, minHeight: 34, padding: "0 12px", fontSize: 12,
                    fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  📋 Saved ({savedCards.length})
                </button>
                <button
                  onClick={() => setShowArchivesPanel(v => !v)}
                  style={{
                    background: "#0284c7", color: "#e0f2fe", border: "1px solid #0369a1",
                    borderRadius: 8, minHeight: 34, padding: "0 12px", fontSize: 12,
                    fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  🗂 Archives ({archives.length})
                </button>
                <button
                  onClick={rankSubjectPositions}
                  disabled={isRankingSubjects}
                  style={{
                    background: "#7c3aed", color: "#fff",
                    border: "1px solid #8b5cf6", borderRadius: 8, minHeight: 34,
                    padding: "0 14px", fontSize: 12, fontWeight: 700,
                    cursor: isRankingSubjects ? "not-allowed" : "pointer", opacity: isRankingSubjects ? 0.7 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isRankingSubjects ? "Ranking..." : "📐 Rank Subjects"}
                </button>
                <button
                  onClick={rankStudents}
                  disabled={isRanking}
                  style={{
                    background: "#d97706", color: "#fff",
                    border: "1px solid #f59e0b", borderRadius: 8, minHeight: 34,
                    padding: "0 14px", fontSize: 12, fontWeight: 700,
                    cursor: isRanking ? "not-allowed" : "pointer", opacity: isRanking ? 0.7 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isRanking ? "Ranking..." : "🏆 Rank Students"}
                </button>
                <button
                  onClick={doArchive}
                  disabled={isArchiving}
                  style={{
                    background: "#0369a1", color: "#fff",
                    border: "1px solid #0ea5e9", borderRadius: 8, minHeight: 34,
                    padding: "0 14px", fontSize: 12, fontWeight: 700,
                    cursor: isArchiving ? "not-allowed" : "pointer", opacity: isArchiving ? 0.7 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isArchiving ? "Archiving..." : "💾 Save All to System (PDF)"}
                </button>
                <button
                  onClick={printAllCards}
                  style={{
                    background: "#15803d", color: "#fff",
                    border: "1px solid #22c55e", borderRadius: 8, minHeight: 34,
                    padding: "0 14px", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  📄 Save All as PDF
                </button>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ══ SAVED CARDS PANEL ══ */}
      {showSavedPanel && !isPreview && savedCards.length > 0 && (
        <div style={{ background: "#0f172a", padding: "16px 20px", borderBottom: "2px solid #1e3a5f" }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ color: "#f1f5f9", margin: 0, fontSize: 14, fontWeight: 700 }}>
                📋 Saved Report Cards ({savedCards.length})
              </h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={rankSubjectPositions}
                  disabled={isRankingSubjects}
                  style={{
                    background: "#7c3aed", color: "#fff", border: "none",
                    borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: isRankingSubjects ? "not-allowed" : "pointer", opacity: isRankingSubjects ? 0.7 : 1,
                  }}
                >
                  {isRankingSubjects ? "Ranking..." : "📐 Rank Subjects"}
                </button>
                <button
                  onClick={rankStudents}
                  disabled={isRanking}
                  style={{
                    background: "#d97706", color: "#fff", border: "none",
                    borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: isRanking ? "not-allowed" : "pointer", opacity: isRanking ? 0.7 : 1,
                  }}
                >
                  {isRanking ? "Ranking..." : "🏆 Rank Students"}
                </button>
                <button
                  onClick={doArchive}
                  disabled={isArchiving}
                  style={{
                    background: "#0369a1", color: "#fff", border: "none",
                    borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: isArchiving ? "not-allowed" : "pointer", opacity: isArchiving ? 0.7 : 1,
                  }}
                >
                  {isArchiving ? "Archiving..." : "💾 Save All to System (PDF)"}
                </button>
                <button
                  onClick={printAllCards}
                  style={{
                    background: "#15803d", color: "#fff", border: "none",
                    borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  📄 Print All as PDF
                </button>
                <button
                  onClick={() => setShowSavedPanel(false)}
                  style={{ background: "#334155", border: "none", color: "#94a3b8", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {savedCards.map((card, i) => (
                <div
                  key={card.id}
                  style={{
                    background: "#1e293b", borderRadius: 8, padding: "10px 14px",
                    border: "1px solid #334155", display: "flex", alignItems: "center", gap: 12,
                  }}
                >
                  <span style={{ color: "#64748b", fontSize: 12, minWidth: 24 }}>#{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13 }}>
                      {card.studentName || <span style={{ color: "#64748b", fontStyle: "italic" }}>Unnamed Student</span>}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 11 }}>
                      Class: {card.className || "—"} &nbsp;|&nbsp; Roll: {card.rollNo || "—"} &nbsp;|&nbsp;
                      Pos: {card.overallPos || "—"} &nbsp;|&nbsp;
                      Saved: {new Date(card.savedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => loadCard(card)}
                      title="Load into editor"
                      style={{
                        background: "#1d4ed8", color: "#fff", border: "none",
                        borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600,
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => printSavedCard(card)}
                      title="Print this card"
                      style={{
                        background: "#8b5cf6", color: "#fff", border: "none",
                        borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600,
                      }}
                    >
                      🖨 Print
                    </button>
                    <button
                      onClick={() => deleteCard(card.id)}
                      title="Remove from list"
                      style={{
                        background: "#ef4444", color: "#fff", border: "none",
                        borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600,
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ ARCHIVES PANEL ══ */}
      {showArchivesPanel && !isPreview && (
        <div style={{ background: "#082f49", padding: "16px 20px", borderBottom: "2px solid #0c4a6e" }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ color: "#f0f9ff", margin: 0, fontSize: 14, fontWeight: 700 }}>
                🗂 Saved PDF Archives ({archives.length})
              </h3>
              <button
                onClick={() => setShowArchivesPanel(false)}
                style={{ background: "#0ea5e9", border: "none", color: "#f0f9ff", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
              >
                ✕ Close
              </button>
            </div>

            {isLoadingArchives ? (
              <div style={{ color: "#7dd3fc", textAlign: "center", padding: "20px", fontSize: 13, fontStyle: "italic" }}>
                Loading archives...
              </div>
            ) : archives.length === 0 ? (
              <div style={{ background: "#0c4a6e", borderRadius: 8, padding: "20px", textAlign: "center", border: "1px dashed #0284c7" }}>
                <div style={{ color: "#7dd3fc", fontSize: 13 }}>No archives found. Save all cards to create your first archive!</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {archives.map((archive, i) => (
                  <div
                    key={archive.id}
                    style={{
                      background: "#0c4a6e", borderRadius: 8, padding: "10px 14px",
                      border: "1px solid #0284c7", display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <span style={{ color: "#7dd3fc", fontSize: 12, minWidth: 24 }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#f0f9ff", fontWeight: 700, fontSize: 13 }}>
                        {archive.title}
                      </div>
                      <div style={{ color: "#bae6fd", fontSize: 11 }}>
                        Term: {archive.term} &nbsp;|&nbsp; Year: {archive.academicYear} &nbsp;|&nbsp;
                        Saved: {new Date(archive.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <a
                        href={archive.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View / Download PDF"
                        style={{
                          background: "#0284c7", color: "#fff", border: "none", textDecoration: "none",
                          borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700,
                        }}
                      >
                        📥 Download
                      </a>
                      <button
                        onClick={() => handleDeleteArchive(archive.id)}
                        title="Remove from system"
                        style={{
                          background: "#ef4444", color: "#fff", border: "none",
                          borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700,
                        }}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ GRADE SCALE EDITOR ══ */}
      {showGradeEditor && !isPreview && (
        <div style={{ background: "#0f172a", padding: "16px 20px", borderBottom: "2px solid #334155" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ color: "#f1f5f9", margin: 0, fontSize: 14, fontWeight: 700 }}>⚖️ Grading Scale Editor</h3>
              <button
                onClick={() => setShowGradeEditor(false)}
                style={{ background: "#334155", border: "none", color: "#94a3b8", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}
              >✕ Close</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 8 }}>
              {gradeScale.map((g, i) => (
                <div key={i} style={{ background: "#1e293b", borderRadius: 8, padding: "8px 10px", border: "1px solid #334155" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <input
                      value={g.grade}
                      onChange={e => setGradeScale(prev => prev.map((r, j) => j === i ? { ...r, grade: e.target.value } : r))}
                      style={{ width: 32, background: "#0f172a", border: "1px solid #475569", color: "#f1f5f9", borderRadius: 4, padding: "2px 6px", fontWeight: 700, textAlign: "center" }}
                    />
                    <input
                      value={g.remark}
                      onChange={e => setGradeScale(prev => prev.map((r, j) => j === i ? { ...r, remark: e.target.value } : r))}
                      style={{ flex: 1, background: "#0f172a", border: "1px solid #475569", color: "#94a3b8", borderRadius: 4, padding: "2px 6px", fontSize: 12 }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input
                      type="number" value={g.min}
                      onChange={e => setGradeScale(prev => prev.map((r, j) => j === i ? { ...r, min: Number(e.target.value) } : r))}
                      style={{ width: 48, background: "#0f172a", border: "1px solid #475569", color: "#f1f5f9", borderRadius: 4, padding: "2px 6px", fontSize: 12 }}
                    />
                    <span style={{ color: "#64748b" }}>–</span>
                    <input
                      type="number" value={g.max}
                      onChange={e => setGradeScale(prev => prev.map((r, j) => j === i ? { ...r, max: Number(e.target.value) } : r))}
                      style={{ width: 48, background: "#0f172a", border: "1px solid #475569", color: "#f1f5f9", borderRadius: 4, padding: "2px 6px", fontSize: 12 }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setGradeScale(prev => [...prev, { min: 0, max: 0, grade: "", remark: "" }])}
              style={{ marginTop: 8, background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}
            >
              + Add Grade Band
            </button>
          </div>
        </div>
      )}

      {/* ══ REPORT CARD ══ */}
      <div style={{
        maxWidth: 860, margin: "24px auto", background: "#fff",
        boxShadow: isPreview ? "none" : "0 4px 40px #0002", borderRadius: isPreview ? 0 : 12,
        overflow: "hidden", border: "2px solid #1e3a5f",
      }}>

        {/* ── SCHOOL HEADER ── */}
        <div style={{ background: "#1e3a5f", padding: "18px 24px", textAlign: "center" }}>
          {isPreview ? (
            <>
              <h1 style={{ color: "#fff", margin: 0, fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>{schoolName}</h1>
              <div style={{ color: "#93c5fd", fontSize: 13, marginTop: 4, fontWeight: 600 }}>{reportTitle}</div>
              <div style={{ color: "#dbeafe", fontSize: 14, marginTop: 2, fontWeight: 700, letterSpacing: 2 }}>{level}</div>
            </>
          ) : (
            <>
              <input value={schoolName} onChange={e => setSchoolName(e.target.value)}
                style={{ background: "transparent", border: "none", borderBottom: "1px solid #3b82f6", color: "#fff", fontSize: 20, fontWeight: 900, letterSpacing: 1, textAlign: "center", width: "100%", outline: "none" }} />
              <input value={reportTitle} onChange={e => setReportTitle(e.target.value)}
                style={{ background: "transparent", border: "none", borderBottom: "1px dashed #4b6cb7", color: "#93c5fd", fontSize: 13, fontWeight: 600, textAlign: "center", width: "100%", outline: "none", marginTop: 4, display: "block" }} />
              <input value={level} onChange={e => setLevel(e.target.value)}
                style={{ background: "transparent", border: "none", borderBottom: "1px dashed #4b6cb7", color: "#dbeafe", fontSize: 14, fontWeight: 700, letterSpacing: 2, textAlign: "center", width: "100%", outline: "none", marginTop: 2, display: "block" }} />
            </>
          )}
        </div>

        {/* ── STUDENT INFO ROW ── */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
            {(
              [
                ["NAME OF PUPIL",    studentName, setStudentName, "Student full name"] as const,
                ["CLASS",            className,   setClassName,   "e.g. JHS 2B"] as const,
                ["NO. ON ROLL",      rollNo,      setRollNo,      "Roll number"] as const,
                ["NEXT TERM BEGINS", nextTerm,    setNextTerm,    "Date"] as const,
                ["OVERALL POSITION", overallPos,  setOverallPos,  "e.g. 3rd"] as const,
              ] as [string, string, (v: string) => void, string][]
            ).map(([label, val, setter, ph]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", whiteSpace: "nowrap", minWidth: 120 }}>{label}:</span>
                {isPreview
                  ? <span style={{ 
                        fontSize: 13, borderBottom: "1px solid #64748b", flex: 1, 
                        display: "flex", alignItems: "flex-end", paddingBottom: "12px", minHeight: 24,
                        color: "#1e293b", fontWeight: 500
                    }}>{val}</span>
                  : <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                      style={{ flex: 1, border: "none", borderBottom: "1px solid #94a3b8", fontSize: 13, outline: "none", background: "transparent", padding: "2px 4px", color: "#1e293b" }} />
                }
              </div>
            ))}
          </div>

          {!isPreview && (isGroupMode || students.length > 0) && (
            <div style={{ marginTop: 12, position: "relative" }}>

              {/* ── Class Group Switch Bar (teacher mode only) ── */}
              {isGroupMode && studentGroups!.length > 1 && (
                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  {studentGroups!.map((grp, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveGroupIdx(idx);
                        setStudentSearch("");
                        setShowStudentResults(false);
                      }}
                      style={{
                        padding: "5px 16px", fontSize: 11, fontWeight: 700, borderRadius: 20,
                        border: idx === activeGroupIdx ? "2px solid #3b82f6" : "1.5px solid #cbd5e1",
                        background: idx === activeGroupIdx ? "#dbeafe" : "#f8fafc",
                        color: idx === activeGroupIdx ? "#1d4ed8" : "#64748b",
                        cursor: "pointer", transition: "all .2s",
                        boxShadow: idx === activeGroupIdx ? "0 2px 8px #3b82f620" : "none",
                      }}
                    >
                      {idx === activeGroupIdx ? "🔵 " : "⚪ "}{grp.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Student Count Banner (teacher mode only) ── */}
              {isGroupMode && (
                <div style={{
                  background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6,
                  padding: "6px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 13 }}>👥</span>
                  <span style={{ fontSize: 11, color: "#1e3a5f" }}>
                    <strong>{activeStudents.length}</strong> student{activeStudents.length !== 1 ? "s" : ""} in{" "}
                    <strong>{studentGroups![activeGroupIdx]?.className ?? ""}</strong>
                    &nbsp;·&nbsp; Type a <strong>name</strong>, <strong>student ID</strong>, or{" "}
                    <strong>serial&nbsp;# (1, 2, 3…)</strong> to find a student instantly
                  </span>
                </div>
              )}

              {/* ── Search Input Row ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", whiteSpace: "nowrap", minWidth: 120 }}>
                  LINK TO STUDENT:
                </span>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    value={studentSearch}
                    onChange={e => {
                      setStudentSearch(e.target.value);
                      setShowStudentResults(true);
                    }}
                    onFocus={() => setShowStudentResults(true)}
                    placeholder={
                      isGroupMode
                        ? "Type name, student ID, or serial # (1, 2, 3…)"
                        : "Search and select student to link records..."
                    }
                    style={{
                      width: "100%", border: "none", borderBottom: "1px solid #3b82f6",
                      fontSize: 13, outline: "none", background: "#eff6ff",
                      padding: "6px 10px", borderRadius: "4px 4px 0 0", color: "#1e293b",
                    }}
                  />

                  {/* ── Dropdown Results ── */}
                  {showStudentResults && studentSearch.length > 0 && (() => {
                    const q = studentSearch.trim().toLowerCase();
                    const isSerialQuery = isGroupMode && /^\d+$/.test(q);

                    const filtered = activeStudents.filter(s => {
                      if (isSerialQuery) {
                        return String(s.serialNo) === q;
                      }
                      return (
                        s.name.toLowerCase().includes(q) ||
                        s.studentId.toLowerCase().includes(q)
                      );
                    });

                    return filtered.length > 0 ? (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, right: 0,
                        background: "#fff", border: "1px solid #3b82f6", borderTop: "none",
                        maxHeight: 260, overflowY: "auto", zIndex: 100,
                        boxShadow: "0 4px 16px #0003", borderRadius: "0 0 6px 6px",
                      }}>
                        {filtered.map(s => (
                          <div
                            key={s.id}
                            onClick={async () => {
                              setSelectedStudentId(s.id);
                              setStudentName(s.name);
                              setClassName(s.className || "");
                              setStudentSearch(s.name);
                              setShowStudentResults(false);

                              const result = await getReportCardAutoFields(s.id);
                              if (result.success && result.data) {
                                setRollNo(result.data.rollNo);
                                setNextTerm(result.data.nextTerm);
                                setAttendance(result.data.attendance);
                                setPromotedTo(result.data.promotedTo);
                              }
                            }}
                            style={{
                              padding: "8px 12px", cursor: "pointer",
                              fontSize: 12, borderBottom: "1px solid #f1f5f9",
                              display: "flex", alignItems: "center", gap: 10,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#f0f9ff")}
                            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                          >
                            {/* Serial number badge — teacher mode only */}
                            {isGroupMode && s.serialNo != null && (
                              <span style={{
                                minWidth: 30, height: 30, borderRadius: "50%",
                                background: "#1e3a5f", color: "#fff",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800, flexShrink: 0,
                              }}>
                                {s.serialNo}
                              </span>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: "#1e293b" }}>
                                {s.name}
                              </div>
                              <div style={{ color: "#64748b", fontSize: 11 }}>
                                ID: {s.studentId} | Class: {s.className}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, right: 0,
                        background: "#fff", border: "1px solid #e2e8f0", borderTop: "none",
                        padding: "12px", fontSize: 12, color: "#94a3b8",
                        zIndex: 100, boxShadow: "0 4px 12px #0002",
                        borderRadius: "0 0 6px 6px",
                      }}>
                        No students found for &ldquo;{studentSearch}&rdquo;
                        {isGroupMode && /^\d+$/.test(studentSearch) && (
                          <span style={{ color: "#6b7280" }}>
                            {" "}— serial #{studentSearch} not in this class
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {selectedStudentId && (
                  <button
                    onClick={() => {
                      setSelectedStudentId(null);
                      setStudentSearch("");
                    }}
                    style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}
                  >
                    Disconnect
                  </button>
                )}
              </div>

              {selectedStudentId && (
                <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4, marginLeft: 126 }}>
                  ✓ Linked to database record: <strong>{studentName}</strong>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── SCORE TABLE ── */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#1e3a5f", color: "#fff" }}>
                {!isPreview && <th style={{ width: 30, padding: "6px 4px" }}></th>}
                {!isPreview && <th style={{ width: 24 }}></th>}

              <th style={{ padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, minWidth: 160 }}>SUBJECT</th>

                {scoreCols.map(col => (
                  <th key={col.id} style={{ padding: "12px 8px", textAlign: "center", fontWeight: 700, fontSize: 11, minWidth: 80, verticalAlign: "middle" }}>
                    {isPreview ? (
                      <div>{col.label}<br /><span style={{ fontSize: 10, color: "#93c5fd" }}>({col.weight}%)</span></div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <input value={col.label} onChange={e => updateScoreCol(col.id, "label", e.target.value)}
                          style={{ background: "transparent", border: "none", borderBottom: "1px solid #4b6cb7", color: "#fff", fontSize: 11, fontWeight: 700, textAlign: "center", width: "100%", outline: "none" }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "#93c5fd" }}>
                          <input type="number" value={col.weight} onChange={e => updateScoreCol(col.id, "weight", Number(e.target.value))}
                            style={{ width: 36, background: "transparent", border: "none", borderBottom: "1px dashed #4b6cb7", color: "#93c5fd", fontSize: 10, textAlign: "center", outline: "none" }} />
                          <span>%</span>
                          {scoreCols.length > 1 && (
                            <button onClick={() => removeScoreCol(col.id)}
                              style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 11, padding: 0, marginLeft: 2 }}>✕</button>
                          )}
                        </div>
                      </div>
                    )}
                  </th>
                ))}

                <th style={{ padding: "14px", textAlign: "center", fontSize: 11, fontWeight: 700, minWidth: 70, background: "#15294d" }}>
                  TOTAL<br /><span style={{ fontSize: 10, color: "#93c5fd" }}>(100%)</span>
                </th>
                <th style={{ padding: "14px", textAlign: "center", fontSize: 11, fontWeight: 700, minWidth: 50, background: "#15294d" }}>POS.</th>
                <th style={{ padding: "14px", textAlign: "center", fontSize: 11, fontWeight: 700, minWidth: 50, background: "#15294d" }}>GRADE</th>
                <th style={{ padding: "14px", textAlign: "center", fontSize: 11, fontWeight: 700, minWidth: 120, background: "#15294d" }}>REMARKS</th>
              </tr>
            </thead>

            <tbody>
              {computedRows.map((row, ri) => {
                const isSelected = selectedRows.has(row.id);
                return (
                  <tr key={row.id} style={{
                    background: isSelected ? "#eff6ff" : ri % 2 === 0 ? "#fff" : "#f8fafc",
                    borderBottom: "1px solid #e2e8f0", transition: "background .15s",
                  }}>
                    {!isPreview && (
                      <td style={{ padding: "0 2px", textAlign: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <button onClick={() => moveRow(row.id, -1)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 10, padding: 0, lineHeight: 1 }}>▲</button>
                          <button onClick={() => moveRow(row.id, 1)}  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 10, padding: 0, lineHeight: 1 }}>▼</button>
                        </div>
                      </td>
                    )}

                    {!isPreview && (
                      <td style={{ textAlign: "center", padding: "0 4px" }}>
                        <input type="checkbox" checked={isSelected}
                          onChange={e => setSelectedRows(prev => {
                            const s = new Set(prev);
                            e.target.checked ? s.add(row.id) : s.delete(row.id);
                            return s;
                          })}
                        />
                      </td>
                    )}

                    {/* Subject name cell — show 🔒 + owner tooltip when locked by another teacher */}
                    {(() => {
                      const owner = subjectOwner(row.subject);
                      return owner ? (
                        <td style={{ padding: "2px 8px", whiteSpace: "nowrap", fontWeight: 700, fontSize: 13, textAlign: "left" }}
                          title={`Saved by ${owner} — read only`}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span>{row.subject || <em style={{ color: "#94a3b8" }}>Subject name…</em>}</span>
                            <span style={{ fontSize: 10, color: "#64748b", background: "#f1f5f9", borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>
                              🔒 {owner}
                            </span>
                          </span>
                        </td>
                      ) : (
                        <Cell value={row.subject} onChange={v => updateRow(row.id, "subject", v)}
                          align="left" bold placeholder="Subject name…" readOnly={isPreview} />
                      );
                    })()}

                    {scoreCols.map(col => {
                      const locked = isSubjectLocked(row.subject);
                      return (
                        <Cell key={col.id} value={(row as Record<string, string>)[col.id] ?? ""}
                          onChange={v => updateRow(row.id, col.id, v)}
                          placeholder={locked ? "—" : "–"}
                          readOnly={isPreview || locked}
                          minW={70} />
                      );
                    })}

                    <Cell value={row.total} onChange={() => {}} readOnly
                      bold highlight="#1e3a5f" minW={70} fontSize={13} />

                    <Cell value={row.position} onChange={v => updateRow(row.id, "position", v)}
                      readOnly={isPreview} minW={50} />

                    <Cell value={row.grade} onChange={() => {}} readOnly
                      bold highlight={GRADE_COLORS[row.grade] || ""} minW={50} />

                    <Cell value={row.remarks} onChange={() => {}} readOnly italic minW={120} fontSize={12} />
                  </tr>
                );
              })}

              {!isPreview && (
                <tr>
                  <td colSpan={99} style={{ padding: "6px 12px" }}>
                    <button onClick={addRow}
                      style={{ background: "none", border: "1px dashed #94a3b8", color: "#64748b", borderRadius: 6, padding: "4px 14px", fontSize: 12, cursor: "pointer", width: "100%" }}>
                      ➕ Add Subject Row
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── FOOTER FIELDS ── */}
        <div style={{ padding: "14px 20px", borderTop: "2px solid #1e3a5f" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 24px", marginBottom: 10, alignItems: "center" }}>
            {(
              [
                ["ATTENDANCE",  attendance,  setAttendance,  "Days present"] as const,
                ["OUT OF",      attendOut,   setAttendOut,   "Total school days"] as const,
                ["PROMOTED TO", promotedTo,  setPromotedTo,  "Next class"] as const,
              ] as [string, string, (v: string) => void, string][]
            ).map(([label, val, setter, ph]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{label}:</span>
                {isPreview
                  ? <span style={{ 
                        fontSize: 13, borderBottom: "1px solid #64748b", minWidth: 80, 
                        display: "flex", alignItems: "flex-end", paddingBottom: "5px", minHeight: 24,
                        color: "#1e293b", fontWeight: 500
                    }}>{val}</span>
                  : <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                      style={{ border: "none", borderBottom: "1px solid #94a3b8", fontSize: 13, outline: "none", background: "transparent", padding: "2px 4px", width: 120, color: "#1e293b" }} />
                }
              </div>
            ))}
          </div>

          {/* ── DROPDOWN FIELDS ── */}
          <DropdownField label="CONDUCT"                 value={conduct}      onChange={setConduct}      options={CONDUCT_OPTIONS}       isPreview={isPreview} />
          <DropdownField label="INTEREST"                value={interest}     onChange={setInterest}     options={INTEREST_OPTIONS}      isPreview={isPreview} />
          <DropdownField label="CLASS TEACHER'S REMARKS" value={classRemark}  onChange={setClassRemark}  options={CLASS_REMARK_OPTIONS}  isPreview={isPreview} />
          <DropdownField label="HEAD TEACHER'S REMARKS"  value={headRemark}   onChange={setHeadRemark}   options={HEAD_REMARK_OPTIONS}   isPreview={isPreview} />
        </div>

        {/* ── GRADE INTERPRETATION TABLE ── */}
        <div style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
          <p style={{ fontWeight: 700, fontSize: 11, textAlign: "center", color: "#1e3a5f", marginBottom: 8, textDecoration: "underline", letterSpacing: 1 }}>
            INTERPRETATION OF MARKS
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 4 }}>
            {gradeScale.map((g, i) => (
              <div key={i} style={{ fontSize: 11, color: "#374151" }}>
                <span style={{ fontWeight: 700, color: GRADE_COLORS[g.grade] || "#374151" }}>({g.grade})</span>
                {" "}{g.min}–{g.max} — {g.remark}
              </div>
            ))}
          </div>
        </div>

        {/* ── HEAD TEACHER STAMP LINE ── */}
        <div style={{ paddingRight:"30px", textAlign: "right",  }}>
          <div style={{ display: "inline-block", paddingTop: 4, minWidth: 200, }}>
            {stampSrc && (
              <img
                src={stampSrc}
                alt="School stamp"
                className="rc-archive-stamp"
                style={{ width: 120, height: 120, objectFit: "contain" }}
              />
            )}
          </div>
        </div>

        <div style={{ paddingRight:"30px",paddingBottom:"20px", textAlign: "right", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ display: "inline-block", borderTop: "2px solid #1e3a5f", paddingTop: 4, minWidth: 200, textAlign: "center", fontSize: 11, fontWeight: 700, color: "#1e3a5f", letterSpacing: 1 }}>
            HEAD TEACHER'S SIGNATURE & STAMP
          </div>
        </div>
      </div>

      {/* ══ BOTTOM TOOLBAR ══ */}
      {!isPreview && (
        <div style={{ maxWidth: 860, margin: "0 auto 32px", display: "flex", justifyContent: "space-between", gap: 8, paddingRight: 4, paddingLeft: 4 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={saveCard}
              style={{
                background: saveSuccess ? "#16a34a" : "#0369a1",
                color: "#fff", border: "none", borderRadius: 8,
                padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              {saveSuccess ? "✅ Saved!" : "💾 Save Report Card"}
            </button>
            {savedCards.length > 0 && (
              <button
                onClick={printAllCards}
                style={{
                  background: "#15803d", color: "#fff",
                  border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13,
                  fontWeight: 700, cursor: "pointer",
                }}
              >
                📄 Save All as PDF ({savedCards.length})
              </button>
            )}
          </div>
          <button onClick={() => setMode("preview")}
            style={{ background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            👁 Preview Mode
          </button>
        </div>
      )}

      {/* ══ EXIT PREVIEW ══ */}
      {isPreview && (
        <div style={{ position: "fixed", bottom: 20, right: 20, display: "flex", gap: 8, zIndex: 100 }}>
          <button onClick={() => setMode("edit")}
            style={{ background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px #0004" }}>
            ✏️ Back to Edit
          </button>
          <button onClick={() => window.print()}
            style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px #0004" }}>
            🖨 Print
          </button>
        </div>
      )}

      {/* ══ PRINT STYLES ══ */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          /* Force browsers to print background colors and images */
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Full-page flow */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          /* Hide everything on the page */
          body * { visibility: hidden !important; }
          /* Show only the report card root and its children */
          #rc-print-root,
          #rc-print-root * { visibility: visible !important; }
          /* Position the report card as absolute so it flows across pages */
          #rc-print-root {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            height: auto !important;
            z-index: 99999 !important;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          /* Hide UI controls */
          button,
          select,
          input[type="checkbox"] { display: none !important; visibility: hidden !important; }
          /* Each saved card exactly fills one A4 page */
          .rc-card-break {
            width: 210mm !important;
            height: 297mm !important;
            max-width: none !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          table { page-break-inside: avoid; }
        }
      `}</style>

      {/* ══ OFF-SCREEN RENDERER FOR ARCHIVING ══ */}
      {isArchivingView && (
        <div style={{
          position: "absolute", left: -9999, top: 0,
          // 794px ≈ 210mm at 96dpi — match exact A4 width for correct proportions
          width: 794, background: "#fff", color: "#1e293b", zIndex: -1000
        }}>
          {savedCards.map((card, i) => (
            <div id={`archive-card-${i}`} key={card.id}>
              <ReportCardView card={card} gradeScale={card.gradeScale} stampSrc={stampSrc} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
