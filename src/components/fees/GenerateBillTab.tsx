"use client";

import { useState, useTransition } from "react";
import { FileDown, MessageSquare, Loader2, X } from "lucide-react";
import { StudentBillsPanel, type StudentBillsPanelData } from "@/components/fees/StudentBillsPanel";

const GRADE_NAMES: Record<number, string> = {
  1: "CRECHE", 2: "NURSERY 1", 3: "NURSERY 2", 4: "KG 1", 5: "KG 2",
  6: "BASIC 1", 7: "BASIC 2", 8: "BASIC 3", 9: "BASIC 4", 10: "BASIC 5",
  11: "BASIC 6", 12: "JHS 1", 13: "JHS 2", 14: "JHS 3",
};

interface Grade { id: number; level: number }
interface GenerateBillTabProps {
  grades: Grade[];
  currentTerm: string;
  academicYear: string;
  studentBills: StudentBillsPanelData;
}

export function GenerateBillTab({ grades, currentTerm, academicYear, studentBills }: GenerateBillTabProps) {
  const [pdfModal, setPdfModal] = useState(false);
  const [smsModal, setSmsModal] = useState(false);
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [smsGradeId, setSmsGradeId] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleGeneratePdf = () => {
    if (!selectedGradeId) { setMessage({ type: "error", text: "Please select a level." }); return; }
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/fees/bill-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId: parseInt(selectedGradeId), term: currentTerm, academicYear }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fee-bill-${GRADE_NAMES[grades.find(g => g.id === parseInt(selectedGradeId))?.level ?? 0] ?? "level"}-${currentTerm}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage({ type: "success", text: "PDF generated successfully." });
        setPdfModal(false);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Failed to generate PDF." });
      }
    });
  };

  const handleSendSms = () => {
    if (!smsGradeId || !smsMessage.trim()) { setMessage({ type: "error", text: "Select a level and enter a message." }); return; }
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "FEES_BILL", gradeId: parseInt(smsGradeId), message: smsMessage }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ type: "success", text: "SMS sent successfully to parents." });
        setSmsModal(false);
        setSmsMessage("");
      } else {
        setMessage({ type: "error", text: result.error || "Failed to send SMS." });
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Generate Bills</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPdfModal(true); setMessage(null); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-yellow-500 hover:bg-yellow-600 rounded"
          >
            <FileDown className="w-3.5 h-3.5" />
            Generate Bill PDF
          </button>
          <button
            onClick={() => { setSmsModal(true); setMessage(null); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-olive-600 bg-[#6b7c3a] hover:bg-[#5a6930] rounded"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Send Bill via SMS
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Keyed by template so switching resets the resumption date and notes. */}
      <StudentBillsPanel key={studentBills.selectedTemplateId ?? "none"} {...studentBills} />

      {/* PDF Modal */}
      {pdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-card rounded-lg shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 bg-yellow-400 rounded-t-lg">
              <h3 className="font-bold text-gray-900">Generate Bill PDF</h3>
              <button onClick={() => setPdfModal(false)} className="text-gray-700 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Level/Class</label>
                <select
                  value={selectedGradeId}
                  onChange={e => setSelectedGradeId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Level</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{GRADE_NAMES[g.level]}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleGeneratePdf}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-semibold text-white bg-yellow-500 hover:bg-yellow-600 rounded flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {smsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-card rounded-lg shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 bg-red-500 rounded-t-lg">
              <h3 className="font-bold text-white">Send Bill via SMS</h3>
              <button onClick={() => setSmsModal(false)} className="text-white hover:text-red-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Level</label>
                <select
                  value={smsGradeId}
                  onChange={e => setSmsGradeId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Select Level</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{GRADE_NAMES[g.level]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">SMS Message</label>
                <textarea
                  value={smsMessage}
                  onChange={e => setSmsMessage(e.target.value)}
                  rows={5}
                  placeholder="Enter the fee bill message to send to parents..."
                  className="w-full border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSmsModal(false)} className="px-4 py-2 text-sm border rounded hover:bg-muted">Cancel</button>
                <button
                  onClick={handleSendSms}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded flex items-center gap-2 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  Send SMS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
