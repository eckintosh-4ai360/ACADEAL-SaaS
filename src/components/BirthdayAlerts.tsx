"use client";

import { useState } from "react";
import { Gift, PartyPopper, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BirthdayCelebrant } from "@/lib/birthdays";

type BirthdayAlertsProps = {
  celebrants: BirthdayCelebrant[];
  canSendSms: boolean;
};

export function BirthdayAlerts({ celebrants, canSendSms }: BirthdayAlertsProps) {
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const sendBirthdaySms = async (celebrant: BirthdayCelebrant) => {
    const key = `${celebrant.type}:${celebrant.id}`;
    setSending(key);
    setNotice(null);

    try {
      const response = await fetch("/api/birthdays/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          celebrantId: celebrant.id,
          celebrantType: celebrant.type,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to send the birthday SMS.");
      }

      setSent((current) => new Set(current).add(key));
      setNotice({ type: "success", message: data.message || "Birthday SMS sent." });
      window.dispatchEvent(new CustomEvent("sms-sent"));
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to send the birthday SMS.",
      });
    } finally {
      setSending(null);
    }
  };

  const students = celebrants.filter((person) => person.type === "STUDENT").length;
  const staff = celebrants.length - students;

  return (
    <Card className="overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 via-card to-rose-50 shadow-sm dark:border-amber-900/50 dark:from-amber-950/20 dark:to-rose-950/20">
      <CardHeader className="border-b border-amber-100/80 pb-4 dark:border-amber-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PartyPopper className="h-5 w-5 text-amber-600" />
              Today&apos;s birthdays
            </CardTitle>
            <CardDescription className="mt-1">
              {celebrants.length === 0
                ? "Keep track of birthday celebrations across the school community."
                : `Celebrate ${celebrants.length} ${celebrants.length === 1 ? "person" : "people"} in the school community today.`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {students > 0 && <Badge variant="secondary">{students} student{students === 1 ? "" : "s"}</Badge>}
            {staff > 0 && <Badge variant="secondary">{staff} staff</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {notice && (
          <div
            role="status"
            className={`rounded-lg px-3 py-2 text-sm ${
              notice.type === "success"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200"
            }`}
          >
            {notice.message}
          </div>
        )}

        {celebrants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-amber-200 bg-background/70 px-4 py-8 text-center dark:border-amber-900/50">
            <Gift className="mx-auto mb-3 h-8 w-8 text-amber-500" />
            <p className="font-medium">No birthdays today</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Birthday alerts and SMS actions will appear here when a student or staff member is celebrating.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {celebrants.map((celebrant) => {
              const key = `${celebrant.type}:${celebrant.id}`;
              const isSending = sending === key;
              const wasSent = sent.has(key);

              return (
                <div
                  key={key}
                  className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-background/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-sm">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{celebrant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {celebrant.type === "STUDENT" ? "Student" : "Staff"} · {celebrant.detail}
                      </p>
                    </div>
                  </div>

                  {canSendSms && (
                    celebrant.smsRecipient ? (
                      <Button
                        size="sm"
                        variant={wasSent ? "secondary" : "outline"}
                        disabled={isSending || wasSent}
                        onClick={() => void sendBirthdaySms(celebrant)}
                        className="shrink-0"
                      >
                        {isSending ? (
                          "Sending..."
                        ) : wasSent ? (
                          "SMS sent"
                        ) : (
                          <><Send className="mr-2 h-4 w-4" /> Send SMS</>
                        )}
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Smartphone className="h-3.5 w-3.5" /> No SMS contact
                      </span>
                    ))}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
