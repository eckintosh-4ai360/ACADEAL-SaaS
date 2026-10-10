import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  requestId: string;
  action: string;
  category: string;
  status: "SUCCESS" | "FAILURE";
  actorName: string | null;
  actorRole: string | null;
  actorLoginId: string | null;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  source: string;
  path: string | null;
  ipAddress: string | null;
  summary: string;
  metadata: unknown;
  canonicalLine: string;
  durationMs: number | null;
  createdAt: Date;
}

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  emptyStateMessage?: string;
}

function getStatusClasses(status: AuditLogEntry["status"]) {
  return status === "SUCCESS"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
}

function formatTarget(log: AuditLogEntry) {
  if (log.entityLabel) {
    return log.entityLabel;
  }

  if (log.entityType && log.entityId) {
    return `${log.entityType} ${log.entityId}`;
  }

  return log.entityType || log.entityId || "n/a";
}

export function AuditLogTable({
  logs,
  emptyStateMessage = "No audit logs found.",
}: AuditLogTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[1200px] text-left border-collapse">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="p-4 font-bold text-sm">TIME</th>
            <th className="p-4 font-bold text-sm">ACTION</th>
            <th className="p-4 font-bold text-sm">ACTOR</th>
            <th className="p-4 font-bold text-sm">TARGET</th>
            <th className="p-4 font-bold text-sm">STATUS</th>
            <th className="p-4 font-bold text-sm">DETAILS</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-10 text-center text-muted-foreground">
                {emptyStateMessage}
              </td>
            </tr>
          ) : (
            logs.map((log) => {
              const metadataText =
                log.metadata && Object.keys(log.metadata as Record<string, unknown>).length > 0
                  ? JSON.stringify(log.metadata, null, 2)
                  : null;

              return (
                <tr
                  key={log.id}
                  className="border-b border-border align-top hover:bg-muted/40 transition-colors"
                >
                  <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                    <div>{format(new Date(log.createdAt), "dd-MM-yyyy")}</div>
                    <div className="font-mono text-xs">
                      {format(new Date(log.createdAt), "HH:mm:ss")}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-foreground">{log.action}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {log.category.replace(/_/g, " ")}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-foreground">
                      {log.actorName || "Unknown actor"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(log.actorRole || "unknown").toLowerCase()}
                      {log.actorLoginId ? ` • ${log.actorLoginId}` : ""}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-foreground">{formatTarget(log)}</div>
                    <div className="text-xs text-muted-foreground">
                      {log.entityType || "unknown"}
                      {log.entityId ? ` • ${log.entityId}` : ""}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusClasses(log.status)}`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="p-4 max-w-[460px]">
                    <div className="space-y-2">
                      <div className="text-sm text-foreground">{log.summary}</div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          <span className="font-semibold text-foreground">Request:</span>{" "}
                          <span className="font-mono">{log.requestId}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">Source:</span> {log.source}
                          {log.path ? ` • ${log.path}` : ""}
                          {log.durationMs != null ? ` • ${log.durationMs}ms` : ""}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground">IP:</span>{" "}
                          {log.ipAddress || "unknown"}
                        </div>
                      </div>
                      <details className="group rounded-md border border-border bg-muted/20">
                        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-teal-700 dark:text-teal-300">
                          View canonical line
                        </summary>
                        <div className="px-3 pb-3 space-y-3">
                          <pre className="whitespace-pre-wrap break-all rounded-md bg-slate-950 p-3 text-[11px] text-slate-100">
                            {log.canonicalLine}
                          </pre>
                          {metadataText && (
                            <pre className="whitespace-pre-wrap break-all rounded-md bg-background p-3 text-[11px] text-foreground border border-border">
                              {metadataText}
                            </pre>
                          )}
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
