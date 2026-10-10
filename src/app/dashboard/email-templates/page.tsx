"use client";

import { useState, useEffect } from "react";
import { Mail, Plus, Edit, Trash2, Eye, Send, Save, X, Check } from "lucide-react";
import { EmailTemplateEditor } from "@/components/EmailTemplateEditor";

type EmailTemplate = {
  id: number;
  name: string;
  category: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  variables: string[];
  isActive: boolean;
  isSystem: boolean;
  lastUsedAt: string | null;
  usageCount: number;
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
  
  //* Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "CUSTOM",
    subject: "",
    bodyHtml: "",
    bodyText: "",
    variables: [] as string[],
  });

  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const cleanVariableName = (value: string) => value.replace(/[{}]/g, "");

  const getSampleVariableValue = (key: string) => {
    const today = new Date();
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const normalizedKey = key.toLowerCase();

    const samples: Record<string, string> = {
      schoolname: "Student Management System",
      year: String(today.getFullYear()),
      loginurl: `${origin}/login`,
      paymenturl: origin,
      confirmurl: `${origin}/dashboard/meetings`,
      rescheduleurl: `${origin}/dashboard/meetings`,
      name: "Test Recipient",
      recipientname: "Test Recipient",
      parentname: "Test Parent",
      studentname: "Test Student",
      requestername: "Test Teacher",
      teachername: "Test Teacher",
      loginid: "TEST-001",
      userid: "TEST-001",
      temporarypassword: "TempPass123",
      newpassword: "NewPass123",
      role: "Parent",
      feetitle: "First Term Fees",
      amount: "1500.00",
      currency: "GHS ",
      duedate: today.toISOString().slice(0, 10),
      assignmenttitle: "Mathematics Homework",
      subjectname: "Mathematics",
      description: "This is a sample template preview.",
      examtitle: "Midterm Examination",
      examdate: today.toISOString().slice(0, 10),
      starttime: "09:00",
      endtime: "11:00",
      meetingdate: today.toISOString().slice(0, 10),
      meetingtime: "10:00",
      location: "School Office",
      purpose: "Academic progress discussion",
      behaviortype: "Misconduct",
      severity: "High",
      severityclass: "high",
      date: today.toISOString().slice(0, 10),
      actiontaken: "Parent contacted",
      attendancestatus: "Absent",
      attendancepercentage: "92",
      announcementtitle: "General School Notice",
      announcementbody: "This is a sample announcement body for template testing.",
    };

    return samples[normalizedKey] || `Sample ${key}`;
  };

  const buildSampleVariables = (template: EmailTemplate) =>
    Object.fromEntries(
      template.variables.map((variable) => {
        const key = cleanVariableName(variable);
        return [key, getSampleVariableValue(key)];
      })
    );

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/email-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data.templates || []);
      
      //* If no templates exist, initialize default templates
      if (!data.templates || data.templates.length === 0) {
        await initializeTemplates();
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const initializeTemplates = async () => {
    try {
      const response = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initialize" }),
      });
      
      if (response.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error("Error initializing templates:", error);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText || "",
      variables: template.variables || [],
    });
    setIsEditing(true);
    setIsPreviewing(false);
  };

  const handlePreview = async (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewing(true);
    setIsEditing(false);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setFormData({
      name: "",
      category: "CUSTOM",
      subject: "",
      bodyHtml: "",
      bodyText: "",
      variables: [],
    });
    setIsEditing(true);
    setIsPreviewing(false);
  };

  const handleSave = async () => {
    try {
      const response = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedTemplate ? "update" : "create",
          templateId: selectedTemplate?.id,
          ...formData,
        }),
      });

      if (!response.ok) throw new Error("Failed to save template");

      await fetchTemplates();
      setIsEditing(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      const response = await fetch(`/api/email-templates?id=${templateToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete template");

      await fetchTemplates();
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const handleSendTest = async () => {
    if (!selectedTemplate || !testEmail) return;

    setSendingTest(true);
    try {
      const response = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          templateId: selectedTemplate.id,
          recipient: testEmail,
          variables: buildSampleVariables(selectedTemplate),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send test email");
      }
      
      alert("Test email sent successfully!");
      setTestEmail("");
    } catch (error) {
      console.error("Error sending test email:", error);
      alert(`Failed to send test email: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSendingTest(false);
    }
  };

  const categoryColors: Record<string, string> = {
    WELCOME: "bg-green-500",
    FEE_REMINDER: "bg-red-500",
    ASSIGNMENT_NOTIFICATION: "bg-purple-500",
    EXAM_NOTIFICATION: "bg-indigo-500",
    MEETING_REQUEST: "bg-blue-500",
    MEETING_REMINDER: "bg-yellow-500",
    MEETING_CONFIRMATION: "bg-green-500",
    BEHAVIOR_NOTIFICATION: "bg-orange-500",
    ATTENDANCE_ALERT: "bg-cyan-500",
    GENERAL_ANNOUNCEMENT: "bg-gray-500",
    PASSWORD_RESET: "bg-pink-500",
    CUSTOM: "bg-slate-500",
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage email templates for automated communications
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={initializeTemplates}
            className="flex items-center space-x-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <Check className="w-5 h-5" />
            <span>Initialize Templates</span>
          </button>
          <button
            onClick={handleNewTemplate}
            className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Template List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.length === 0 ? (
          <div className="col-span-full bg-card border border-border rounded-lg p-8 text-center">
            <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Email Templates Found</h3>
            <p className="text-muted-foreground mb-4">
              Click the &quot;Initialize Templates&quot; button to create default email templates for common communications.
            </p>
            <button
              onClick={initializeTemplates}
              className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors mx-auto"
            >
              <Check className="w-5 h-5" />
              <span>Initialize Default Templates</span>
            </button>
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-10 h-10 ${categoryColors[template.category] || "bg-gray-500"} rounded-lg flex items-center justify-center text-white`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{template.name}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {template.category}
                    </span>
                  </div>
                </div>
                {template.isSystem && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    System
                  </span>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {template.subject}
              </p>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                <span>Used: {template.usageCount} times</span>
                <span className={template.isActive ? "text-green-600" : "text-red-600"}>
                  {template.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePreview(template)}
                  className="flex-1 flex items-center justify-center space-x-1 bg-muted text-foreground px-3 py-2 rounded hover:bg-muted/80 transition-colors text-sm"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="flex-1 flex items-center justify-center space-x-1 bg-muted text-foreground px-3 py-2 rounded hover:bg-muted/80 transition-colors text-sm"
                  disabled={template.isSystem && template.category !== "CUSTOM"}
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                {!template.isSystem && (
                  <button
                    onClick={() => {
                      setTemplateToDelete(template.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <h2 className="text-xl font-bold text-foreground">
                {selectedTemplate ? "Edit Template" : "New Template"}
              </h2>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-muted rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="e.g., Welcome Email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="CUSTOM">Custom</option>
                    <option value="WELCOME">Welcome</option>
                    <option value="FEE_REMINDER">Fee Reminder</option>
                    <option value="ASSIGNMENT_NOTIFICATION">Assignment Notification</option>
                    <option value="EXAM_NOTIFICATION">Exam Notification</option>
                    <option value="MEETING_REQUEST">Meeting Request</option>
                    <option value="MEETING_REMINDER">Meeting Reminder</option>
                    <option value="MEETING_CONFIRMATION">Meeting Confirmation</option>
                    <option value="BEHAVIOR_NOTIFICATION">Behavior Notification</option>
                    <option value="ATTENDANCE_ALERT">Attendance Alert</option>
                    <option value="GENERAL_ANNOUNCEMENT">General Announcement</option>
                    <option value="PASSWORD_RESET">Password Reset</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="e.g., Welcome to {{schoolName}}!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Body (Visual Editor)
                </label>
                <EmailTemplateEditor
                  value={formData.bodyHtml}
                  onChange={(html) => setFormData({ ...formData, bodyHtml: html })}
                  variables={formData.variables}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Body (Plain Text)
                </label>
                <textarea
                  value={formData.bodyText}
                  onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground font-mono text-sm"
                  rows={5}
                  placeholder="Plain text content with {{variables}}"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Variables (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.variables.join(", ")}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    variables: e.target.value.split(",").map(v => v.trim()).filter(Boolean)
                  })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="{{name}}, {{email}}, {{amount}}"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end space-x-3 sticky bottom-0 bg-card">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Save className="w-5 h-5" />
                <span>Save Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewing && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <h2 className="text-xl font-bold text-foreground">
                Preview: {selectedTemplate.name}
              </h2>
              <button
                onClick={() => setIsPreviewing(false)}
                className="p-2 hover:bg-muted rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-muted p-4 rounded-lg mb-4">
                <p className="text-sm text-muted-foreground mb-1">Subject:</p>
                <p className="text-foreground font-medium">{selectedTemplate.subject}</p>
              </div>

              <div className="border border-border rounded-lg p-4 mb-4">
                <p className="text-sm text-muted-foreground mb-2">HTML Preview:</p>
                <div
                  className="bg-white p-6 rounded border border-border text-slate-900 max-h-[500px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.bodyHtml }}
                />
              </div>

              {selectedTemplate.bodyText && (
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Plain Text:</p>
                  <pre className="text-foreground whitespace-pre-wrap text-sm">
                    {selectedTemplate.bodyText}
                  </pre>
                </div>
              )}

              {selectedTemplate.variables.length > 0 && (
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Available Variables:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map((variable, index) => (
                      <span
                        key={index}
                        className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-mono"
                      >
                        {variable}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-foreground mb-3">Send Test Email</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                  <button
                    onClick={handleSendTest}
                    disabled={sendingTest || !testEmail}
                    className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                    <span>{sendingTest ? "Sending..." : "Send Test"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end space-x-3 sticky bottom-0 bg-card">
              <button
                onClick={() => setIsPreviewing(false)}
                className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsPreviewing(false);
                  handleEdit(selectedTemplate);
                }}
                className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Edit className="w-5 h-5" />
                <span>Edit Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold text-foreground mb-4">Confirm Delete</h2>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this template? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTemplateToDelete(null);
                }}
                className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
