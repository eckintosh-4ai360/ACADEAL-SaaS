import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  BookOpen,
  User,
  Eye,
  Download,
  CalendarDays,
  Megaphone,
  UserCheck,
} from "lucide-react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { EditClassModal } from "@/components/forms/EditClassModal";
import { ClassSubjectTeacherAssignmentsModal } from "@/components/forms/ClassSubjectTeacherAssignmentsModal";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  GRADE_NAMES,
  TIMETABLE_TARGET_GROUP_LABELS,
  getTimetableTargetGroupByGradeLevel,
  normalizeTimetableFileUrl,
  getTimetableDownloadUrl,
} from "@/lib/utils";

export default async function ClassDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const classId = parseInt(id);

  if (isNaN(classId)) {
    notFound();
  }

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      grade: true,
      supervisor: true,
      students: {
        include: {
          parent: true,
        },
        orderBy: { name: "asc" },
      },
      lessons: {
        include: {
          subject: true,
          teacher: true,
        },
        orderBy: { day: "asc" },
      },
      subjectTeacherAssignments: {
        include: {
          subject: true,
          teacher: true,
        },
        orderBy: { subjectId: "asc" },
      },
      _count: {
        select: {
          students: true,
          lessons: true,
          events: true,
          announcements: true,
        },
      },
    },
  });

  if (!classData) {
    notFound();
  }

  const classTargetGroup = getTimetableTargetGroupByGradeLevel(classData.grade.level);

  const [teachers, classTimetables, subjects] = await Promise.all([
    prisma.teacher.findMany({ select: { id: true, name: true, surname: true } }),
    prisma.timetable.findMany({
      where: { targetGroup: classTargetGroup },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        teachers: {
          select: { id: true, name: true, surname: true },
          orderBy: [{ name: "asc" }, { surname: "asc" }],
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const classGradeName = GRADE_NAMES[classData.grade.level] || `Grade ${classData.grade.level}`;
  const subjectTeacherAssignments = [...classData.subjectTeacherAssignments].sort((a, b) =>
    a.subject.name.localeCompare(b.subject.name)
  );

  return (
    <div className="space-y-6">
      {/* ! Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/classes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{classData.name}</h1>
            <p className="text-gray-500 mt-1">{classGradeName} - Class Details</p>
          </div>
        </div>
        <EditClassModal 
          data={classData} 
          teachers={teachers} 
        />
      </div>

      {/* ! Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardMetricCard
          title="Total Students"
          value={`${classData._count.students}/${classData.capacity}`}
          description="Current class occupancy against the approved room capacity."
          icon={Users}
          tone="sky"
          badge="Capacity"
          detail={`${classData.capacity - classData._count.students} open seats`}
          valueClassName="text-2xl sm:text-[2rem]"
        />

        <DashboardMetricCard
          title="Total Lessons"
          value={classData._count.lessons.toString()}
          description="Scheduled lessons currently assigned to this class group."
          icon={BookOpen}
          tone="emerald"
          badge="Weekly Schedule"
          detail="Active timetable"
        />

        <DashboardMetricCard
          title="Events"
          value={classData._count.events.toString()}
          description="Upcoming class-linked activities and calendar items."
          icon={CalendarDays}
          tone="violet"
          badge="Calendar"
          detail="Upcoming items"
        />

        <DashboardMetricCard
          title="Announcements"
          value={classData._count.announcements.toString()}
          description="Recent notices shared specifically with this class."
          icon={Megaphone}
          tone="amber"
          badge="Notice Board"
          detail="Recent updates"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Official Timetables</span>
            <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-full">
              {TIMETABLE_TARGET_GROUP_LABELS[classTargetGroup]}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classTimetables.length === 0 ? (
            <p className="text-sm text-gray-500">No timetable has been posted for this class group yet.</p>
          ) : (
            <div className="space-y-3">
              {classTimetables.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-500">
                      {item.semester} - {item.academicYear}
                    </p>
                  </div>
	                  <div className="flex items-center gap-2">
	                    <a
	                      href={normalizeTimetableFileUrl(item.fileUrl, item.fileType)}
	                      target="_blank"
	                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </a>
	                    <a
	                      href={getTimetableDownloadUrl(item.fileUrl, item.title, item.fileType)}
	                      download={`${
	                        item.title.trim().replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "timetable"
	                      }${item.fileType === "PDF" ? ".pdf" : ""}`}
	                      className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm hover:bg-primary/90"
	                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ! Supervisor Info */}
      {classData.supervisor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Class Supervisor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white overflow-hidden">
                {classData.supervisor.img ? (
                  <Image
                    src={classData.supervisor.img}
                    alt={`${classData.supervisor.name} ${classData.supervisor.surname}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold">
                    {classData.supervisor.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-lg">
                  {classData.supervisor.name} {classData.supervisor.surname}
                </p>
                <p className="text-gray-500 text-sm">{classData.supervisor.email || "No email provided"}</p>
                <p className="text-gray-500 text-sm">{classData.supervisor.phone || "No phone provided"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Subject Teachers
            </CardTitle>
            <ClassSubjectTeacherAssignmentsModal
              classId={classData.id}
              className={classData.name}
              subjects={subjects}
              teachers={teachers}
              assignments={classData.subjectTeacherAssignments.map((assignment) => ({
                subjectId: assignment.subjectId,
                teacherId: assignment.teacherId,
              }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          {subjectTeacherAssignments.length === 0 ? (
            <p className="text-sm text-gray-500">
              No subject teachers assigned for this class yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Subject
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Teacher
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Staff ID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjectTeacherAssignments.map((assignment) => (
                    <tr
                      key={assignment.id}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="py-3 px-4 font-medium">{assignment.subject.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {assignment.teacher.name} {assignment.teacher.surname}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-gray-600">
                        {assignment.teacher.staffId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ! Students List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Students ({classData.students.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Accordion type="single" collapsible className="w-full">
              {classData.students.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No students enrolled in this class yet
                </p>
              ) : (
                classData.students.map((student) => (
                  <AccordionItem key={student.id} value={student.id.toString()}>
                    <AccordionTrigger className="hover:no-underline hover:bg-muted/50 px-4 rounded-md transition-colors">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white overflow-hidden shrink-0">
                          {student.img ? (
                            <Image
                              src={student.img}
                              alt={`${student.name} ${student.surname}`}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-base">
                            {student.name} {student.surname}
                          </p>
                          <p className="text-xs text-gray-500 font-normal">{student.studentId}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/30 p-4 rounded-lg border">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500">Contact Email</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {student.email || "Not provided"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500">Phone Number</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {student.phone || "Not provided"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500">Parent/Guardian</p>
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {student.parent ? `${student.parent.name} ${student.parent.surname}` : "Not assigned"}
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))
              )}
            </Accordion>
          </div>
        </CardContent>
      </Card>

      {/* ! Lessons Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Lessons Schedule ({classData.lessons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Lesson</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Subject</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Teacher</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Day</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                </tr>
              </thead>
              <tbody>
                {classData.lessons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No lessons scheduled for this class yet
                    </td>
                  </tr>
                ) : (
                  classData.lessons.map((lesson) => (
                    <tr key={lesson.id} className="border-b hover:bg-muted/50 transition-colors transition-colors">
                      <td className="py-3 px-4 font-medium">{lesson.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{lesson.subject.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {lesson.teacher.name} {lesson.teacher.surname}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {lesson.day.charAt(0) + lesson.day.slice(1).toLowerCase()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(lesson.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {new Date(lesson.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

