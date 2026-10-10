"use client";

import React from "react";


export type GradeBand = { min: number; max: number; grade: string; remark: string };
export type ScoreCol = { id: string; label: string; weight: number; editable: boolean };
export type Row = {
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

export type SavedCard = {
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
  academicYear?: string;
  rows: Row[];
  scoreCols: ScoreCol[];
  gradeScale: GradeBand[];
};

export const GRADE_COLORS: Record<string, string> = {
  A: "#16a34a", B: "#2563eb", C: "#0891b2",
  D: "#d97706", E: "#ea580c", F: "#dc2626", G: "#dc2626",
};

export function getGrade(total: string, scale: GradeBand[]): { grade: string; remark: string } {
  if (total === "" || total === null || isNaN(Number(total))) return { grade: "", remark: "" };
  const n = Number(total);
  const found = scale.find(s => n >= s.min && n <= s.max);
  return found ? { grade: found.grade, remark: found.remark } : { grade: "F", remark: "Fail" };
}

export default function ReportCardView({ card, gradeScale, stampSrc }: { card: SavedCard; gradeScale: GradeBand[]; stampSrc?: string | null }) {
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
        width: "210mm",
        height: "297mm",
        maxWidth: "210mm",
        margin: "0 auto",
        background: "#fff",
        color: "#1e293b",
        border: "2px solid #1e3a5f",
        fontFamily: "var(--font-sora), 'Sora', 'Segoe UI', system-ui, sans-serif",
        pageBreakAfter: "always",
        breakAfter: "page",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ background: "#1e3a5f", padding: "12px 24px", textAlign: "center" }}>
        
        <h1 style={{ color: "#fff", margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>{card.schoolName}</h1>
        <div style={{ color: "#93c5fd", fontSize: 12, marginTop: 2, fontWeight: 600 }}>{card.reportTitle}</div>
        <div style={{ color: "#dbeafe", fontSize: 13, marginTop: 2, fontWeight: 700, letterSpacing: 1.5 }}>{card.level}</div>
      </div>

      {/* Student Info */}
      <div style={{ padding: "8px 20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px" }}>
          {([
            ["NAME OF PUPIL", card.studentName],
            ["CLASS", card.className],
            ["NO. ON ROLL", card.rollNo],
            ["NEXT TERM BEGINS", card.nextTerm],
            ["OVERALL POSITION", card.overallPos],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", whiteSpace: "nowrap", minWidth: 110 }}>{label}:</span>
              <span style={{ 
                fontSize: 12, borderBottom: "1px solid #64748b", flex: 1, 
                display: "flex", alignItems: "flex-end", paddingBottom: "4px", minHeight: 18,
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
                <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: 12, color: "#1e293b" }}>{row.subject}</td>
                {card.scoreCols.map(col => (
                  <td key={col.id} style={{ padding: "8px", textAlign: "center", fontSize: 12 }}>
                    {(row as Record<string, string>)[col.id] ?? ""}
                  </td>
                ))}
                <td style={{ padding: "8px", textAlign: "center", fontWeight: 700, fontSize: 12, color: "#1e3a5f" }}>{row.total}</td>
                <td style={{ padding: "8px", textAlign: "center", fontSize: 12 }}>{row.position}</td>
                <td style={{ padding: "8px", textAlign: "center", fontWeight: 700, fontSize: 12, color: GRADE_COLORS[row.grade] || "#1e293b" }}>{row.grade}</td>
                <td style={{ padding: "8px", textAlign: "center", fontStyle: "italic", fontSize: 11 }}>{row.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 20px", borderTop: "2px solid #1e3a5f" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 24px", marginBottom: 6, alignItems: "center" }}>
          {([
            ["ATTENDANCE", card.attendance],
            ["OUT OF", card.attendOut],
            ["PROMOTED TO", card.promotedTo],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>{label}:</span>
              <span style={{ 
                fontSize: 12, borderBottom: "1px solid #64748b", minWidth: 60, 
                display: "flex", alignItems: "flex-end", paddingBottom: "4px", minHeight: 18,
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
          <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", minWidth: 160, paddingTop: 2 }}>{label}:</span>
            <div style={{ 
              flex: 1, borderBottom: "1px solid #94a3b8", minHeight: 20, fontSize: 12,
              display: "flex", alignItems: "flex-end", paddingBottom: "4px", color: "#1e293b" 
            }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "8px 20px", background: "#f8fafc", marginBottom: "10px", borderTop: "1px solid #e2e8f0" }}>
        <p style={{ fontWeight: 700, fontSize: 10, textAlign: "center", color: "#1e3a5f", marginBottom: 4, textDecoration: "underline", letterSpacing: 1 }}>
          INTERPRETATION OF MARKS
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 2 }}>
          {card.gradeScale.map((g, i) => (
            <div key={i} style={{ fontSize: 10, color: "#374151" }}>
              <span style={{ fontWeight: 700, color: GRADE_COLORS[g.grade] || "#374151" }}>({g.grade})</span>
              {" "}{g.min}–{g.max} — {g.remark}
            </div>
          ))}
        </div>
      </div>

      {/* Head Teacher Signature & Stamp */}
      <div style={{ paddingTop: "20px", paddingRight: "30px", paddingBottom: "10px", textAlign: "right", borderTop: "1px solid #e2e8f0" }}>
        <div
          style={{
            position: "relative",
            display: "inline-block",
            minWidth: 200,
            minHeight: 120,
            overflow: "visible",
            textAlign: "center",
            fontSize: 10,
            fontWeight: 700,
            color: "#1e3a5f",
            letterSpacing: 1,
            paddingTop: 50,
          }}
        >
          <div style={{ borderTop: "2px solid #1e3a5f", paddingTop: 4 }}>
            HEAD TEACHER'S SIGNATURE & STAMP
          </div>
          {stampSrc && (
            <img
              src={stampSrc}
              alt="School stamp"
              className="rc-archive-stamp"
              style={{
                position: "absolute",
                top: -50,
                left: "50%",
                transform: "translateX(-50%)",
                width: 120,
                height: 120,
                objectFit: "contain",
                zIndex: 2,
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      </div>

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
          html, body { margin: 0 !important; padding: 0 !important; }
          .rc-card-break {
            width: 210mm !important;
            height: 297mm !important;
            max-width: none !important;
            margin: 0 !important;
            border: none !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>
    </div>
  );
}
