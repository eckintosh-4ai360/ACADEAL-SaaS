"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ClassPerformanceMetric,
  SubjectPerformanceMetric,
  TeacherPerformanceMetric,
} from "@/lib/analytics";

interface AnalyticsChartsProps {
  classMetrics: ClassPerformanceMetric[];
  subjectMetrics: SubjectPerformanceMetric[];
  teacherMetrics: TeacherPerformanceMetric[];
}

const palette = {
  health: "#4f46e5",
  passRate: "#0ea5e9",
  attendance: "#10b981",
  effectiveness: "#8b5cf6",
  neutral: "#94a3b8",
};

const statusColors: Record<string, string> = {
  Excellent: "#10b981",
  Stable: "#3b82f6",
  Watch: "#f59e0b",
  Critical: "#ef4444",
};

const shorten = (value: string, max = 12) => (value.length > max ? `${value.slice(0, max)}...` : value);

export default function AnalyticsCharts({
  classMetrics,
  subjectMetrics,
  teacherMetrics,
}: AnalyticsChartsProps) {
  const classChartData = [...classMetrics]
    .sort((a, b) => b.healthScore - a.healthScore)
    .slice(0, 10)
    .map((metric) => ({
      name: shorten(metric.className),
      fullName: metric.className,
      healthScore: metric.healthScore,
      passRate: metric.passRate,
      attendanceRate: metric.attendanceRate,
    }));

  const teacherChartData = [...teacherMetrics]
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
    .slice(0, 10)
    .map((metric) => ({
      name: shorten(metric.teacherName, 16),
      fullName: metric.teacherName,
      effectivenessScore: metric.effectivenessScore,
      averageScore: metric.averageScore,
    }));

  const classStatusData = ["Excellent", "Stable", "Watch", "Critical"].map((status) => ({
    name: status,
    value: classMetrics.filter((metric) => metric.status === status).length,
  }));

  const teacherStatusData = ["Excellent", "Stable", "Watch", "Critical"].map((status) => ({
    name: status,
    value: teacherMetrics.filter((metric) => metric.status === status).length,
  }));

  const subjectChartData = [...subjectMetrics]
    .sort((a, b) => b.performanceIndex - a.performanceIndex)
    .slice(0, 10)
    .map((metric) => ({
      name: shorten(metric.subjectName, 14),
      fullName: metric.subjectName,
      performanceIndex: metric.performanceIndex,
      averageScore: metric.averageScore,
      passRate: metric.passRate,
    }));

  const trendData = classMetrics
    .slice(0, 12)
    .map((metric) => ({
      name: shorten(metric.className),
      fullName: metric.className,
      delta: metric.trend.delta,
    }))
    .sort((a, b) => b.delta - a.delta);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Class Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={classChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number | string | undefined, key: string | undefined) => [
                    `${Number(value ?? 0).toFixed(1)}%`,
                    key ?? "Value",
                  ]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || String(label)}
                />
                <Legend />
                <Bar dataKey="healthScore" name="Health Score" fill={palette.health} radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="passRate" name="Pass Rate" stroke={palette.passRate} strokeWidth={2.5} />
                <Line
                  type="monotone"
                  dataKey="attendanceRate"
                  name="Attendance"
                  stroke={palette.attendance}
                  strokeWidth={2.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teacher Effectiveness Ranking</CardTitle>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={teacherChartData}
                layout="vertical"
                margin={{ top: 10, right: 25, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number | string | undefined, key: string | undefined) => [
                    `${Number(value ?? 0).toFixed(1)}%`,
                    key ?? "Value",
                  ]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || String(label)}
                />
                <Legend />
                <Bar dataKey="effectivenessScore" name="Effectiveness" fill={palette.effectiveness} radius={[0, 8, 8, 0]} />
                <Bar dataKey="averageScore" name="Avg Score" fill={palette.neutral} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={subjectChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number | string | undefined, key: string | undefined) => [
                    `${Number(value ?? 0).toFixed(1)}%`,
                    key ?? "Value",
                  ]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || String(label)}
                />
                <Legend />
                <Bar
                  dataKey="performanceIndex"
                  name="Performance Index"
                  fill={palette.effectiveness}
                  radius={[6, 6, 0, 0]}
                />
                <Line type="monotone" dataKey="passRate" name="Pass Rate" stroke={palette.passRate} strokeWidth={2.5} />
                <Line type="monotone" dataKey="averageScore" name="Avg Score" stroke={palette.attendance} strokeWidth={2.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[340px]">
            <div className="h-full">
              <p className="text-xs text-muted-foreground mb-2">Classes</p>
              <ResponsiveContainer width="100%" height="92%">
                <PieChart>
                  <Pie data={classStatusData} dataKey="value" nameKey="name" outerRadius={85} label>
                    {classStatusData.map((entry) => (
                      <Cell key={`class-status-${entry.name}`} fill={statusColors[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-full">
              <p className="text-xs text-muted-foreground mb-2">Teachers</p>
              <ResponsiveContainer width="100%" height="92%">
                <PieChart>
                  <Pie data={teacherStatusData} dataKey="value" nameKey="name" outerRadius={85} label>
                    {teacherStatusData.map((entry) => (
                      <Cell key={`teacher-status-${entry.name}`} fill={statusColors[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class Trend Delta (Last 30 vs Previous 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 25, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number | string | undefined) => [
                    `${Number(value ?? 0).toFixed(1)}%`,
                    "Delta",
                  ]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || String(label)}
                />
                <Bar dataKey="delta" radius={[6, 6, 0, 0]}>
                  {trendData.map((entry) => (
                    <Cell
                      key={`trend-cell-${entry.fullName}`}
                      fill={entry.delta >= 0 ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
