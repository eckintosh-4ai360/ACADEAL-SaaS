"use client";

import { format } from "date-fns";

interface LogEntry {
  id: number;
  userId: string;
  userName: string;
  role: string;
  action: string;
  ipAddress: string | null;
  createdAt: Date;
}

interface ActivityLogTableProps {
  logs: LogEntry[];
}

export function ActivityLogTable({ logs }: ActivityLogTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="p-4 font-bold text-sm">USER_ID</th>
            <th className="p-4 font-bold text-sm">USER_NAME</th>
            <th className="p-4 font-bold text-sm">POSITION</th>
            <th className="p-4 font-bold text-sm">IP_ADDRESS</th>
            <th className="p-4 font-bold text-sm">ACTIVITY</th>
            <th className="p-4 font-bold text-sm">DATE_TIME</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-10 text-center text-muted-foreground">
                No activity logs found.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="p-4 font-mono text-xs text-muted-foreground">
                  {log.userId.slice(0, 8)}
                </td>
                <td className="p-4">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {log.userName.toUpperCase()}
                  </span>
                </td>
                <td className="p-4">
                  <span className="capitalize text-muted-foreground text-sm">
                    {log.role.toLowerCase()}
                  </span>
                </td>
                <td className="p-4 font-mono text-sm">
                  {log.ipAddress || "0.0.0.0"}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    log.action === "Login" 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {format(new Date(log.createdAt), "dd-MM-yyyy HH:mm:ssa")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
