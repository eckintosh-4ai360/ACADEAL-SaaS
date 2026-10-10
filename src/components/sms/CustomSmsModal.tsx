"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function CustomSmsModal({ isOpen, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipients.trim()) {
      alert("Please enter at least one contact");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "CUSTOM",
            recipients: recipients.split(",").map(r => r.trim()).filter(r => r !== ""),
            message,
          }),
        });

        const result = await response.json();
        if (result.success) {
          setRecipients("");
          setMessage("");
          onClose();
          window.dispatchEvent(new CustomEvent("sms-sent"));
        } else {
          alert(result.error || "Failed to send SMS");
        }
      } catch (error) {
        alert("An error occurred while sending SMS");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-lg font-bold text-gray-800 flex flex-wrap items-center">
            Custom SMS <span className="text-sm font-normal normal-case ml-1 text-gray-600">(Seperate contact with comma)</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Send to:
            </label>
            <input
              type="text"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="e.g. 0200000000,0200000001"
              className="w-full px-3 py-2 border border-blue-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 "
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
              placeholder=""
              rows={4}
              className="w-full px-3 py-2 border border-blue-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={onClose}
              disabled={isPending}
              className="bg-red-500 hover:bg-red-600 px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              {isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
