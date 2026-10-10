import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  LineChart,
  Minus,
  School,
  Users,
  UserCog,
} from "lucide-react";
import {
  ClassPerformanceMetric,
  InsightPriority,
  PerformanceStatus,
  SubjectPerformanceMetric,
  TeacherPerformanceMetric,
  TrendSummary,
  getSchoolAnalyticsSummary,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

const getPriorityStyles = (priority: InsightPriority) => {
  if (priority === "high") return "bg-red-50 text-red-700 border-red-200";
  if (priority === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
};

const getStatusStyles = (status: PerformanceStatus) => {
  if (status === "Excellent") return "bg-emerald-100 text-emerald-700 border-emerald-300";
  if (status === "Stable") return "bg-blue-100 text-blue-700 border-blue-300";
  if (status === "Watch") return "bg-amber-100 text-amber-700 border-amber-300";
  return "bg-red-100 text-red-700 border-red-300";
};

const renderTrend = (trend: TrendSummary) => {
  if (trend.direction === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
        <ArrowUpRight className="w-3 h-3" />
        {Math.abs(trend.delta)}%
      </span>
    );
  }
  if (trend.direction === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 font-medium">
        <ArrowDownRight className="w-3 h-3" />
        {Math.abs(trend.delta)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-gray-500 font-medium">
      <Minus className="w-3 h-3" />
      {Math.abs(trend.delta)}%
    </span>
  );
};

const scoreBarColor = (score: number) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-blue-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
};

const ClassTable = ({ classMetrics }: { classMetrics: ClassPerformanceMetric[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <School className="w-5 h-5 text-indigo-600" />
        Class Performance Matrix
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3">Class</th>
              <th className="p-3">Students</th>
              <th className="p-3">Avg Score</th>
              <th className="p-3">Pass Rate</th>
              <th className="p-3">Attendance</th>
              <th className="p-3">Health</th>
              <th className="p-3">Consistency</th>
              <th className="p-3">Trend</th>
              <th className="p-3">Focus</th>
            </tr>
          </thead>
          <tbody>
            {classMetrics.map((metric) => (
              <tr key={metric.classId} className="border-b align-top hover:bg-muted/50 transition-colors">
                <td className="p-3 min-w-[180px]">
                  <div className="font-semibold">{metric.className}</div>
                  <div className="text-xs text-muted-foreground">Grade {metric.gradeLevel}</div>
                  <div className="mt-2">
                    <Badge className={`border ${getStatusStyles(metric.status)}`}>{metric.status}</Badge>
                  </div>
                </td>
                <td className="p-3">{metric.studentsCount}</td>
                <td className="p-3">{metric.averageScore}%</td>
                <td className="p-3">{metric.passRate}%</td>
                <td className="p-3">{metric.attendanceRate}%</td>
                <td className="p-3 min-w-[140px]">
                  <div className="font-semibold">{metric.healthScore}%</div>
                  <div className="w-full h-2 bg-gray-200 rounded mt-2">
                    <div
                      className={`h-2 rounded ${scoreBarColor(metric.healthScore)}`}
                      style={{ width: `${metric.healthScore}%` }}
                    />
                  </div>
                </td>
                <td className="p-3 min-w-[140px]">
                  <div className="font-semibold">{metric.consistencyScore}%</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Coverage {metric.coverageScore}%
                  </div>
                </td>
                <td className="p-3">{renderTrend(metric.trend)}</td>
                <td className="p-3 min-w-[220px]">
                  <div className="text-xs text-muted-foreground leading-5">
                    {metric.focusAreas.join(", ")}
                  </div>
                  <div className="mt-2 text-xs font-medium">{metric.recommendation}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

const TeacherTable = ({ teacherMetrics }: { teacherMetrics: TeacherPerformanceMetric[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <UserCog className="w-5 h-5 text-violet-600" />
        Teacher Performance Matrix
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3">Teacher</th>
              <th className="p-3">Subjects</th>
              <th className="p-3">Classes</th>
              <th className="p-3">Avg Score</th>
              <th className="p-3">Pass Rate</th>
              <th className="p-3">Effectiveness</th>
              <th className="p-3">Consistency</th>
              <th className="p-3">Trend</th>
              <th className="p-3">Guidance</th>
            </tr>
          </thead>
          <tbody>
            {teacherMetrics.map((metric) => (
              <tr key={metric.teacherId} className="border-b align-top hover:bg-muted/50 transition-colors">
                <td className="p-3 min-w-[180px]">
                  <div className="font-semibold">{metric.teacherName}</div>
                  <div className="text-xs text-muted-foreground">
                    {metric.studentsReached} students reached
                  </div>
                  <div className="mt-2">
                    <Badge className={`border ${getStatusStyles(metric.status)}`}>{metric.status}</Badge>
                  </div>
                </td>
                <td className="p-3 min-w-[180px]">
                  <div className="text-xs text-muted-foreground">{metric.subjectsHandled.join(", ") || "-"}</div>
                </td>
                <td className="p-3">{metric.classesHandled}</td>
                <td className="p-3">{metric.averageScore}%</td>
                <td className="p-3">{metric.passRate}%</td>
                <td className="p-3 min-w-[150px]">
                  <div className="font-semibold">{metric.effectivenessScore}%</div>
                  <div className="w-full h-2 bg-gray-200 rounded mt-2">
                    <div
                      className={`h-2 rounded ${scoreBarColor(metric.effectivenessScore)}`}
                      style={{ width: `${metric.effectivenessScore}%` }}
                    />
                  </div>
                </td>
                <td className="p-3">{metric.consistencyScore}%</td>
                <td className="p-3">{renderTrend(metric.trend)}</td>
                <td className="p-3 min-w-[240px]">
                  <div className="text-xs text-muted-foreground leading-5">
                    Areas: {metric.developmentAreas.join(", ")}
                  </div>
                  <div className="mt-2 text-xs font-medium">{metric.recommendation}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

const SubjectTable = ({ subjectMetrics }: { subjectMetrics: SubjectPerformanceMetric[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <LineChart className="w-5 h-5 text-sky-600" />
        Subject Performance Matrix
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3">Subject</th>
              <th className="p-3">Classes</th>
              <th className="p-3">Teachers</th>
              <th className="p-3">Avg Score</th>
              <th className="p-3">Pass Rate</th>
              <th className="p-3">Attendance</th>
              <th className="p-3">Consistency</th>
              <th className="p-3">Index</th>
              <th className="p-3">Trend</th>
              <th className="p-3">Guidance</th>
            </tr>
          </thead>
          <tbody>
            {subjectMetrics.map((metric) => (
              <tr key={metric.subjectId} className="border-b align-top hover:bg-muted/50 transition-colors">
                <td className="p-3 min-w-[180px]">
                  <div className="font-semibold">{metric.subjectName}</div>
                  <div className="mt-2">
                    <Badge className={`border ${getStatusStyles(metric.status)}`}>{metric.status}</Badge>
                  </div>
                </td>
                <td className="p-3">{metric.classesCovered}</td>
                <td className="p-3">{metric.teachersCount}</td>
                <td className="p-3">{metric.averageScore}%</td>
                <td className="p-3">{metric.passRate}%</td>
                <td className="p-3">{metric.attendanceAlignment}%</td>
                <td className="p-3">{metric.consistencyScore}%</td>
                <td className="p-3 min-w-[140px]">
                  <div className="font-semibold">{metric.performanceIndex}%</div>
                  <div className="w-full h-2 bg-gray-200 rounded mt-2">
                    <div
                      className={`h-2 rounded ${scoreBarColor(metric.performanceIndex)}`}
                      style={{ width: `${metric.performanceIndex}%` }}
                    />
                  </div>
                </td>
                <td className="p-3">{renderTrend(metric.trend)}</td>
                <td className="p-3 min-w-[260px]">
                  <div className="text-xs text-muted-foreground leading-5">
                    Risks: {metric.riskFactors.join(", ")}
                  </div>
                  <div className="mt-2 text-xs font-medium">{metric.recommendation}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole =
    typeof (session.user as { role?: unknown }).role === "string"
      ? (session.user as { role: string }).role
      : "student";

  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  const analytics = await getSchoolAnalyticsSummary();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">School Analytics & Decision Support</h1>
          <p className="text-muted-foreground mt-1">
            Data-driven tracking of class and teacher performance with actionable intelligence.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Last generated: {format(analytics.generatedAt, "MMM dd, yyyy HH:mm")}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Overall Average Score</p>
              <LineChart className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{analytics.kpis.overallAverageScore}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Overall Pass Rate</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{analytics.kpis.overallPassRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Attendance Health</p>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{analytics.kpis.overallAttendanceRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Assessment Volume</p>
              <BarChart3 className="w-4 h-4 text-violet-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{analytics.kpis.totalAssessments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Classes At Risk</p>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{analytics.kpis.classesAtRisk}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Teachers Needing Support</p>
              <UserCog className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{analytics.kpis.teachersNeedingSupport}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Subjects Needing Support</p>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{analytics.kpis.subjectsNeedingSupport}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Improving Classes</p>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-bold mt-2">{analytics.kpis.improvingClasses}</p>
          </CardContent>
        </Card>
      </div>

      <AnalyticsCharts
        classMetrics={analytics.classMetrics}
        subjectMetrics={analytics.subjectMetrics}
        teacherMetrics={analytics.teacherMetrics}
      />

      <Card>
        <CardHeader>
          <CardTitle>Strategic Insights</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">No insights available yet. Add more academic and attendance data.</p>
          ) : (
            <div className="space-y-3">
              {analytics.insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`border rounded-lg p-4 ${getPriorityStyles(insight.priority)}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{insight.title}</p>
                    <Badge className="border bg-white/60 text-current uppercase">
                      {insight.priority}
                    </Badge>
                  </div>
                  <p className="text-sm mt-1">{insight.detail}</p>
                  <p className="text-sm mt-2 font-medium">Action: {insight.recommendedAction}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SubjectTable subjectMetrics={analytics.subjectMetrics} />
      <ClassTable classMetrics={analytics.classMetrics} />
      <TeacherTable teacherMetrics={analytics.teacherMetrics} />
    </div>
  );
}
