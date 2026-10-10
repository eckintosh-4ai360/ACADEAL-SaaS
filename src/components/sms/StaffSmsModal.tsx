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

export function StaffSmsModal({ isOpen, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      try {
        const response = await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "STAFF",
            message,
          }),
        });

        const result = await response.json();
        if (result.success) {
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
        <DialogHeader className="border-b pb-4 text-center sm:text-left">
          <DialogTitle className="text-lg font-bold text-red-800 flex items-center uppercase justify-center sm:justify-start">
            Message to Only Staff Members
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder=""
              rows={6}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
