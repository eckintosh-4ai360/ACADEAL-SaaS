"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";

type EmailTemplate = {
  id: number;
  name: string;
  subject: string;
  variables: string[];
  bodyHtml: string;
};

interface SendEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientEmail: string;
  recipientName: string;
  broadcast?: boolean;
}

export function SendEmailModal({
  open,
  onOpenChange,
  recipientEmail,
  recipientName,
  broadcast = false,
}: SendEmailModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      //* Pre-fill common variables
      setVariables({
        name: recipientName,
        recipientName: recipientName,
      });
    }
  }, [open, recipientName]);

  const fetchTemplates = async () => {
    setFetchingTemplates(true);
    try {
      const response = await fetch("/api/email-templates");
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load email templates");
    } finally {
      setFetchingTemplates(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id.toString() === selectedTemplateId);

  const handleSend = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: broadcast ? "broadcast" : "send",
          templateId: parseInt(selectedTemplateId),
          recipient: recipientEmail,
          variables: variables,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(broadcast ? "Broadcast sent successfully!" : "Email sent successfully!");
        onOpenChange(false);
      } else {
        throw new Error(data.error || "Failed to send email");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const cleanVariableName = (v: string) => v.replace(/[{}]/g, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{broadcast ? "Broadcast Email" : "Send Email"}</DialogTitle>
          <DialogDescription>
            {broadcast 
              ? "Send a broadcast email to all parents using a template."
              : `Sending email to ${recipientName} (${recipientEmail})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={fetchingTemplates}
            >
              <option value="" disabled>
                {fetchingTemplates ? "Loading templates..." : "Select a template"}
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id.toString()}>
                  {template.name}
                </option>
              ))}
            </Select>
          </div>

          {selectedTemplate && (
            <>
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-semibold">Template Variables</Label>
                <div className="grid grid-cols-1 gap-3">
                  {selectedTemplate.variables.map((v) => {
                    const key = cleanVariableName(v);

                    //* Skip dynamically injected variables in broadcast mode
                    if (
                      broadcast &&
                      ["parentname", "studentname", "name", "recipientname"].includes(
                        key.toLowerCase()
                      )
                    ) {
                      return null;
                    }

                    const isDateField = key.toLowerCase().includes("date");
                    const isTimeField = key.toLowerCase().includes("time");
                    const inputType = isDateField ? "date" : isTimeField ? "time" : "text";

                    return (
                      <div key={v} className="space-y-1">
                        <Label className="text-xs text-muted-foreground capitalize">{key}</Label>
                        <Input
                          type={inputType}
                          value={variables[key] || ""}
                          onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                          placeholder={`Enter ${key}`}
                          className="h-8 w-full"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-2"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPreview ? "Hide Preview" : "Show HTML Preview"}
                </Button>

                {showPreview && (
                  <div className="mt-2 p-3 border rounded-md bg-white overflow-hidden">
                    <div 
                      className="text-[10px] leading-tight text-slate-900 max-h-[200px] overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: selectedTemplate.bodyHtml }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading || !selectedTemplateId}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {broadcast ? "Send Broadcast" : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
