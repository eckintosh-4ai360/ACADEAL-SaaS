import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, GraduationCap, BookOpen, Calendar, AlertCircle, 
  TrendingUp, CheckCircle, Award, MessageSquare, FileText,
  Activity, BarChart3, UserCheck, Clock,
  Banknote, ArrowRight, User, Sparkles
} from "lucide-react";
import prisma from "@/lib/prisma";
import { format, subDays } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { getSystemSettings } from "@/lib/settings";
import EnrollmentChart from "@/components/EnrollmentChart";
import { RefreshButton } from "@/components/RefreshButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PerformanceChart from "@/components/PerformanceChart";
import StudentPerformanceTrendChart from "@/components/StudentPerformanceTrendChart";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { sortClassesByGrade } from "@/lib/class-management";
import { isPlatformRequest } from "@/lib/platformAccess";
import { BirthdayAlerts } from "@/components/BirthdayAlerts";
import { ensureBirthdayNotifications, getTodaysBirthdays } from "@/lib/birthdays";
import { getActiveStudentWhere } from "@/lib/active-students";

//* Force dynamic rendering to prevent static build errors when using auth/headers
export const dynamic = "force-dynamic";

type DashboardSessionUser = {
  name?: string | null;
  role?: string;
  username?: string;
  adminRole?: string;
};

function formatCurrency(amount: number) {
  // Always output Ghana Cedis symbol
  return `GH₵${amount.toFixed(2)}`;
}

export default async function DashboardPage() {
  let session: Session | null;
  
  try {
    session = await getServerSession(authOptions);
  } catch (error: unknown) {
    const authError = error as {
      code?: string;
      message?: string;
      name?: string;
    };

    console.error("Session error:", error);
    if (authError.message?.includes("decryption") || 
        authError.message?.includes("JWT") || 
        authError.code === "ERR_JWE_DECRYPTION_FAILED" ||
        authError.name === "JWEDecryptionFailed") {
      console.log("JWT decryption error - redirecting to clear-session");
      redirect("/clear-session");
    }
    redirect("/login");
  }

  if (!session || !session.user) {
    redirect("/login");
  }

  const sessionUser = session.user as DashboardSessionUser;
  const userRole = sessionUser.role || "student";
  const username = sessionUser.username;

  if (
    userRole === "admin" &&
    sessionUser.adminRole === "SUPER_ADMIN" &&
    (await isPlatformRequest())
  ) {
    redirect("/dashboard/platform/schools");
  }

  //* Fetch system settings for colors
  const systemSettings = await getSystemSettings();

  const canViewBirthdayAlerts = userRole === "admin" || userRole === "teacher";
  const birthdayCelebrants = canViewBirthdayAlerts
    ? await getTodaysBirthdays()
    : [];

  // Create the bell/notification-centre alerts once a day. This does not send
  // SMS automatically; an administrator explicitly chooses each SMS below.
  if (canViewBirthdayAlerts) {
    await ensureBirthdayNotifications(birthdayCelebrants);
  }

  //* Fetch comprehensive statistics
  const activeStudentWhere = await getActiveStudentWhere();

  const [
    totalStudents,
    totalTeachers,
    totalAdmins,
    totalParents,
    studentsData,
    recentEvents,
    recentAnnouncements,
    classesEnrollment,
  ] = await Promise.all([
    prisma.student.count({ where: activeStudentWhere }),
    prisma.teacher.count(),
    prisma.admin.count(),
    prisma.parent.count(),
    prisma.student.findMany({
      where: activeStudentWhere,
      include: {
        attendances: {
          where: {
            date: {
              gte: subDays(new Date(), 30),
            },
          },
        },
      },
    }),
    prisma.event.findMany({
      where: {
        startTime: {
          gte: new Date(),
        },
      },
      include: {
        class: true,
      },
      orderBy: {
        startTime: "asc",
      },
      take: 3,
    }),
    prisma.announcement.findMany({
      include: {
        class: true,
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
    }),
    prisma.class.findMany({
      include: {
        students: { where: activeStudentWhere },
        grade: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const orderedClassesEnrollment = sortClassesByGrade(
    classesEnrollment,
    classesEnrollment.map((classItem) => classItem.grade)
  );
  const totalStaff = totalTeachers + totalAdmins;

  //* Calculate attendance statistics for display on stat cards
  const totalAttendances = studentsData.reduce((sum, s) => sum + s.attendances.length, 0);
  const presentCount = studentsData.reduce(
    (sum, s) => sum + s.attendances.filter((a) => a.present).length,
    0
  );
  const attendanceRate = totalAttendances > 0 ? (presentCount / totalAttendances) * 100 : 0;

  //* Gender distribution
  const maleCount = studentsData.filter((s) => s.sex === "MALE").length;
  const femaleCount = studentsData.filter((s) => s.sex === "FEMALE").length;
  const femaleArcLength = totalStudents > 0 ? (femaleCount / totalStudents) * 251.2 : 0;
  const maleArcLength = totalStudents > 0 ? (maleCount / totalStudents) * 251.2 : 0;

  //* Fetch student fees if user is a student
  let studentFees = null;
  let studentData = null;
  if (userRole === "student" && username) {
    studentData = await prisma.student.findUnique({
      where: { username },
      include: {
        fees: {
          orderBy: { dueDate: "asc" },
          take: 5,
        },
        attendances: {
          orderBy: { date: "desc" },
          take: 10,
        },
        results: {
          include: {
            exam: { include: { lesson: { include: { subject: true } } } },
            assignment: { include: { lesson: { include: { subject: true } } } },
          },
          orderBy: { id: "desc" },
          take: 5,
        },
        class: true,
        grade: true,
      },
    });
    studentFees = studentData?.fees || [];
  }

  //* Fetch parent data if user is a parent
  let parentData = null;
  if (userRole === "parent" && username) {
    parentData = await prisma.parent.findUnique({
      where: { username },
      include: {
        students: {
          include: {
            class: true,
            grade: true,
            fees: {
              orderBy: { dueDate: "asc" },
              where: { status: { in: ["PENDING", "OVERDUE"] } }
            },
            attendances: {
              orderBy: { date: "desc" },
              take: 5,
            },
            results: {
               include: {
                exam: { include: { lesson: { include: { subject: true } } } },
                assignment: { include: { lesson: { include: { subject: true } } } },
               },
               orderBy: { id: "desc" },
               take: 3
            },
            behaviors: {
              orderBy: { date: "desc" },
              take: 3
            }
          }
        }
      }
    });
  }

  //* Admin/Teacher Dashboard
  if (userRole === "admin" || userRole === "teacher") {
    return (
      <div className="space-y-6">
        {/* ! Welcome Header */}
        <div 
          className="text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl"
          style={{
            background: `linear-gradient(to right, ${systemSettings.primaryColor}, ${systemSettings.secondaryColor})`
          }}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">
                Hello {session?.user?.name}
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-blue-100 mb-2">
                You are logged in as a {userRole === "admin" ? "Administrator" : "Teacher"}
              </p>
              <p className="text-blue-100 text-sm sm:text-base md:text-lg mb-3 sm:mb-4">
                Here&apos;s what&apos;s happening in your school today.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-full flex items-center text-xs sm:text-sm">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="whitespace-nowrap">{format(new Date(), "MMM dd, yyyy")}</span>
                </div>
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-full flex items-center text-xs sm:text-sm">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="whitespace-nowrap">Academic Year {systemSettings.academicYear}</span>
                </div>
              </div>
            </div>
            <RefreshButton />
          </div>
        </div>

        {/* ! Main Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/dashboard/students" className="block">
            <DashboardMetricCard
              title="Total Students"
              value={totalStudents.toString()}
              description="Active enrollments"
              icon={GraduationCap}
              tone="sky"
              badge="Enrollment"
              interactive
            />
          </Link>

          <Link href="/dashboard/staff" className="block">
            <DashboardMetricCard
              title="Total Staff"
              value={totalStaff.toString()}
              description="Teaching and admin teams"
              icon={Users}
              tone="emerald"
              badge="People"
              interactive
            />
          </Link>

          <Link href="/dashboard/parents" className="block">
            <DashboardMetricCard
              title="Total Parents"
              value={totalParents.toString()}
              description="Registered parents"
              icon={UserCheck}
              tone="violet"
              badge="Guardians"
              interactive
            />
          </Link>

          <Link href="/dashboard/attendance" className="block">
            <DashboardMetricCard
              title="Attendance Rate"
              value={`${attendanceRate.toFixed(1)}%`}
              description="Present this week"
              icon={CheckCircle}
              tone="amber"
              badge="30 Days"
              interactive
            />
          </Link>
        </div>

        <BirthdayAlerts
          celebrants={birthdayCelebrants}
          canSendSms={userRole === "admin"}
        />

        {/* * Charts and Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* * Students by Gender Chart */}
          <Card className="hover:shadow-xl transition-shadow lg:col-span-1">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                Students by Gender
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64">
                <div className="relative w-64 h-64">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {/* * Female segment */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="20"
                      strokeDasharray={`${femaleArcLength} 251.2`}
                      strokeDashoffset="0"
                    />
                    {/* * Male segment */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="20"
                      strokeDasharray={`${maleArcLength} 251.2`}
                      strokeDashoffset={`-${femaleArcLength}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{totalStudents}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex items-center justify-center p-4 bg-primary/10 rounded-lg">
                  <div className="w-4 h-4 bg-muted/300 rounded-full mr-2"></div>
                  <div>
                    <p className="text-sm font-semibold">Male</p>
                    <p className="text-2xl font-bold text-blue-600">{maleCount}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center p-4 bg-accent/10 rounded-lg">
                  <div className="w-4 h-4 bg-muted/300 rounded-full mr-2"></div>
                  <div>
                    <p className="text-sm font-semibold">Female</p>
                    <p className="text-2xl font-bold ">{femaleCount}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ! Class Enrollment Chart */}
          <Card className="hover:shadow-xl transition-shadow lg:col-span-2 flex flex-col">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                Enrollment Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col">
              <div className="flex-1" style={{ minHeight: '350px' }}>
                <EnrollmentChart classes={orderedClassesEnrollment} />
              </div>
              <div className="mt-6 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/20 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium">Total Classes</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{orderedClassesEnrollment.length}</p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground font-medium">Total Enrolled</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">{totalStudents}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* * Notice Board and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ! Recent Announcements */}
          <Card className="hover:shadow-xl transition-shadow">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-yellow-600" />
                  Notice Board
                </span>
                <Link href="/dashboard/announcements">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {recentAnnouncements.slice(0, 4).map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-4 rounded-lg bg-muted/20 border border-border hover:bg-muted/30 transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-lg">{announcement.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(announcement.date), "MMM dd")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{announcement.description}</p>
                    {announcement.class && (
                      <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {announcement.class.name}
                      </span>
                    )}
                  </div>
                ))}
                {recentAnnouncements.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No announcements yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ! Upcoming Events */}
          <Card className="hover:shadow-xl transition-shadow">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                  Upcoming Events
                </span>
                <Link href="/dashboard/events">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/40 transition-all shadow-sm"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex flex-col items-center justify-center text-white">
                        <span className="text-2xl font-bold">
                          {format(new Date(event.startTime), "dd")}
                        </span>
                        <span className="text-xs">
                          {format(new Date(event.startTime), "MMM")}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{event.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.startTime), "h:mm a")} -{" "}
                            {format(new Date(event.endTime), "h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {recentEvents.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No upcoming events</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ! Quick Add Section */}
        <Card className="bg-muted/20 border-2 border-dashed border-border hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <h3 className="text-xl font-bold mb-6 text-center">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <Link href="/dashboard/students">
                <Button variant="outline" className="h-24 w-full flex flex-col items-center justify-center hover:bg-muted/50 hover:border-blue-300 transition-all">
                  <GraduationCap className="w-8 h-8 mb-2 text-blue-600" />
                  <span className="text-sm font-medium">Add Student</span>
                </Button>
              </Link>
              <Link href="/dashboard/staff">
                <Button variant="outline" className="h-24 w-full flex flex-col items-center justify-center hover:bg-muted/50 hover:border-green-300 transition-all">
                  <Users className="w-8 h-8 mb-2 text-green-600" />
                  <span className="text-sm font-medium">Staff &amp; HR</span>
                </Button>
              </Link>
              <Link href="/dashboard/classes">
                <Button variant="outline" className="h-24 w-full flex flex-col items-center justify-center hover:bg-muted/50 hover:border-purple-300 transition-all">
                  <BookOpen className="w-8 h-8 mb-2 text-purple-600" />
                  <span className="text-sm font-medium">Add Class</span>
                </Button>
              </Link>
              <Link href="/dashboard/events">
                <Button variant="outline" className="h-24 w-full flex flex-col items-center justify-center hover:bg-muted/50 hover:border-orange-300 transition-all">
                  <Calendar className="w-8 h-8 mb-2 text-orange-600" />
                  <span className="text-sm font-medium">Add Event</span>
                </Button>
              </Link>
              <Link href="/dashboard/announcements">
                <Button variant="outline" className="h-24 w-full flex flex-col items-center justify-center hover:bg-muted/50 hover:border-yellow-300 transition-all">
                  <MessageSquare className="w-8 h-8 mb-2 text-yellow-600" />
                  <span className="text-sm font-medium">Add Notice</span>
                </Button>
              </Link>
              <Link href="/dashboard/fees">
                <Button variant="outline" className="h-24 w-full flex flex-col items-center justify-center hover:bg-muted/50 hover:border-pink-300 transition-all">
                  <Banknote className="w-8 h-8 mb-2 text-pink-600" />
                  <span className="text-sm font-medium">Add Fee</span>
                </Button>
              </Link>
              <Link href="/dashboard/acadeal-ai">
                <Button variant="outline" className="h-24 w-full flex flex-col items-center justify-center hover:bg-muted/50 hover:border-indigo-300 transition-all">
                  <Sparkles className="w-8 h-8 mb-2 text-indigo-600" />
                  <span className="text-sm font-medium">Acadeal AI</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  //* Student Dashboard
  if (userRole === "student" && studentData) {
    const feeStats = studentFees ? {
      total: studentFees.reduce((sum, fee) => sum + fee.amount, 0),
      pending: studentFees.filter(f => f.status === "PENDING").length,
      overdue: studentFees.filter(f => f.status === "OVERDUE").length,
    } : null;

    const studentAttendanceRate = studentData.attendances.length > 0
      ? (studentData.attendances.filter(a => a.present).length / studentData.attendances.length) * 100
      : 0;

    const averageScore = studentData.results.length > 0
      ? studentData.results.reduce((sum, r) => sum + r.score, 0) / studentData.results.length
      : 0;

    return (
      <div className="space-y-6">
        {/* ! Student Welcome Header */}
        <div 
          className="text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl"
          style={{
            background: `linear-gradient(to right, ${systemSettings.primaryColor}, ${systemSettings.secondaryColor})`
          }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="text-blue-100 text-sm sm:text-base md:text-lg mb-3 sm:mb-4">
            Grade {studentData.grade.level} • {studentData.class.name}
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-full flex items-center text-xs sm:text-sm">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="whitespace-nowrap">{format(new Date(), "MMM dd, yyyy")}</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-full flex items-center text-xs sm:text-sm">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="whitespace-nowrap">Academic Year {systemSettings.academicYear}</span>
            </div>
          </div>
        </div>

        {/* ! Student Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardMetricCard
            title="Attendance Rate"
            value={`${studentAttendanceRate.toFixed(1)}%`}
            description="Presence recorded across your most recent attendance entries."
            icon={CheckCircle}
            tone="emerald"
            badge="Attendance"
            detail={`${studentData.attendances.filter(a => a.present).length} of ${studentData.attendances.length}`}
          />

          <DashboardMetricCard
            title="Average Score"
            value={`${averageScore.toFixed(1)}%`}
            description="Average result across your latest graded assessments."
            icon={TrendingUp}
            tone="sky"
            badge="Performance"
            detail={`${studentData.results.length} assessments`}
          />

          <Link href="/dashboard/fees?status=PENDING" className="block">
            <DashboardMetricCard
              title="Pending Payments"
              value={`${feeStats?.pending ?? 0} Bills`}
              description="Open fee items that are still awaiting payment."
              icon={AlertCircle}
              tone="amber"
              badge="Billing"
              detail={formatCurrency(feeStats?.total || 0)}
              interactive
            />
          </Link>

          <Link href="/dashboard/fees?status=OVERDUE" className="block">
            <DashboardMetricCard
              title="Overdue"
              value={`${feeStats?.overdue ?? 0} Bills`}
              description="Fee records that have passed their due date and need attention."
              icon={AlertCircle}
              tone="rose"
              badge="Urgent"
              detail="Requires follow-up"
              interactive
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ! My Fees */}
          {studentFees && studentFees.length > 0 && (
            <Card className="hover:shadow-xl transition-shadow">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Banknote className="w-5 h-5 mr-2 text-orange-600" />
                    My Fees & Bills
                  </span>
                  <Link href="/dashboard/fees">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {studentFees.map((fee) => (
                    <div
                      key={fee.id}
                      className={`p-4 rounded-lg border ${
                        fee.status === "PAID"
                          ? "bg-gray border-green-200"
                          : fee.status === "OVERDUE"
                          ? "bg-gray border-red-200"
                          : "bg-gray border-orange-200"
                      }`}
                    >
                      <div className="flex justify-between  items-start">
                        <div>
                          <p className="font-semibold">{fee.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {format(new Date(fee.dueDate), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">GH₵{fee.amount.toFixed(2)}</p>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              fee.status === "PAID"
                                ? "bg-green-100 text-green-700"
                                : fee.status === "OVERDUE"
                                ? "bg-red-100 text-red-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {fee.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ! Recent Grades */}
          <Card className="hover:shadow-xl transition-shadow">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-purple-600" />
                  Recent Grades
                </span>
                <Link href="/dashboard/results">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {studentData.results.map((result) => {
                  const subjectName = result.exam?.lesson.subject.name || result.assignment?.lesson.subject.name;
                  const title = result.exam?.title || result.assignment?.title;
                  const scoreColor = result.score >= 80 ? "text-green-600" : result.score >= 60 ? "text-blue-600" : "text-red-600";
                  
                  return (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border"
                    >
                      <div>
                        <p className="font-semibold">{title}</p>
                        <p className="text-sm text-muted-foreground">{subjectName}</p>
                      </div>
                      <div className={`text-2xl font-bold ${scoreColor}`}>
                        {result.score}%
                      </div>
                    </div>
                  );
                })}
                {studentData.results.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No grades yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ! Class Position Trend */}
          <div className="lg:col-span-2">
            <StudentPerformanceTrendChart studentId={studentData.id} title="My Class Position Over Time" />
          </div>

          {/* ! Upcoming Events */}
          <Card className="hover:shadow-xl transition-shadow lg:col-span-2">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentEvents.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg bg-muted/20 border border-border"
                  >
                    <div className="flex items-start space-x-3">
                      <Calendar className="w-5 h-5 text-blue-500 mt-1" />
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(event.startTime), "MMM dd, h:mm a")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {recentEvents.length === 0 && (
                  <p className="text-muted-foreground text-center py-8 col-span-2">No upcoming events</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  //* Parent Dashboard
  if (userRole === "parent" && parentData) {
    return (
      <div className="space-y-8 pb-12">
        {/* ! Enhanced Welcome Header */}
        <div 
          className="relative overflow-hidden rounded-3xl p-8 md:p-10 shadow-2xl text-white"
          style={{
            background: `linear-gradient(135deg, ${systemSettings.primaryColor}, ${systemSettings.secondaryColor})`
          }}
        >
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                      Welcome back, {session?.user?.name}!
                    </h1>
                    <p className="text-white/90 font-medium mt-1">
                      {format(new Date(), "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <p className="text-white/80 text-sm md:text-base mt-3 max-w-2xl">
                  Monitor your {parentData.students.length === 1 ? "child's" : "children's"} academic progress, attendance, and school activities all in one place.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <RefreshButton />
                <Link href="/dashboard/messages">
                  <Button variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Messages
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* ! Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -ml-48 -mb-48" />
        </div>

        {/* ! Children Management Section */}
        {parentData.students.length > 0 ? (
          <div className="space-y-8">
            {/* ! Student Profile Cards */}
            <div>
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                <GraduationCap className="w-7 h-7 text-primary" />
                Your {parentData.students.length === 1 ? "Child" : "Children"}
              </h2>
              
              <Tabs defaultValue={parentData.students[0].id} className="w-full">
                <TabsList className="grid w-full gap-4 bg-transparent h-auto p-0 mb-8" style={{
                  gridTemplateColumns: `repeat(${Math.min(parentData.students.length, 3)}, 1fr)`
                }}>
                  {parentData.students.map((student) => {
                    const attendanceRate = student.attendances.length > 0 
                      ? (student.attendances.filter(a => a.present).length / student.attendances.length) * 100 
                      : 0;
                    const avgScore = student.results.length > 0
                      ? student.results.reduce((acc, r) => acc + r.score, 0) / student.results.length
                      : 0;
                    
                    return (
                      <TabsTrigger 
                        key={student.id} 
                        value={student.id}
                        className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:border-2 data-[state=inactive]:border-border rounded-2xl p-6 h-auto shadow-md hover:shadow-xl transition-all duration-300"
                      >
                        <div className="flex flex-col items-center gap-3 w-full">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                            {student.name.charAt(0)}{student.surname.charAt(0)}
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-lg">{student.name} {student.surname}</p>
                            <p className="text-xs opacity-70 mt-1">Grade {student.grade.level} • {student.class.name}</p>
                          </div>
                          <div className="flex gap-4 mt-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              <span>{attendanceRate.toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              <span>{avgScore.toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {parentData.students.map((student) => {
                  const attendanceRate = student.attendances.length > 0 
                    ? (student.attendances.filter(a => a.present).length / student.attendances.length) * 100 
                    : 0;
                  
                  const avgScore = student.results.length > 0
                    ? student.results.reduce((acc, r) => acc + r.score, 0) / student.results.length
                    : 0;

                  const pendingFeesAmount = student.fees.reduce((sum, fee) => sum + fee.amount, 0);

                  const chartData = student.results.slice().reverse().map(r => ({
                    name: r.exam?.lesson.subject.name || r.assignment?.lesson.subject.name || "Subject",
                    score: r.score,
                    fullMark: 100
                  }));

                  return (
                    <TabsContent key={student.id} value={student.id} className="space-y-8 animate-in fade-in duration-500 outline-none">
                      {/* ! Stats Dashboard */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <DashboardMetricCard
                          title="Attendance"
                          value={`${attendanceRate.toFixed(1)}%`}
                          description="Recent attendance trend for the selected child."
                          icon={CheckCircle}
                          tone="emerald"
                          badge="Presence"
                          detail={`${student.attendances.filter(a => a.present).length} days present`}
                        />

                        <DashboardMetricCard
                          title="Average Score"
                          value={`${avgScore.toFixed(1)}%`}
                          description="Average result across the most recent assessments."
                          icon={Award}
                          tone="sky"
                          badge="Performance"
                          detail={`${student.results.length} assessments`}
                        />

                        {/* ! Fees Card */}
                        <Card className={`relative overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 group`}>
                          <div className={`absolute inset-0 bg-gradient-to-br ${pendingFeesAmount > 0 ? "from-red-500 to-rose-600" : "from-emerald-500 to-teal-600"} opacity-90`} />
                          <CardContent className="relative z-10 p-6 text-white">
                            <div className="flex items-start justify-between mb-4">
                              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Banknote className="w-6 h-6" />
                              </div>
                              <div className="text-right">
                                <div className="text-4xl font-black">₵{pendingFeesAmount.toLocaleString()}</div>
                                <p className="text-xs text-white/80 mt-1">Fees Due</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-white/90">{pendingFeesAmount > 0 ? "Outstanding" : "All Paid"}</span>
                              <AlertCircle className="w-4 h-4" />
                            </div>
                          </CardContent>
                        </Card>

                        {/* ! Class Info Card */}
                        <Card className="relative overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 group">
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-90" />
                          <CardContent className="relative z-10 p-6 text-white">
                            <div className="flex items-start justify-between mb-4">
                              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <BookOpen className="w-6 h-6" />
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-black">{student.class.name}</div>
                                <p className="text-xs text-white/80 mt-1">Current Class</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-white/90">Grade {student.grade.level}</span>
                              <GraduationCap className="w-4 h-4" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* ! Main Content Grid */}
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* * Left Column - Performance & Results */}
                        <div className="xl:col-span-2 space-y-8">
                          {/* ! Performance Chart */}
                          <Card className="border shadow-xl rounded-2xl overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-2xl font-black flex items-center gap-2">
                                  <BarChart3 className="w-6 h-6 text-primary" />
                                  Performance Overview
                                </CardTitle>
                                <Badge variant="outline" className="text-xs">
                                  Last {chartData.length} Results
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="p-6">
                              {chartData.length > 0 ? (
                                <div className="h-[300px]">
                                  <PerformanceChart data={chartData} />
                                </div>
                              ) : (
                                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                                  <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                                  <p className="text-sm italic">No performance data available yet</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* ! Class Position Trend */}
                          <StudentPerformanceTrendChart studentId={student.id} title="Class Position Over Time" />

                          {/* ! Recent Results */}
                          <Card className="border shadow-xl rounded-2xl overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-xl font-black flex items-center gap-2">
                                  <Award className="w-5 h-5 text-primary" />
                                  Recent Results
                                </CardTitle>
                                <Link href={`/dashboard/results?studentId=${student.id}`}>
                                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                                    View All
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                  </Button>
                                </Link>
                              </div>
                            </CardHeader>
                            <CardContent className="p-6">
                              {student.results.length > 0 ? (
                                <div className="space-y-3">
                                  {student.results.map((result) => (
                                    <div 
                                      key={result.id} 
                                      className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border hover:border-primary/50 transition-all"
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                                          result.score >= 70 ? "bg-green-100 text-green-700" : 
                                          result.score >= 50 ? "bg-orange-100 text-orange-700" : 
                                          "bg-red-100 text-red-700"
                                        }`}>
                                          {result.score}%
                                        </div>
                                        <div>
                                          <p className="font-bold">{result.exam?.title || result.assignment?.title}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {result.exam?.lesson.subject.name || result.assignment?.lesson.subject.name}
                                          </p>
                                        </div>
                                      </div>
                                      <Badge variant={result.score >= 70 ? "default" : result.score >= 50 ? "secondary" : "destructive"}>
                                        {result.score >= 70 ? "Excellent" : result.score >= 50 ? "Good" : "Needs Work"}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="py-12 text-center text-muted-foreground">
                                  <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                  <p className="text-sm italic">No results available yet</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>

                        {/* * Right Column - Attendance & Behavior */}
                        <div className="space-y-8">
                          {/* ! Attendance Log */}
                          <Card className="border shadow-xl rounded-2xl overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                              <CardTitle className="text-lg font-black flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                Attendance Log
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                              {student.attendances.length > 0 ? (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                  {student.attendances.map((record) => (
                                    <div 
                                      key={record.id} 
                                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${record.present ? "bg-green-500" : "bg-red-500"}`} />
                                        <span className="text-sm font-medium">
                                          {format(new Date(record.date), "MMM d, yyyy")}
                                        </span>
                                      </div>
                                      <Badge 
                                        variant={record.present ? "outline" : "destructive"}
                                        className="text-xs"
                                      >
                                        {record.present ? "Present" : "Absent"}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="py-12 text-center text-muted-foreground">
                                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                  <p className="text-sm italic">No attendance records</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* * Behavior & Conduct */}
                          <Card className="border shadow-xl rounded-2xl overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                              <CardTitle className="text-lg font-black flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" />
                                Conduct & Behavior
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                              {student.behaviors.length > 0 ? (
                                <div className="space-y-3">
                                  {student.behaviors.map((bx) => (
                                    <div 
                                      key={bx.id} 
                                      className="flex gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors"
                                    >
                                      <div className={`mt-1 w-3 h-3 rounded-full shrink-0 ${
                                        bx.type === "POSITIVE" ? "bg-green-500" : 
                                        bx.type === "NEGATIVE" ? "bg-red-500" : 
                                        "bg-gray-400"
                                      }`} />
                                      <div className="flex-1">
                                        <p className="text-sm font-bold">{bx.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {format(new Date(bx.date), "MMM d, yyyy")}
                                        </p>
                                      </div>
                                      <Badge 
                                        variant={bx.type === "POSITIVE" ? "default" : "destructive"}
                                        className="text-xs h-fit"
                                      >
                                        {bx.type === "POSITIVE" ? "+" : "-"}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="py-12 text-center text-muted-foreground">
                                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                  <p className="text-sm italic">No behavior reports</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* ! Quick Actions Bar */}
                      <Card className="border shadow-xl rounded-2xl overflow-hidden bg-gradient-to-r from-primary/5 to-primary/10">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            Quick Actions
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            <Link href="/dashboard/messages" className="block">
                              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-white transition-all">
                                <MessageSquare className="w-5 h-5" />
                                <span className="text-xs font-semibold">Contact Teacher</span>
                              </Button>
                            </Link>
                            <Link href={`/dashboard/results?studentId=${student.id}`} className="block">
                              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-white transition-all">
                                <FileText className="w-5 h-5" />
                                <span className="text-xs font-semibold">View Reports</span>
                              </Button>
                            </Link>
                            <Link href="/dashboard/fees" className="block">
                              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-white transition-all">
                                <Banknote className="w-5 h-5" />
                                <span className="text-xs font-semibold">Pay Fees</span>
                              </Button>
                            </Link>
                            <Link href="/dashboard/academics" className="block">
                              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-white transition-all">
                                <BookOpen className="w-5 h-5" />
                                <span className="text-xs font-semibold">Academics</span>
                              </Button>
                            </Link>
                            <Link href="/dashboard/events" className="block">
                              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-white transition-all">
                                <Calendar className="w-5 h-5" />
                                <span className="text-xs font-semibold">View Events</span>
                              </Button>
                            </Link>
                            <Link href="/dashboard/acadeal-ai" className="block">
                              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-white transition-all">
                                <Sparkles className="w-5 h-5" />
                                <span className="text-xs font-semibold">Acadeal AI</span>
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          </div>
        ) : (
          <Card className="border-2 border-dashed rounded-3xl overflow-hidden">
            <CardContent className="py-20 text-center">
              <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center mb-6">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-3xl font-black mb-3">No Students Linked</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Please contact the school office to associate your children&apos;s profiles with your parent account.
              </p>
              <Link href="/dashboard/messages">
                <Button size="lg" className="rounded-xl">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contact School Office
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  //* Default fallback
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome back, {session?.user?.name}!</h1>
      <p className="text-muted-foreground">Your dashboard is loading...</p>
    </div>
  );
}
