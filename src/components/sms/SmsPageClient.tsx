"use client";

import { useEffect, useState, useTransition } from "react";
import { format, isAfter, isToday, subDays } from "date-fns";
import {
  AlertCircle,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Mail,
  Pencil,
  Search,
  Send,
  Smartphone,
  Trash2,
  Users,
} from "lucide-react";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BulkSmsModal } from "./BulkSmsModal";
import { CustomSmsModal } from "./CustomSmsModal";
import { FeesArrearsSmsModal } from "./FeesArrearsSmsModal";
import { StaffSmsModal } from "./StaffSmsModal";
import { EditSmsModal } from "./EditSmsModal";

type SmsLog = {
  id: number;
  sender: string;
  recipient: string;
  message: string;
  sentAt: string | Date;
};

type Props = {
  initialLogs: SmsLog[];
};

type SmsActionCard = {
  description: string;
  icon: typeof Mail;
  label: string;
  onClick: () => void;
  surface: string;
};

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function SmsPageClient({ initialLogs }: Props) {
  const [logs, setLogs] = useState<SmsLog[]>(initialLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesToShow, setEntriesToShow] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [isFeesOpen, setIsFeesOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SmsLog | null>(null);

  const [isPending, startTransition] = useTransition();

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/sms/logs");
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error("Failed to fetch SMS logs:", error);
    }
  };

  useEffect(() => {
    const handleSmsSent = () => fetchLogs();
    window.addEventListener("sms-sent", handleSmsSent);
    return () => window.removeEventListener("sms-sent", handleSmsSent);
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this log?")) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/api/sms/logs/${id}`, { method: "DELETE" });
        const result = await response.json();

        if (result.success) {
          setLogs((prev) => prev.filter((log) => log.id !== id));
        } else {
          alert(result.error || "Failed to delete log");
        }
      } catch {
        alert("An error occurred while deleting the log");
      }
    });
  };

  const handleEditClick = (log: SmsLog) => {
    setSelectedLog(log);
    setIsEditOpen(true);
  };

  const filteredLogs = logs.filter((log) => {
    const query = searchTerm.toLowerCase();
    return (
      log.sender.toLowerCase().includes(query) ||
      log.recipient.toLowerCase().includes(query) ||
      log.message.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / entriesToShow));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * entriesToShow,
    currentPage * entriesToShow
  );

  const totalMessages = logs.length;
  const messagesToday = logs.filter((log) => isToday(toDate(log.sentAt))).length;
  const lastSevenDays = logs.filter((log) =>
    isAfter(toDate(log.sentAt), subDays(new Date(), 7))
  ).length;
  const uniqueRecipients = new Set(
    logs.map((log) => log.recipient.trim().toLowerCase())
  ).size;
  const latestLog = logs[0];

  const actionCards: SmsActionCard[] = [
    {
      label: "Custom SMS",
      description: "Send to specific contacts.",
      icon: Send,
      onClick: () => setIsCustomOpen(true),
      surface: "from-sky-500/16 via-cyan-500/10 to-blue-500/16 border-sky-500/20",
    },
    {
      label: "Staff SMS",
      description: "Broadcast to all staff.",
      icon: Users,
      onClick: () => setIsStaffOpen(true),
      surface: "from-emerald-500/16 via-teal-500/10 to-green-500/16 border-emerald-500/20",
    },
    {
      label: "Bulk SMS",
      description: "Message grouped parents.",
      icon: Mail,
      onClick: () => setIsBulkOpen(true),
      surface: "from-violet-500/16 via-fuchsia-500/10 to-purple-500/16 border-violet-500/20",
    },
    {
      label: "Fees Arrears",
      description: "Remind overdue accounts.",
      icon: AlertCircle,
      onClick: () => setIsFeesOpen(true),
      surface: "from-rose-500/16 via-orange-500/10 to-amber-500/16 border-rose-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      <section
        className="relative overflow-hidden rounded-[28px] border border-slate-800/20 px-6 py-7 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.85)] sm:px-8 sm:py-9"
        style={{
          backgroundImage: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
        }}
      >
        <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100">
              SMS Control Center
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              School messaging, without the clutter.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-100/80 sm:text-base">
              Launch broadcasts, chase arrears, and review delivery history from one
              clean command surface.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-200/80">
                Latest Send
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {latestLog ? format(toDate(latestLog.sentAt), "MMM dd, HH:mm") : "No activity"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-200/80">
                Today
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {messagesToday} sent
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-200/80">
                Live Queue
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                Ready to broadcast
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Total Messages"
          value={totalMessages.toString()}
          description="All SMS delivery records on file."
          icon={Smartphone}
          tone="sky"
          badge="Volume"
          detail="All time"
        />
        <DashboardMetricCard
          title="Sent Today"
          value={messagesToday.toString()}
          description="Messages pushed out since midnight."
          icon={Send}
          tone="emerald"
          badge="Today"
          detail="Daily activity"
        />
        <DashboardMetricCard
          title="7 Day Output"
          value={lastSevenDays.toString()}
          description="Messages sent across the last week."
          icon={Mail}
          tone="violet"
          badge="Weekly"
          detail="Recent volume"
        />
        <DashboardMetricCard
          title="Recipients"
          value={uniqueRecipients.toString()}
          description="Unique numbers reached in the logs."
          icon={Users}
          tone="amber"
          badge="Audience"
          detail="Distinct contacts"
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground">
              Send Actions
            </h2>
            <p className="text-sm text-muted-foreground">
              Launch the most common SMS workflows directly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {actionCards.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="text-left"
              >
                <Card className="group h-full overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-[0_18px_60px_-42px_rgba(15,23,42,0.75)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_-38px_rgba(15,23,42,0.78)]">
                  <CardContent className="relative flex h-full flex-col overflow-hidden p-5">
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${action.surface}`}
                    />
                    <div className="relative flex h-full flex-col">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-foreground shadow-sm">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="inline-flex items-center rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Launch
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg font-black tracking-tight text-foreground">
                          {action.label}
                        </h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {action.description}
                        </p>
                      </div>

                      <div className="mt-auto pt-6">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                          Open flow
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </section>

      <Card className="overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-[0_24px_70px_-48px_rgba(15,23,42,0.75)]">
        <CardHeader className="border-b border-border/70 bg-muted/10 px-6 py-5 sm:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="text-xl font-black tracking-tight text-foreground">
                Delivery Log
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Search, review, and prune sent-message history.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows</span>
                <select
                  value={entriesToShow}
                  onChange={(e) => {
                    setEntriesToShow(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-10 rounded-xl border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value={6}>6</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search sender, recipient, or message"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 rounded-xl border-border bg-background pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-slate-950 text-[11px] uppercase tracking-[0.2em] text-slate-200">
                <tr>
                  <th className="px-5 py-4 font-semibold">ID</th>
                  <th className="px-5 py-4 font-semibold">Sender</th>
                  <th className="px-5 py-4 font-semibold">Recipient</th>
                  <th className="px-5 py-4 font-semibold">Message</th>
                  <th className="px-5 py-4 font-semibold">Sent</th>
                  <th className="px-5 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-5 py-4 text-sm font-semibold text-foreground">
                        #{log.id}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold uppercase text-foreground">
                        {log.sender}
                      </td>
                      <td className="px-5 py-4 text-sm text-foreground">
                        {log.recipient}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        <p className="max-w-[420px] line-clamp-2 leading-6">
                          {log.message}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        <div>{format(toDate(log.sentAt), "MMM dd, yyyy")}</div>
                        <div className="mt-1">{format(toDate(log.sentAt), "HH:mm:ss")}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditClick(log)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sky-600 transition-colors hover:bg-sky-50"
                            title="Edit & Resend"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(log.id)}
                            disabled={isPending}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Delete record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center text-sm text-muted-foreground"
                    >
                      No SMS records match the current search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-border/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              {filteredLogs.length > 0 ? (currentPage - 1) * entriesToShow + 1 : 0} to{" "}
              {Math.min(currentPage * entriesToShow, filteredLogs.length)} of{" "}
              {filteredLogs.length} entries
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="rounded-xl"
              >
                <ChevronFirst className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="rounded-xl"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Prev
              </Button>
              <div className="inline-flex h-9 min-w-[42px] items-center justify-center rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground">
                {currentPage}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages || filteredLogs.length === 0}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="rounded-xl"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages || filteredLogs.length === 0}
                onClick={() => setCurrentPage(totalPages)}
                className="rounded-xl"
              >
                <ChevronLast className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <BulkSmsModal isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} />
      <StaffSmsModal isOpen={isStaffOpen} onClose={() => setIsStaffOpen(false)} />
      <CustomSmsModal isOpen={isCustomOpen} onClose={() => setIsCustomOpen(false)} />
      <FeesArrearsSmsModal isOpen={isFeesOpen} onClose={() => setIsFeesOpen(false)} />
      <EditSmsModal
        key={selectedLog?.id ?? "none"}
        isOpen={isEditOpen}
        log={selectedLog}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedLog(null);
        }}
      />
    </div>
  );
}
