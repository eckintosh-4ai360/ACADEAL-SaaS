"use client";

import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Trophy, Loader2 } from "lucide-react";
import {
  getStudentPerformanceHistory,
  type StudentTermPerformance,
} from "@/lib/actions/reportCardActions";

const LINE_COLOR = "#4f46e5";

function getOrdinalSuffix(n: number) {
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

interface StudentPerformanceTrendChartProps {
  studentId: string;
  title?: string;
}

export default function StudentPerformanceTrendChart({
  studentId,
  title = "Class Position Trend",
}: StudentPerformanceTrendChartProps) {
  const [history, setHistory] = useState<StudentTermPerformance[] | null>(null);
  const loading = history === null;

  useEffect(() => {
    let active = true;
    getStudentPerformanceHistory(studentId).then((res) => {
      if (!active) return;
      setHistory(res.success && res.data ? res.data : []);
    });
    return () => {
      active = false;
    };
  }, [studentId]);

  const scored = (history ?? []).filter((h) => h.position !== null);

  const chartData = scored.map((h) => ({
    label: `${h.term} '${h.academicYear.slice(-2)}`,
    term: h.term,
    academicYear: h.academicYear,
    className: h.className,
    position: h.position as number,
    positionLabel: h.positionLabel,
    classSize: h.classSize,
    average: h.average,
  }));

  const maxPosition = Math.max(1, ...chartData.map((d) => d.classSize || d.position));
  const latest = chartData[chartData.length - 1];
  const previous = chartData[chartData.length - 2];
  const delta = latest && previous ? previous.position - latest.position : 0;

  return (
    <Card className="border shadow-xl rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          {latest && (
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              {delta > 0 && <TrendingUp className="w-4 h-4 text-emerald-600" />}
              {delta < 0 && <TrendingDown className="w-4 h-4 text-red-600" />}
              {delta === 0 && previous && <Minus className="w-4 h-4 text-muted-foreground" />}
              <span>
                {latest.positionLabel}
                {latest.classSize ? ` of ${latest.classSize}` : ""}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="h-[260px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground text-center">
            <Trophy className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm italic">
              No ranked report cards yet. Class position will appear here once an
              end-of-term report card is saved and ranked.
            </p>
          </div>
        ) : (
          <>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    reversed
                    allowDecimals={false}
                    domain={[1, maxPosition]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickFormatter={(v: number) => getOrdinalSuffix(v)}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      padding: "12px",
                    }}
                    cursor={{ stroke: "#e2e8f0", strokeWidth: 2 }}
                    formatter={(_value, _name, item) => {
                      const d = item.payload as (typeof chartData)[number];
                      return [
                        `${d.positionLabel}${d.classSize ? ` of ${d.classSize}` : ""}${
                          d.average !== null && d.average !== undefined ? ` · ${d.average}% avg` : ""
                        }`,
                        `${d.term}, ${d.academicYear}`,
                      ];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="position"
                    stroke={LINE_COLOR}
                    strokeWidth={3}
                    strokeLinecap="round"
                    dot={{ r: 5, fill: LINE_COLOR, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7, strokeWidth: 0 }}
                    animationDuration={1200}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto mt-4 border-t pt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-muted-foreground">
                    <th className="py-1.5 pr-4">Term</th>
                    <th className="py-1.5 pr-4">Class</th>
                    <th className="py-1.5 pr-4">Position</th>
                    <th className="py-1.5 pr-4">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {chartData.map((d, i) => (
                    <tr key={`${d.term}-${d.academicYear}-${i}`}>
                      <td className="py-1.5 pr-4 font-medium">
                        {d.term} <span className="text-muted-foreground">{d.academicYear}</span>
                      </td>
                      <td className="py-1.5 pr-4">{d.className}</td>
                      <td className="py-1.5 pr-4 font-bold text-primary">
                        {d.positionLabel}
                        {d.classSize ? <span className="text-muted-foreground font-normal"> / {d.classSize}</span> : null}
                      </td>
                      <td className="py-1.5 pr-4">{d.average !== null && d.average !== undefined ? `${d.average}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
