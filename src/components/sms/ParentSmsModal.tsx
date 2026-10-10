"use client";

import { useTransition, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { sendSmsToSelectedParents } from "@/lib/smsActions";

type ArrearRow = {
  studentId: string;
  name: string;
  level: number;
  term: string;
  academicYear: string;
  totalFees: number;
  totalPaid: number;
  balance: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedStudents: ArrearRow[];
};

export function ParentSmsModal({ isOpen, onClose, selectedStudents }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!useTemplate && !message.trim()) {
      alert("Please enter a message");
      return;
    }

    startTransition(async () => {
      try {
        const studentIds = selectedStudents.map((s) => s.studentId);
        const result = await sendSmsToSelectedParents({
          studentIds,
          customMessage: useTemplate ? undefined : message,
          useTemplate,
        });

        if (result.success) {
          onClose();
          window.dispatchEvent(new CustomEvent("sms-sent"));
          alert(`Successfully sent SMS to ${result.count} parent(s).`);
          setMessage("");
          setUseTemplate(true);
        } else {
          alert(result.error || "Failed to send SMS");
        }
      } catch (error) {
        alert("An error occurred while sending SMS");
        console.error(error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 overflow-hidden border-none rounded-lg shadow-2xl">
        <DialogHeader className="bg-blue-500 p-4 sm:p-6 text-white rounded-t-lg">
          <DialogTitle className="text-lg font-bold tracking-wide uppercase">
            Send SMS to Selected Parents
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-8 bg-white rounded-b-lg max-h-96 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selected Students */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Selected Students ({selectedStudents.length})
              </label>
              <div className="border rounded p-3 bg-gray-50 max-h-40 overflow-y-auto">
                <ul className="space-y-1 text-sm">
                  {selectedStudents.map((student) => (
                    <li key={student.studentId} className="text-gray-700">
                      • {student.name} (ID: {student.studentId})
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Template Toggle */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useTemplate}
                  onChange={(e) => setUseTemplate(e.target.checked)}
                  className="cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Use Default Template (Personalized message per student)
                </span>
              </label>
              <p className="text-xs text-gray-500">
                If unchecked, use your custom message below for all parents
              </p>
            </div>

            {/* Custom Message */}
            {!useTemplate && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Custom Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message here..."
                  rows={4}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                />
                <p className="text-xs text-gray-500">
                  {message.length} characters
                </p>
              </div>
            )}

            {/* Preview */}
            {useTemplate && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Message Template Preview
                </label>
                <div className="border rounded p-3 bg-blue-50 text-sm text-gray-700">
                  <p>
                    A personalized SMS will be sent to each parent with their ward&apos;s name and outstanding balance information.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="destructive"
                onClick={onClose}
                disabled={isPending}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 font-semibold py-6 rounded-md transition-all active:scale-95"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || selectedStudents.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 font-semibold py-6 rounded-md shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                {isPending ? "Sending..." : `Send to ${selectedStudents.length} Parent(s)`}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
