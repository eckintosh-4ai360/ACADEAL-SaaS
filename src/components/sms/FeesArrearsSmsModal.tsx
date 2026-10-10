"use client";

import { useTransition } from "react";
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

export function FeesArrearsSmsModal({ isOpen, onClose }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      try {
        const response = await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "FEES_ARREARS",
            // The message is now auto-generated in the backend per student
          }),
        });

        const result = await response.json();
        if (result.success) {
          onClose();
          window.dispatchEvent(new CustomEvent("sms-sent"));
          alert(`Successfully sent ${result.count} personalized SMS alerts.`);
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
      <DialogContent className="max-w-[95vw] sm:max-w-md p-0 overflow-hidden border-none rounded-lg shadow-2xl">
        <DialogHeader className="bg-red-500 p-4 sm:p-6 text-white rounded-t-lg">
          <DialogTitle className="text-lg font-bold tracking-wide uppercase">
            Send Fees Arrears Alerts
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 sm:p-8 bg-white rounded-b-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-center text-gray-700">
              <p>
                This will automatically compute each student's current outstanding fees and send a personalized SMS to their parents.
              </p>
              <p className="font-semibold mt-4">
                Are you sure you want to proceed?
              </p>
            </div>

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
                disabled={isPending}
                className="bg-red-600 hover:bg-red-700 text-white px-8 font-semibold py-6 rounded-md shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                {isPending ? "Sending..." : "Send Alerts"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
