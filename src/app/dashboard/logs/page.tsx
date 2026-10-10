import prisma from "@/lib/prisma";
import { AuditLogTable } from "@/components/tables/AuditLogTable";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuditLogExport } from "@/components/AuditLogExport";
import { AuditLogFilters } from "@/components/AuditLogFilters";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

type SearchParams = {
  search?: string;
  page?: string;
  from?: string;
  to?: string;
  pageSize?: string;
  category?: string;
  status?: "SUCCESS" | "FAILURE";
};

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const search = params.search?.trim() || "";
  const category = params.category?.trim() || "";
  const status =
    params.status === "SUCCESS" || params.status === "FAILURE"
      ? params.status
      : undefined;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const rawPageSize = Number.parseInt(params.pageSize || "25", 10) || 25;
  const pageSize = Math.min(Math.max(rawPageSize, 25), 100);
  const from = params.from;
  const to = params.to;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { requestId: { contains: search, mode: "insensitive" } },
      { action: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      { actorName: { contains: search, mode: "insensitive" } },
      { actorLoginId: { contains: search, mode: "insensitive" } },
      { actorRole: { contains: search, mode: "insensitive" } },
      { entityType: { contains: search, mode: "insensitive" } },
      { entityId: { contains: search, mode: "insensitive" } },
      { entityLabel: { contains: search, mode: "insensitive" } },
      { source: { contains: search, mode: "insensitive" } },
      { path: { contains: search, mode: "insensitive" } },
      { ipAddress: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
      { canonicalLine: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category = category;
  }

  if (status) {
    where.status = status;
  }

  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) {
      createdAt.gte = new Date(from);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      createdAt.lte = toDate;
    }
    where.createdAt = createdAt;
  }

  let logs: Awaited<ReturnType<typeof prisma.auditLog.findMany>> = [];
  let total = 0;
  let auditLogsUnavailable = false;

  try {
    [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
  } catch (error) {
    console.error("Failed to load audit logs:", error);
    auditLogsUnavailable = true;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getPageUrl = (nextPage: number) => {
    const urlParams = new URLSearchParams();
    if (search) urlParams.set("search", search);
    if (category) urlParams.set("category", category);
    if (status) urlParams.set("status", status);
    if (from) urlParams.set("from", from);
    if (to) urlParams.set("to", to);
    if (pageSize !== 25) urlParams.set("pageSize", pageSize.toString());
    urlParams.set("page", String(nextPage));
    return `/dashboard/logs?${urlParams.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-teal-700 dark:text-teal-400 uppercase">
            Canonical Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            One authoritative audit record per action, with actor, target, outcome, and
            canonical log line details.
          </p>
        </div>
        <AuditLogExport logs={logs} />
      </div>

      <Card className="border-teal-100 shadow-sm">
        <CardHeader className="pb-4 border-b border-teal-50">
          <AuditLogFilters />
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {auditLogsUnavailable && (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Audit logs are temporarily unavailable. Please try again later.
            </div>
          )}
          <AuditLogTable
            logs={logs}
            emptyStateMessage={
              auditLogsUnavailable
                ? "Audit logs are temporarily unavailable."
                : "No audit logs found."
            }
          />

          {!auditLogsUnavailable && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, total)} of {total} entries
              </p>
              <div className="flex items-center gap-2">
                <Link href={getPageUrl(Math.max(1, page - 1))}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    className="border-teal-100 hover:bg-teal-50"
                  >
                    Previous
                  </Button>
                </Link>
                <div className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <Link href={getPageUrl(Math.min(totalPages, page + 1))}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    className="border-teal-100 hover:bg-teal-50"
                  >
                    Next
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
