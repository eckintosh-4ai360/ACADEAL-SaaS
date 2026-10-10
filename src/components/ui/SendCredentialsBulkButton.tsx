"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface SendCredentialsResult {
  success: boolean;
  totalParents?: number;
  smsSent?: number;
  emailSent?: number;
  smsSkipped?: number;
  emailSkipped?: number;
  errors?: string[];
  error?: string;
}

export function SendCredentialsBulkButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<SendCredentialsResult | null>(null);

  const handleSend = async () => {
    if (status === "loading") return;

    const confirmed = window.confirm(
      "This will send credential reminder SMS and emails to all parents.\n\n" +
      "Note: Passwords are NOT included in reminders — only IDs and login link.\n\n" +
      "Proceed?"
    );
    if (!confirmed) return;

    setStatus("loading");
    setResult(null);

    try {
      const res = await fetch("/api/credentials/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "all" }),
      });

      const data = (await res.json()) as SendCredentialsResult;
      setResult(data);
      setStatus(data.success ? "success" : "error");

      //* Auto-reset after 8s
      setTimeout(() => {
        setStatus("idle");
        setResult(null);
      }, 8000);
    } catch {
      setResult({ success: false, error: "Network error. Please try again." });
      setStatus("error");
      setTimeout(() => {
        setStatus("idle");
        setResult(null);
      }, 5000);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSend}
        disabled={status === "loading"}
        className="flex items-center gap-2 border-indigo-200 text-indigo-700  hover:border-indigo-400 transition-colors"
        id="send-credentials-bulk-btn"
      >
        {status === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : status === "success" ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : status === "error" ? (
          <AlertCircle className="w-4 h-4 text-red-500" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {status === "loading"
          ? "Sending..."
          : status === "success"
          ? "Sent!"
          : status === "error"
          ? "Failed"
          : "Send Credentials"}
      </Button>

      {result && status === "success" && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 max-w-xs text-right">
          ✓ {result.totalParents} parents — SMS: {result.smsSent} sent, Email: {result.emailSent} sent
        </p>
      )}
      {result && status === "error" && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 max-w-xs text-right">
          ✗ {result.error || `${result.errors?.[0] || "Unknown error"}`}
        </p>
      )}
    </div>
  );
}
