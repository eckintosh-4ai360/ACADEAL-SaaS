"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Send, Users } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function BulkSmsModal({ isOpen, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category) {
      alert("Please select a category");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "BULK",
            category,
            message,
          }),
        });

        const result = await response.json();
        if (result.success) {
          setCategory("");
          setMessage("");
          onClose();
          //* Trigger a refresh of the logs table if needed
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
          <DialogTitle className="text-lg font-bold text-blue-900 flex items-center uppercase">
            Bulk Message to Parents
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Category<span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">Select....</option>
              <option value="ALL_PARENTS">All Parents</option>
              <option value="CLASS_A">Class A</option>
              <option value="CLASS_B">Class B</option>
            </select>
          </div>

          <div className="space-y-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder=""
              rows={6}
              className="w-full px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
