"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import { updateSystemSettings } from "@/lib/actions";
import { ExternalLink, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface EmailSmsSettings {
  id: number;
  emailHost?: string | null;
  emailPort?: number | null;
  emailUser?: string | null;
  smsProvider?: string | null;
  smsApiKey?: string | null;
  smsSenderId?: string | null;
  whatsappPhoneNumberId?: string | null;
  whatsappReceiptTemplateName?: string | null;
  whatsappReceiptTemplateLanguage?: string | null;
  publicAppUrl?: string | null;
}

interface EmailSmsSettingsTabProps {
  settings: EmailSmsSettings;
}

export function EmailSmsSettingsTab({ settings }: EmailSmsSettingsTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<"mnotify" | "arkesel">(
    settings.smsProvider === "arkesel" ? "arkesel" : "mnotify"
  );

  // Test SMS state
  const [testPhone, setTestPhone] = useState("");
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    details?: any;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateSystemSettings(formData);
      if (result.success) {
        setMessage(result.message || "Settings updated successfully!");
        toast.success("Settings updated!");
        window.dispatchEvent(new CustomEvent("settings-updated"));
        router.refresh();
      } else {
        setMessage(result.message || "Failed to update settings");
        toast.error(result.message || "Failed to update settings");
      }
    });
  };

  const handleTestSms = async () => {
    if (!testPhone.trim()) {
      toast.warning("Please enter a phone number to test");
      return;
    }

    setIsTestingSms(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone.trim(),
          message: `Test message from ${selectedProvider === "arkesel" ? "Arkesel" : "mNotify"} gateway. Your SMS setup is working!`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: `Test SMS sent successfully via ${data.provider || selectedProvider}!`,
          details: data,
        });
        toast.success("Test SMS sent successfully!");
      } else {
        setTestResult({
          success: false,
          message: data.error || "Failed to send test SMS. Please check your credentials.",
          details: data,
        });
        toast.error(data.error || "Failed to send test SMS");
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "An unexpected network error occurred while testing SMS.",
      });
      toast.error("Network error sending test SMS");
    } finally {
      setIsTestingSms(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <input type="hidden" name="id" value={settings.id} />

      {/* ! Email Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 text-blue-900 dark:text-blue-100">Email Configuration</h3>
        <p className="text-sm text-gray-600">Configure SMTP settings for sending emails</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emailHost">SMTP Host</Label>
            <Input
              id="emailHost"
              name="emailHost"
              defaultValue={settings.emailHost || ""}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailPort">SMTP Port</Label>
            <Input
              id="emailPort"
              name="emailPort"
              type="number"
              defaultValue={settings.emailPort || ""}
              placeholder="587"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailUser">Email Username</Label>
            <Input
              id="emailUser"
              name="emailUser"
              type="email"
              defaultValue={settings.emailUser || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailPassword">Email Password</Label>
            <Input
              id="emailPassword"
              name="emailPassword"
              type="password"
              placeholder="Leave empty to keep current"
            />
          </div>
        </div>
      </div>

      {/* ! SMS Configuration */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">SMS Gateway Configuration</h3>
            <p className="text-sm text-gray-600">
              Configure credentials to send text messages via <strong>mNotify</strong> or <strong>Arkesel</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
              Active: {selectedProvider === "arkesel" ? "Arkesel" : "mNotify"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SMS Provider Selector */}
          <div className="space-y-2">
            <Label htmlFor="smsProvider" className="font-medium text-gray-800 dark:text-gray-200">
              SMS Provider
            </Label>
            <select
              id="smsProvider"
              name="smsProvider"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as "mnotify" | "arkesel")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="mnotify">mNotify (api.mnotify.com)</option>
              <option value="arkesel">Arkesel (sms.arkesel.com)</option>
            </select>
            <p className="text-xs text-gray-500">
              Select the active provider to deliver student, parent, attendance, and fee alert messages.
            </p>
            <p className="text-xs text-amber-700">
              If <code>SMS_PROVIDER</code> is configured in the deployment environment, it takes precedence over this database setting.
            </p>
          </div>

          {/* Sender ID */}
          <div className="space-y-2">
            <Label htmlFor="smsSenderId">
              {selectedProvider === "arkesel" ? "Arkesel Approved Sender ID" : "mNotify Approved Sender ID"}
            </Label>
            <Input
              id="smsSenderId"
              name="smsSenderId"
              defaultValue={settings.smsSenderId || ""}
              placeholder={
                selectedProvider === "arkesel"
                  ? "e.g. YOURSCHOOL (max 11 chars)"
                  : "Use your approved mNotify sender ID"
              }
            />
            <p className="text-xs text-gray-500">
              {selectedProvider === "arkesel" ? (
                <>
                  Must match a registered sender ID in your{" "}
                  <a
                    href="https://sms.arkesel.com/user/sms/quick-sms"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline inline-flex items-center gap-0.5"
                  >
                    Arkesel Quick SMS portal <ExternalLink className="w-3 h-3" />
                  </a>
                  .
                </>
              ) : (
                "This must match a sender ID already registered and approved in your mNotify account."
              )}
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="smsApiKey">
              {selectedProvider === "arkesel" ? "Arkesel API Key" : "mNotify API Key"}
            </Label>
            <Input
              id="smsApiKey"
              name="smsApiKey"
              defaultValue={settings.smsApiKey || ""}
              placeholder={
                selectedProvider === "arkesel"
                  ? "Enter your Arkesel API key"
                  : "Enter your mNotify API key"
              }
            />
            <p className="text-xs text-gray-500">
              {selectedProvider === "arkesel"
                ? "Generated in your Arkesel account developer settings / API management."
                : "Found on your mNotify account dashboard."}
            </p>
          </div>

          {/* Public App URL */}
          <div className="space-y-2">
            <Label htmlFor="publicAppUrl">Public App URL (for SMS & WhatsApp links)</Label>
            <Input
              id="publicAppUrl"
              name="publicAppUrl"
              defaultValue={settings.publicAppUrl || ""}
              placeholder="https://your-live-app.vercel.app"
            />
            <p className="text-xs text-gray-500">
              For links and fee receipts in SMS, use the live deployed domain of this app.
            </p>
          </div>
        </div>

        {/* Info card for selected provider */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-md text-xs text-blue-800 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            ℹ️ Provider Details: {selectedProvider === "arkesel" ? "Arkesel v2 REST API" : "mNotify Quick API"}
          </p>
          {selectedProvider === "arkesel" ? (
            <p>
              Messages are dispatched to <code>https://sms.arkesel.com/api/v2/sms/send</code> with phone numbers
              automatically formatted to Ghana international format (<code>233XXXXXXXXX</code>). You can also set{" "}
              <code>ARKESEL_API_KEY</code> and <code>ARKESEL_SENDER_ID</code> in <code>.env</code>.
            </p>
          ) : (
            <p>
              Messages are dispatched to <code>https://api.mnotify.com/api/sms/quick</code> with 10-digit Ghana phone
              numbers (<code>024XXXXXXX</code>). You can also configure <code>MNOTIFY_API_KEY</code> and{" "}
              <code>MNOTIFY_SENDER_ID</code> in <code>.env</code>.
            </p>
          )}
        </div>

        {/* Live SMS Testing Box */}
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/40 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Test Active SMS Gateway
            </h4>
            <span className="text-xs text-gray-500">Save settings first before testing new credentials</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Enter test phone number (e.g., 0241234567)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="bg-white dark:bg-gray-900"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestSms}
              disabled={isTestingSms}
              className="whitespace-nowrap flex items-center gap-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700"
            >
              {isTestingSms ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Testing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Test SMS
                </>
              )}
            </Button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded text-xs flex items-start gap-2 ${
                testResult.success
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
              )}
              <div>
                <p className="font-medium">{testResult.message}</p>
                {testResult.details && (
                  <pre className="mt-1 p-1.5 bg-white/60 rounded text-[11px] overflow-x-auto max-h-24">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ! WhatsApp Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 text-green-900 dark:text-green-100">WhatsApp Configuration</h3>
        <p className="text-sm text-gray-600">
          Configure Meta WhatsApp Cloud API to send fee receipts through an approved utility template.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="whatsappPhoneNumberId">WhatsApp Phone Number ID</Label>
            <Input
              id="whatsappPhoneNumberId"
              name="whatsappPhoneNumberId"
              defaultValue={settings.whatsappPhoneNumberId || ""}
              placeholder="Enter the Meta phone number ID"
            />
            <p className="text-xs text-gray-500">
              This is the phone number ID used in the Graph API endpoint for sending messages.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappAccessToken">WhatsApp Access Token</Label>
            <Input
              id="whatsappAccessToken"
              name="whatsappAccessToken"
              type="password"
              placeholder="Leave empty to keep current token"
            />
            <p className="text-xs text-gray-500">
              Use a valid Meta system user or temporary access token with WhatsApp messaging permission.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappReceiptTemplateName">Receipt Template Name</Label>
            <Input
              id="whatsappReceiptTemplateName"
              name="whatsappReceiptTemplateName"
              defaultValue={settings.whatsappReceiptTemplateName || ""}
              placeholder="receipt_payment_notice"
            />
            <p className="text-xs text-gray-500">
              Create a Meta utility template with 4 body variables in this order: school name, student name, amount paid, receipt URL.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappReceiptTemplateLanguage">Template Language Code</Label>
            <Input
              id="whatsappReceiptTemplateLanguage"
              name="whatsappReceiptTemplateLanguage"
              defaultValue={settings.whatsappReceiptTemplateLanguage || "en_US"}
              placeholder="en_US"
              required
            />
            <p className="text-xs text-gray-500">
              This must match the approved language variant of your Meta template exactly.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded ${
            message.includes("success")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} size="lg" className="bg-blue-600 hover:bg-blue-700">
          {isPending ? "Updating..." : "Update Messaging Settings"}
        </Button>
      </div>
    </form>
  );
}
