"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

type SmsLog = {
  id: number;
  sender: string;
  recipient: string;
  message: string;
  sentAt: string | Date;
};

type Props = {
  log: SmsLog | null;
  isOpen: boolean;
  onClose: () => void;
};

export function EditSmsModal({ log, isOpen, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [recipient, setRecipient] = useState(log?.recipient ?? "");
  const [message, setMessage] = useState(log?.message ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipient.trim()) {
      alert("Please enter at least one recipient");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "CUSTOM",
            recipients: recipient
              .split(",")
              .map((r) => r.trim())
              .filter((r) => r !== ""),
            message,
          }),
        });

        const result = await response.json();
        if (result.success) {
          onClose();
          window.dispatchEvent(new CustomEvent("sms-sent"));
        } else {
          alert(result.error || "Failed to resend SMS");
        }
      } catch {
        alert("An error occurred while resending the SMS");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-lg font-bold text-gray-800">
            <Send className="h-4 w-4 text-sky-500" />
            Edit &amp; Resend SMS
            <span className="text-sm font-normal normal-case text-gray-500">
              — Log #{log?.id}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Recipient(s)
              <span className="ml-1 font-normal text-gray-400">
                (separate with comma)
              </span>
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. 0200000000,0200000001"
              className="w-full rounded-md border border-blue-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-md border border-blue-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-right text-xs text-gray-400">
              {message.length} chars
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="destructive"
              onClick={onClose}
              disabled={isPending}
              className="bg-red-500 px-6 hover:bg-red-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-sky-600 px-8 text-white hover:bg-sky-700"
            >
              {isPending ? "Sending…" : "Resend"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
