"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  Bot,
  CheckCircle2,
  FileText,
  GraduationCap,
  History,
  Loader2,
  MessageSquare,
  PanelLeft,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";
import { normalizeAssistantText } from "@/lib/assistant-text";
import { cn } from "@/lib/utils";

// ─── Local Types  

type AssistantActionStatus =
  | "cancelled"
  | "executed"
  | "executing"
  | "failed"
  | "pending";

type AssistantAudience = {
  label: string;
  type: string;
  classId?: number;
  className?: string;
};

type AssistantActionBase = {
  confirmationLabel: string;
  id: string;
  preview: {
    body: string;
    details: { label: string; value: string }[];
    heading: string;
  };
  riskLevel: "low" | "medium" | "high";
  summary: string;
  title: string;
};

type SendParentSmsActionPlan = AssistantActionBase & {
  payload: {
    audience: AssistantAudience;
    message: string;
    recipientCount: number;
  };
  type: "SEND_PARENT_SMS";
};

type CreateUserNoteActionPlan = AssistantActionBase & {
  payload: {
    contentHtml: string;
    contentText: string;
    target: {
      label: string;
      userId: string;
      userType: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
    };
    title: string;
  };
  type: "CREATE_USER_NOTE";
};

type AssistantActionPlan = CreateUserNoteActionPlan | SendParentSmsActionPlan;

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  action?: AssistantActionPlan | null;
  actionStatus?: AssistantActionStatus;
};

type ChatConversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};

type SchoolStats = { students: number; parents: number; classes: number };

type Props = {
  userKey: string;
};

// ─── Quick Prompts  

const QUICK_PROMPTS = [
  { label: "Which students have been absent more than 10 days this term?", icon: AlertTriangle },
  { label: "Show students who owe more than GH₵500 in fees", icon: Wallet },
  { label: "Generate report comments for JHS 2", icon: FileText },
  { label: "Which teacher has the highest workload?", icon: Users },
  { label: "Predict students likely to fail based on current scores", icon: TrendingDown },
  { label: "How is JHS 2A performing academically?", icon: BarChart2 },
  { label: "Show fee defaulters by class", icon: AlertCircle },
  { label: "What is today's attendance rate?", icon: GraduationCap },
  { label: "Send a reminder to parents about upcoming PTA meeting", icon: MessageSquare },
];

const THINKING_MESSAGES = [
  "Analyzing school data…",
  "Cross-referencing records…",
  "Preparing insights…",
  "Querying student records…",
  "Crunching the numbers…",
];

// ─── Helpers  

const SYSTEM_CHAT_STORAGE_PREFIX = "acadeal:system-chat:v1";
const MAX_STORED_CONVERSATIONS = 30;

function markStatus(
  msg: ChatMessage,
  id: string,
  status: AssistantActionStatus
): ChatMessage {
  return msg.id === id ? { ...msg, actionStatus: status } : msg;
}

function createId(prefix: string) {
  const cryptoApi = globalThis.crypto;
  const randomValue =
    typeof cryptoApi?.randomUUID === "function"
      ? cryptoApi.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${prefix}-${Date.now()}-${randomValue}`;
}

function createChatMessage(
  role: ChatMessage["role"],
  content: string,
  extra?: Pick<ChatMessage, "action" | "actionStatus">
): ChatMessage {
  return {
    id: createId(role),
    role,
    content,
    ...extra,
  };
}

function buildConversationTitle(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim();

  if (!compact) {
    return "New conversation";
  }

  const words = compact.split(" ").slice(0, 8).join(" ");
  return words.length > 64 ? `${words.slice(0, 61)}...` : words;
}

function formatConversationDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function normalizeStoredConversations(value: unknown): ChatConversation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((conversation): ChatConversation | null => {
      if (!conversation || typeof conversation !== "object") {
        return null;
      }

      const item = conversation as Partial<ChatConversation>;
      const messages = Array.isArray(item.messages)
        ? item.messages.filter(
            (message): message is ChatMessage =>
              Boolean(message) &&
              typeof message === "object" &&
              ((message as ChatMessage).role === "assistant" ||
                (message as ChatMessage).role === "user") &&
              typeof (message as ChatMessage).content === "string"
          )
        : [];

      if (!item.id || typeof item.id !== "string" || messages.length === 0) {
        return null;
      }

      return {
        id: item.id,
        title:
          typeof item.title === "string" && item.title.trim()
            ? item.title.trim()
            : buildConversationTitle(messages[0]?.content || ""),
        updatedAt:
          typeof item.updatedAt === "string" && item.updatedAt
            ? item.updatedAt
            : new Date().toISOString(),
        messages,
      };
    })
    .filter((conversation): conversation is ChatConversation =>
      Boolean(conversation)
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, MAX_STORED_CONVERSATIONS);
}

// ─── Component  

export function SystemChatPage({ userKey }: Props) {
  const storageKey = `${SYSTEM_CHAT_STORAGE_PREFIX}:${userKey}`;
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [stats, setStats] = useState<SchoolStats>({
    students: 0,
    parents: 0,
    classes: 0,
  });

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeConversation = useMemo(
    () =>
      activeConversationId
        ? conversations.find((conversation) => conversation.id === activeConversationId) || null
        : null,
    [activeConversationId, conversations]
  );
  const messages = activeConversation?.messages || [];
  const hasMessages = messages.length > 0;

  const [thinkingIndex, setThinkingIndex] = useState(0);

  // Load saved conversations on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = normalizeStoredConversations(parsed);
        setConversations(normalized);
        if (normalized.length > 0) {
          setActiveConversationId(normalized[0].id);
        }
      }
    } catch {
      // Storage is best-effort
    }
  }, [storageKey]);

  function commitConversations(
    updater: (current: ChatConversation[]) => ChatConversation[]
  ) {
    setConversations((current) => {
      const next = updater(current)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, MAX_STORED_CONVERSATIONS);

      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Storage is best-effort; the active chat should still keep working.
      }

      return next;
    });
  }

  function appendMessagesToConversation(
    conversationId: string,
    titleSeed: string,
    nextMessages: ChatMessage[]
  ) {
    const updatedAt = new Date().toISOString();

    commitConversations((current) => {
      const existing = current.find((conversation) => conversation.id === conversationId);

      if (!existing) {
        return [
          {
            id: conversationId,
            title: buildConversationTitle(titleSeed),
            updatedAt,
            messages: nextMessages,
          },
          ...current,
        ];
      }

      return current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              updatedAt,
              messages: [...conversation.messages, ...nextMessages],
            }
          : conversation
      );
    });
  }

  function updateActiveConversationMessages(
    updater: (messages: ChatMessage[]) => ChatMessage[]
  ) {
    if (!activeConversationId) {
      return;
    }

    const updatedAt = new Date().toISOString();

    commitConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              updatedAt,
              messages: updater(conversation.messages),
            }
          : conversation
      )
    );
  }

  function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    commitConversations((current) => current.filter((item) => item.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  }

  function startNewChat() {
    setActiveConversationId(null);
    setInput("");
  }

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setThinkingIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Fetch school stats for the hero section
  useEffect(() => {
    fetch("/api/system-chat/stats")
      .then((r) => r.json())
      .then((data: Partial<SchoolStats>) => {
        setStats({
          students: data.students ?? 0,
          parents: data.parents ?? 0,
          classes: data.classes ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  function handleInput() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }

  // ─── Send Message  

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    let targetId = activeConversationId;
    if (!targetId) {
      targetId = createId("chat");
      setActiveConversationId(targetId);
    }

    const userMessage = createChatMessage("user", trimmed);
    appendMessagesToConversation(targetId, trimmed, [userMessage]);

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/system-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "No response from assistant."
        );
      }

      const assistantMessage = createChatMessage(
        "assistant",
        normalizeAssistantText(
          typeof data?.reply === "string" ? data.reply : ""
        ),
        {
          action:
            data?.action && typeof data.action === "object"
              ? (data.action as AssistantActionPlan)
              : null,
          actionStatus: data?.action ? "pending" : undefined,
        }
      );

      appendMessagesToConversation(targetId, trimmed, [assistantMessage]);
    } catch (err) {
      const errorMessage = createChatMessage(
        "assistant",
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      appendMessagesToConversation(targetId, trimmed, [errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Confirm Action  

  async function confirmAction(messageId: string, action: AssistantActionPlan) {
    if (activeActionId || !activeConversationId) return;
    setActiveActionId(action.id);
    updateActiveConversationMessages((prev) =>
      prev.map((m) => markStatus(m, messageId, "executing"))
    );

    try {
      const res = await fetch("/api/system-chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Action failed."
        );
      }

      const resultMsg = createChatMessage(
        "assistant",
        normalizeAssistantText(
          typeof data?.reply === "string" ? data.reply : "Action completed."
        )
      );

      updateActiveConversationMessages((prev) => [
        ...prev.map((m) => markStatus(m, messageId, "executed")),
        resultMsg,
      ]);

      if (action.type === "SEND_PARENT_SMS") {
        window.dispatchEvent(new CustomEvent("sms-sent"));
      }

      if (action.type === "CREATE_USER_NOTE") {
        window.dispatchEvent(new CustomEvent("notes-updated"));
      }
    } catch (err) {
      const errorMsg = createChatMessage(
        "assistant",
        err instanceof Error ? err.message : "This action failed. Try again."
      );
      updateActiveConversationMessages((prev) => [
        ...prev.map((m) => markStatus(m, messageId, "failed")),
        errorMsg,
      ]);
    } finally {
      setActiveActionId(null);
    }
  }

  function cancelAction(messageId: string) {
    if (!activeConversationId) return;
    const cancelMsg = createChatMessage(
      "assistant",
      "Cancelled. Nothing was sent or changed."
    );
    updateActiveConversationMessages((prev) => [
      ...prev.map((m) => markStatus(m, messageId, "cancelled")),
      cancelMsg,
    ]);
  }

  // ─── Action Card  

  function renderActionCard(message: ChatMessage) {
    const action = message.action;
    if (!action) return null;

    const status = message.actionStatus ?? "pending";
    const hasRequiredData =
      action.type === "SEND_PARENT_SMS"
        ? action.payload.recipientCount > 0
        : action.payload.contentText.trim().length > 0;
    const isBlocked = action.confirmationLabel === "Not allowed";
    const canConfirm =
      status === "pending" && hasRequiredData && !isBlocked && !activeActionId;
    const progressLabel =
      action.type === "SEND_PARENT_SMS" ? "Sending..." : "Saving...";
    const completedLabel = action.type === "SEND_PARENT_SMS" ? "Sent" : "Saved";
    const ActionIcon = action.type === "CREATE_USER_NOTE" ? FileText : ShieldCheck;

    return (
      <div className="mt-3 rounded-2xl border border-amber-200/70 bg-white/95 dark:border-amber-900/60 dark:bg-slate-900/95 p-4 shadow-sm text-left">
        {/* Header */}
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            {isBlocked ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <ActionIcon className="h-4 w-4" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{action.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review carefully - I will only run this after your confirmation.
            </p>
          </div>
        </div>

        {/* Preview body */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 p-3 mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
            {action.preview.heading}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
            {action.preview.body}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-1.5 mb-3">
          {action.preview.details.map((d) => (
            <div
              key={`${action.id}-${d.label}`}
              className="flex justify-between items-center rounded-xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs"
            >
              <span className="text-slate-500 dark:text-slate-400">{d.label}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{d.value}</span>
            </div>
          ))}
        </div>

        {/* No recipients warning */}
        {action.type === "SEND_PARENT_SMS" && !hasRequiredData && !isBlocked && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 px-3 py-2 text-xs text-red-600 dark:text-red-400 mb-3">
            No valid parent phone numbers found for this audience. Cannot send.
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => void confirmAction(message.id, action)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === "executing" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {progressLabel}
              </>
            ) : status === "executed" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> {completedLabel}
              </>
            ) : (
              action.confirmationLabel
            )}
          </button>

          <button
            type="button"
            disabled={status !== "pending" || Boolean(activeActionId)}
            onClick={() => cancelAction(message.id)}
            className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === "cancelled" ? "Cancelled" : "Cancel"}
          </button>
        </div>

        {status === "failed" && (
          <p className="mt-2 text-xs text-red-500 font-medium">
            This action failed. Revise your prompt and try again.
          </p>
        )}
      </div>
    );
  }

  // ─── Render   

  function renderFormattedContent(content: string) {
    const lines = content.split('\n');
    // Detect if content has structured list items (numbered or dashed)
    const hasStructuredData = lines.filter(l => /^\s*(\d+[\)\.]|[-•])\s/.test(l)).length >= 3;
    
    if (!hasStructuredData) {
      return <div className="whitespace-pre-wrap">{normalizeAssistantText(content)}</div>;
    }
    
    // Split into intro text and structured items
    const introLines: string[] = [];
    const dataLines: string[] = [];
    let foundData = false;
    
    for (const line of lines) {
      if (/^\s*(\d+[\)\.]|[-•])\s/.test(line)) {
        foundData = true;
        dataLines.push(line.replace(/^\s*(\d+[\)\.]|[-•])\s*/, '').trim());
      } else if (!foundData) {
        introLines.push(line);
      } else {
        dataLines.push(line.trim());
      }
    }
    
    return (
      <div>
        {introLines.length > 0 && (
          <div className="whitespace-pre-wrap mb-3">{normalizeAssistantText(introLines.join('\n'))}</div>
        )}
        <div className="mt-2 space-y-1.5">
          {dataLines.filter(Boolean).map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-2 text-xs"
            >
              <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 text-[10px] font-bold">
                {i + 1}
              </span>
              <span className="text-slate-700 dark:text-slate-200">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50/40 to-blue-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* ── Chat History Sidebar ── */}
      <aside
        className={cn(
          "flex flex-col border-r border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-md transition-all duration-200 z-20 shrink-0",
          isSidebarOpen ? "w-72" : "w-0 overflow-hidden border-none"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 p-3.5">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold text-sm">
            <History className="h-4 w-4 text-teal-500" />
            <span>Chat History</span>
          </div>
          <button
            type="button"
            onClick={startNewChat}
            className="flex items-center gap-1 rounded-xl bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Saved Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs font-medium">No saved chats yet</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Your conversations will be saved here automatically.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={cn(
                    "group relative flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-left transition-all",
                    isActive
                      ? "border-teal-200 bg-teal-50/70 dark:border-teal-800/60 dark:bg-teal-950/40 text-teal-900 dark:text-teal-100 font-medium"
                      : "border-transparent text-slate-700 dark:text-slate-300 hover:border-slate-200 hover:bg-slate-100/60 dark:hover:border-slate-800 dark:hover:bg-slate-800/50"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <MessageSquare className={cn("h-4 w-4 shrink-0", isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-400")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium leading-tight">
                        {conv.title}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {formatConversationDate(conv.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    title="Delete chat"
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <div className="flex flex-1 flex-col h-full min-w-0">
        {/* Top Header Bar */}
        <header className="flex h-13 items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 px-4 py-2.5 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <div className="truncate">
              <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {activeConversation ? activeConversation.title : "New Conversation"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startNewChat}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Plus className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span>New Chat</span>
            </button>
          </div>
        </header>

        {/* Message feed OR Hero */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {!hasMessages ? (
            /* Hero welcome state */
            <div className="flex min-h-full flex-col items-center justify-center px-6 py-12 text-center">
              {/* Icon */}
              <div className="relative mb-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg shadow-teal-500/20">
                  <Bot className="h-10 w-10 text-white" />
                </div>
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500" />
                </span>
              </div>

              <span className="mt-2 mb-4 inline-flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 px-3 py-1 text-xs font-medium text-teal-700 dark:text-teal-300">
                ✨ Powered by AI
              </span>

              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1.5">
                School Copilot
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400 mb-8">
                Ask anything about your school — attendance, fees, grades, teacher workloads, student predictions, and more. I can also draft notes and send parent messages.
              </p>

              {/* Quick prompt grid */}
              <div className="mb-8 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void sendMessage(label)}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80 px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50/60 dark:hover:border-teal-700/60 dark:hover:bg-teal-950/40 hover:shadow-md disabled:opacity-50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium leading-snug text-slate-700 dark:text-slate-200">
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-5 text-sm text-slate-400 dark:text-slate-500">
                <span>
                  <strong className="text-slate-700 dark:text-slate-200">{stats.students}</strong>{" "}
                  students
                </span>
                <span className="text-slate-200 dark:text-slate-800">|</span>
                <span>
                  <strong className="text-slate-700 dark:text-slate-200">{stats.parents}</strong>{" "}
                  parents
                </span>
                <span className="text-slate-200 dark:text-slate-800">|</span>
                <span>
                  <strong className="text-slate-700 dark:text-slate-200">{stats.classes}</strong>{" "}
                  classes
                </span>
              </div>
            </div>
          ) : (
            /* Message feed */
            <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="mr-2 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-sm text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      message.role === "user"
                        ? "rounded-tr-sm bg-gradient-to-br from-teal-500 to-teal-600 text-white"
                        : "rounded-tl-sm border border-slate-100 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    )}
                  >
                    <div className="whitespace-pre-wrap">
                      {message.role === "assistant"
                        ? renderFormattedContent(message.content)
                        : message.content}
                    </div>
                    {renderActionCard(message)}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
                    <span>{THINKING_MESSAGES[thinkingIndex]}</span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        <div className="shrink-0 border-t border-slate-100/80 bg-white/80 dark:border-slate-800/80 dark:bg-slate-950/80 px-4 pb-5 pt-3 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl">
            <div className="relative rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm transition-all focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-100 dark:focus-within:border-teal-600 dark:focus-within:ring-teal-900/30">
              <textarea
                ref={textareaRef}
                value={input}
                rows={2}
                disabled={isLoading}
                placeholder="Ask the School Copilot about attendance, fees, grades, predictions, and more..."
                className="w-full resize-none rounded-2xl bg-transparent px-4 pb-10 pt-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                onChange={(e) => {
                  setInput(e.target.value);
                  handleInput();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(input);
                  }
                }}
              />
              <div className="absolute bottom-2.5 left-4 right-3 flex items-center justify-between">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Actions require confirmation before changing the system.
                </p>
                <button
                  type="button"
                  disabled={isLoading || !input.trim()}
                  onClick={() => void sendMessage(input)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-white shadow-sm transition-all hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
              Enter sends · Shift+Enter adds a new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
