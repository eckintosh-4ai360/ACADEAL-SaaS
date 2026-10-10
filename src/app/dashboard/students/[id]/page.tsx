import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, Mail, Phone, MapPin, Calendar, Heart, Users, 
  CheckCircle, XCircle, MessageSquare,
  FileText, Activity, Award, AlertCircle, GraduationCap,
  TrendingUp, BarChart3,
  Banknote, LayoutDashboard
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import StudentPerformanceTrendChart from "@/components/StudentPerformanceTrendChart";
import { getSystemSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function formatCurrency(amount: number, currency: string) {
  // Always output Ghana Cedis symbol explicitly per user requirement
  return `GH₵${amount.toFixed(2)}`;
}

export default async function Student360Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // ── Role guard: only admin and teacher may view student profiles ──
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as { role?: string } | undefined)?.role || "student";
  if (userRole === "student" || userRole === "parent") {
    redirect("/dashboard");
  }

  const [student, settings] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: {
        class: true,
        grade: true,
        parent: true,
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
          take: 10,
        },
        fees: {
          orderBy: { dueDate: "asc" },
        },
        behaviors: {
          orderBy: { date: "desc" },
          take: 5,
        },
        medicalInfo: true,
        documents: {
          orderBy: { createdAt: "desc" },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    }),
    getSystemSettings(),
  ]);

  //* Fetch weekly lessons for the student's class
  const studentData = student;
  const lessons = studentData ? await prisma.lesson.findMany({
    where: { classId: studentData.classId },
    include: {
      subject: true,
      teacher: true,
    },
    orderBy: { startTime: "asc" },
  }) : [];

  if (!student) {
    notFound();
  }

  //* Group lessons by day
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  const groupedByDay = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.day]) acc[lesson.day] = [];
    acc[lesson.day].push(lesson);
    return acc;
  }, {} as Record<string, typeof lessons>);



  //* Calculate statistics
  const totalAttendances = student.attendances.length;
  const presentCount = student.attendances.filter(a => a.present).length;
  const attendanceRate = totalAttendances > 0 ? (presentCount / totalAttendances) * 100 : 0;

  const averageScore = student.results.length > 0
    ? student.results.reduce((sum, r) => sum + r.score, 0) / student.results.length
    : 0;

  const totalFees = student.fees.reduce((sum, f) => sum + f.amount, 0);
  const paidFees = student.fees.filter(f => f.status === "PAID").reduce((sum, f) => sum + f.amount, 0);
  const pendingFees = totalFees - paidFees;

  const positiveBehaviors = student.behaviors.filter(b => b.type === "POSITIVE").length;
  const negativeBehaviors = student.behaviors.filter(b => b.type === "NEGATIVE").length;

  return (
    <div className="space-y-6 pb-8">
      {/* ! Student Info */}
      <div className="bg-gradient-to-r from-gray-600 to-gray-900 text-white rounded-xl p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl font-bold border-4 border-white/30 overflow-hidden relative">
              {student.img ? (
                <Image
                  src={student.img}
                  alt={`${student.name} ${student.surname}`}
                  fill
                  className="object-cover"
                />
              ) : (
                <>{student.name.charAt(0)}{student.surname.charAt(0)}</>
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold">{student.name} {student.surname}</h1>
              <p className="text-blue-100 mt-1 text-lg">Student ID: {student.studentId || "PENDING"}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                  Grade {student.grade.level}
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                  {student.class.name}
                </span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                  {student.sex}
                </span>
              </div>
            </div>
          </div>
          <Link href="/dashboard/students">
            <Button variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
              Back to Students
            </Button>
          </Link>
        </div>
      </div>

      {/* ! Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardMetricCard
          title="Attendance Rate"
          value={`${attendanceRate.toFixed(1)}%`}
          description="Present classes recorded across the most recent attendance log."
          icon={CheckCircle}
          tone="emerald"
          badge="Attendance"
          detail={`${presentCount} of ${totalAttendances} classes`}
        />

        <DashboardMetricCard
          title="Average Score"
          value={`${averageScore.toFixed(1)}%`}
          description="Average performance across the latest recorded assessments."
          icon={TrendingUp}
          tone="sky"
          badge="Performance"
          detail={`${student.results.length} assessments`}
        />

        <DashboardMetricCard
          title="Pending Fees"
          value={formatCurrency(pendingFees, settings.currency)}
          description="Outstanding fee balance still due on the student account."
          icon={Banknote}
          tone="amber"
          badge="Billing"
          detail={`${formatCurrency(paidFees, settings.currency)} paid`}
          valueClassName="text-2xl sm:text-[2rem]"
        />

        <DashboardMetricCard
          title="Behavior Score"
          value={`+${positiveBehaviors} / -${negativeBehaviors}`}
          description="Quick read on positive recognition versus conduct issues."
          icon={Award}
          tone="violet"
          badge="Conduct"
          detail="Positive / Negative"
          valueClassName="text-2xl sm:text-[2rem]"
        />
      </div>

      {/* ! Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* * Left Column - Student Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* ! General Information */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center text-lg">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                General Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Date of Birth</p>
                    <p className="font-medium">{format(new Date(student.birthday), "MMM dd, yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Gender</p>
                    <p className="font-medium">{student.sex}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Heart className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Blood Type</p>
                    <p className="font-medium">{student.bloodType}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <GraduationCap className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Enrollment</p>
                    <p className="font-medium">
                      {student.enrollmentDate 
                        ? format(new Date(student.enrollmentDate), "MMM dd, yyyy")
                        : format(new Date(student.createdAt), "MMM dd, yyyy")
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ! Contact Information */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center text-lg">
                <Phone className="w-5 h-5 mr-2 text-green-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Mail className="w-4 h-4 mr-3 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium break-all">{student.email || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="w-4 h-4 mr-3 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium">{student.phone || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 mr-3 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="font-medium">{student.address || "Not provided"}</p>
                  </div>
                </div>
                {student.emergencyContact && (
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 mr-3 text-red-500 mt-1" />
                    <div>
                      <p className="text-xs text-red-500 font-semibold">Emergency Contact</p>
                      <p className="font-medium text-red-600">{student.emergencyContact}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ! Family Information */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center text-lg">
                <Users className="w-5 h-5 mr-2 text-orange-600" />
                Family Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Parent/Guardian</p>
                  <p className="font-medium text-lg">{student.parent?.name || "No Parent"} {student.parent?.surname || ""}</p>
                </div>
                <div className="flex items-start">
                  <Mail className="w-4 h-4 mr-3 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Parent Email</p>
                    <p className="font-medium">{student.parent?.email || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="w-4 h-4 mr-3 text-gray-400 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Parent Phone</p>
                    <p className="font-medium">{student.parent?.phone || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ! Medical Information */}
          {student.medicalInfo && (
            <Card className="hover:shadow-lg transition-shadow border-red-200">
            <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="flex items-center text-lg">
                  <Activity className="w-5 h-5 mr-2 text-red-600" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {student.medicalInfo.allergies && (
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">Allergies</p>
                      <p className="text-sm text-red-600">{student.medicalInfo.allergies}</p>
                    </div>
                  )}
                  {student.medicalInfo.conditions && (
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">Medical Conditions</p>
                      <p className="text-sm">{student.medicalInfo.conditions}</p>
                    </div>
                  )}
                  {student.medicalInfo.medications && (
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">Current Medications</p>
                      <p className="text-sm">{student.medicalInfo.medications}</p>
                    </div>
                  )}
                  {student.medicalInfo.emergencyContact && (
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">Emergency Contact</p>
                      <p className="text-sm">{student.medicalInfo.emergencyContact}</p>
                      <p className="text-sm text-gray-600">{student.medicalInfo.emergencyPhone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* * Right Column - Activity & Performance */}
        <div className="lg:col-span-2 space-y-6">
          {/* ! Recent Attendance */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center text-lg">
                  <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Attendance
                </span>
                <span className="text-sm font-normal text-gray-500">Last 10 classes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {student.attendances.slice(0, 10).map((attendance) => (
                  <div
                    key={attendance.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      attendance.present
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <div className="flex items-center">
                      {attendance.present ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mr-3" />
                      )}
                      <div>
                        <p className="font-medium">
                          {attendance.present ? "Present" : "Absent"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(attendance.date), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {student.attendances.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No attendance records yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ! Academic Performance */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center text-lg">
                  <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                  Academic Performance
                </span>
                <span className="text-sm font-normal text-gray-500">Recent grades</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {student.results.map((result) => {
                  const subjectName = result.exam?.lesson.subject.name || result.assignment?.lesson.subject.name;
                  const title = result.exam?.title || result.assignment?.title;
                  const scoreColor = result.score >= 80 ? "text-green-600" : result.score >= 60 ? "text-blue-600" : "text-red-600";
                  
                  return (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div>
                        <p className="font-semibold">{title}</p>
                        <p className="text-sm text-gray-600">{subjectName}</p>
                      </div>
                      <div className={`text-2xl font-bold ${scoreColor}`}>
                        {result.score}%
                      </div>
                    </div>
                  );
                })}
                {student.results.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No grades recorded yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ! Class Position Trend */}
          <StudentPerformanceTrendChart studentId={student.id} title="Class Position Over Time" />

          {/* * Fees & Payments */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center text-lg">
                  <Banknote className="w-5 h-5 mr-2 text-orange-600" />
                  Fees & Payments
                </span>
                <Link href="/dashboard/fees">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {student.fees.map((fee) => (
                  <div
                    key={fee.id}
                    className={`p-4 rounded-lg border ${
                      fee.status === "PAID"
                        ? "bg-green-50 border-green-200"
                        : fee.status === "OVERDUE"
                        ? "bg-red-50 border-red-200"
                        : "bg-orange-50 border-orange-200"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{fee.title}</p>
                        <p className="text-sm text-gray-600">
                          Due: {format(new Date(fee.dueDate), "MMM dd, yyyy")}
                        </p>
                        {fee.description && (
                          <p className="text-sm text-gray-500 mt-1">{fee.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xl">GH₵{fee.amount.toFixed(2)}</p>
                        <span
                          className={`text-xs px-3 py-1 rounded-full ${
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
                {student.fees.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No fees recorded</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ! Behavior Records */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center text-lg">
                  <Award className="w-5 h-5 mr-2 text-indigo-600" />
                  Behavior Records
                </span>
                <span className="text-sm font-normal text-gray-500">Recent activities</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {student.behaviors.map((behavior) => (
                  <div
                    key={behavior.id}
                    className={`p-4 rounded-lg border ${
                      behavior.type === "POSITIVE"
                        ? "bg-green-50 border-green-200"
                        : behavior.type === "NEGATIVE"
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{behavior.title}</p>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              behavior.severity === "CRITICAL"
                                ? "bg-red-100 text-red-700"
                                : behavior.severity === "HIGH"
                                ? "bg-orange-100 text-orange-700"
                                : behavior.severity === "MEDIUM"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {behavior.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{behavior.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {format(new Date(behavior.date), "MMM dd, yyyy")} • Reported by {behavior.reportedBy}
                        </p>
                        {behavior.actionTaken && (
                          <p className="text-sm text-gray-700 mt-2 italic">
                            Action: {behavior.actionTaken}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {student.behaviors.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No behavior records</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* * Comments & Feedback */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="flex items-center text-lg">
                <MessageSquare className="w-5 h-5 mr-2 text-teal-600" />
                Teacher Comments & Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {student.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 rounded-lg bg-muted/20 border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mr-3">
                          {comment.authorName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{comment.authorName}</p>
                          <p className="text-xs text-gray-500">{comment.authorRole} • {comment.category}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {format(new Date(comment.createdAt), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                  </div>
                ))}
                {student.comments.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No comments yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ! Documents */}
          {student.documents.length > 0 && (
            <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="flex items-center text-lg">
                  <FileText className="w-5 h-5 mr-2 text-gray-600" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {student.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-blue-600 mr-3" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-xs text-gray-500">{doc.type} • {format(new Date(doc.createdAt), "MMM dd, yyyy")}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ! Weekly Schedule */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle className="flex items-center text-lg">
            <LayoutDashboard className="w-5 h-5 mr-2 text-blue-600" />
            Weekly Class Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {lessons.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No lessons scheduled for {student.class.name} yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              {days.map((day) => (
                <div key={day}>
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary/80 mb-3 pb-2 border-b">{day}</h3>
                  <div className="space-y-2">
                    {groupedByDay[day]?.map((lesson) => (
                      <div key={lesson.id} className="p-3 bg-muted/20 border border-border/30 rounded-xl text-sm hover:border-primary/50 transition-all">
                        <div className="font-bold text-foreground leading-tight">{lesson.name}</div>
                        <div className="text-[10px] text-primary font-semibold mt-1">{lesson.subject.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {lesson.teacher.name} {lesson.teacher.surname}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-2 font-medium">
                          ⏱ {format(new Date(lesson.startTime), "HH:mm")} – {format(new Date(lesson.endTime), "HH:mm")}
                        </div>
                      </div>
                    )) || (
                      <div className="text-xs text-muted-foreground text-center py-6 italic opacity-40">Free</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ! Quick Actions Footer */}
      <Card className="bg-muted/20 border-2 border-dashed border-border">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center">
              <MessageSquare className="w-6 h-6 mb-2" />
              Send Message
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center">
              <Award className="w-6 h-6 mb-2" />
              Add Behavior
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center">
              <Banknote className="w-6 h-6 mb-2" />
              Add Fee
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center">
              <FileText className="w-6 h-6 mb-2" />
              Upload Document
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

