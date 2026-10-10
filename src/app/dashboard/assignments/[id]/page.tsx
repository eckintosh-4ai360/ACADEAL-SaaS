import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  Calendar, Clock, Users, BookOpen, FileText, 
  CheckCircle, Upload, AlertTriangle
} from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AddQuestionButton } from "@/components/forms/AddQuestionButton";
import { DeleteAllQuestionsButton } from "@/components/forms/DeleteAllQuestionsButton";
import { QuestionActions } from "@/components/forms/QuestionActions";
import { StudentAssignmentTaking } from "@/components/forms/StudentAssignmentTaking";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { generateAssignmentPlagiarismReport } from "@/lib/ai/plagiarism";

export default async function AssignmentViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role || "student";
  const userId = (session?.user as any)?.id;

  const assignment = await prisma.assignment.findUnique({
    where: { id: parseInt(id) },
    include: {
      lesson: {
        include: {
          subject: true,
          class: true,
          teacher: true,
        },
      },
      questions: {
        include: {
          //! Same ordering fix as the exam page — see comments there.
          options: { orderBy: { id: "asc" } },
          answers: userRole === "student" && userId ? {
            where: { studentId: userId },
          } : false,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
      results: {
        include: {
          student: true,
        },
      },
    },
  });

  if (!assignment) {
    notFound();
  }

  const isOverdue = new Date(assignment.dueDate) < new Date();
  const totalPoints = assignment.questions.reduce((sum, q) => sum + q.points, 0);
  const plagiarismReport =
    userRole === "student" ? null : await generateAssignmentPlagiarismReport(assignment.id);
  
  //* Get student's existing answers if student
  const existingAnswers = userRole === "student" && userId 
    ? assignment.questions.flatMap(q => 
        q.answers.map((a: any) => ({
          questionId: q.id,
          answerText: a.answerText,
          selectedOptionId: a.selectedOptionId,
          isCorrect: a.isCorrect,
          pointsEarned: a.pointsEarned,
        }))
      )
    : [];

  return (
    <div className="space-y-6 pb-8">
      {/* ! Header */}
      <div className="bg-gradient-to-r from-gray-600 to-gray-900 text-white rounded-2xl p-8 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{assignment.title}</h1>
            <p className="text-purple-100 text-lg mb-4">
              {assignment.lesson.subject.name} • {assignment.lesson.class.name}
            </p>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Due: {format(new Date(assignment.dueDate), "MMM dd, yyyy")}</span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span className={isOverdue ? "text-red-200" : ""}>
                  {isOverdue ? "Overdue" : "Upcoming"}
                </span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                <span>{assignment.questions.length} Questions</span>
              </div>
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>{totalPoints} Points</span>
              </div>
            </div>
          </div>
          <Link href="/dashboard/assignments">
            <Button variant="secondary" className="bg-white text-purple-600 hover:bg-purple-50">
              Back to Assignments
            </Button>
          </Link>
        </div>
      </div>

      {/* ! Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <DashboardMetricCard
          title="Submissions"
          value={assignment.results.length.toString()}
          description="Learners who have already submitted work for this assignment."
          icon={Users}
          tone="sky"
          badge="Participation"
          detail="Student responses"
        />

        <DashboardMetricCard
          title="Questions"
          value={assignment.questions.length.toString()}
          description="Question items currently attached to this assignment."
          icon={FileText}
          tone="emerald"
          badge="Assessment"
          detail="Total prompts"
        />

        <DashboardMetricCard
          title="Total Points"
          value={totalPoints.toString()}
          description="Maximum score a student can achieve on this submission."
          icon={CheckCircle}
          tone="amber"
          badge="Scoring"
          detail="Maximum score"
        />

        <DashboardMetricCard
          title="Teacher"
          value={`${assignment.lesson.teacher.name} ${assignment.lesson.teacher.surname}`}
          description="Instructor responsible for creating and publishing the task."
          icon={BookOpen}
          tone="violet"
          badge="Instructor"
          detail={assignment.lesson.subject.name}
          valueClassName="text-xl sm:text-2xl leading-tight"
        />
      </div>

      {/* ! Questions Section */}
      {userRole === "student" ? (
        //* Student view - taking assignment
        assignment.questions.length > 0 ? (
          <StudentAssignmentTaking
            assignmentId={assignment.id}
            questions={assignment.questions.map(q => ({
              id: q.id,
              questionType: q.questionType,
              questionText: q.questionText,
              points: q.points,
              fileUrl: q.fileUrl,
              fileType: q.fileType,
              options: q.options,
            }))}
            studentId={userId}
            existingAnswers={existingAnswers}
          />
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">No questions available yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Your teacher hasn't added questions to this assignment
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        //* Teacher view - managing questions
        <Card>
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40 text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-purple-900/40">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <FileText className="w-6 h-6 mr-3 text-purple-600 dark:text-purple-400" />
                Assignment Questions ({assignment.questions.length})
              </CardTitle>
              {(userRole === "teacher" || userRole === "admin") && (
                <div className="flex items-center gap-2">
                  <DeleteAllQuestionsButton
                    assignmentId={assignment.id}
                    questionCount={assignment.questions.length}
                  />
                  <AddQuestionButton assignmentId={assignment.id} />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {assignment.questions.length > 0 ? (
              <div className="space-y-6">
                {assignment.questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-card hover:border-purple-300 dark:hover:border-purple-800 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center font-bold mr-4 flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  question.questionType === "THEORY"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                    : "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                                }`}
                              >
                                {question.questionType === "THEORY" ? "Theory" : "Multiple Choice"}
                              </span>
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                                {question.points} Points
                              </span>
                            </div>

                            {(userRole === "teacher" || userRole === "admin") && (
                              <QuestionActions
                                assignmentId={assignment.id}
                                question={{
                                  id: question.id,
                                  questionType: question.questionType,
                                  questionText: question.questionText,
                                  points: question.points,
                                  options: question.options,
                                }}
                              />
                            )}
                          </div>
                          <p className="text-gray-900 dark:text-gray-100 text-lg font-medium mb-3">{question.questionText}</p>
                          
                          {/* * File attachment */}
                          {question.fileUrl && (
                            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center">
                              <Upload className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Attachment: </span>
                              <a 
                                href={question.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline ml-2"
                              >
                                View {question.fileType?.toUpperCase()} file
                              </a>
                            </div>
                          )}

                          {/* * Multiple choice options */}
                          {question.questionType === "MULTIPLE_CHOICE" && question.options.length > 0 && (
                            <div className="space-y-2 mt-4">
                              {question.options.map((option, optIndex) => (
                                <div
                                  key={option.id}
                                  className={`p-3 rounded-lg border-2 flex items-center ${
                                    option.isCorrect
                                      ? "bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-800/80"
                                      : "bg-white dark:bg-gray-900/80 border-gray-200 dark:border-gray-800"
                                  }`}
                                >
                                  <div className="w-6 h-6 rounded-full border-2 border-gray-400 dark:border-gray-600 flex items-center justify-center mr-3 flex-shrink-0">
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                      {String.fromCharCode(65 + optIndex)}
                                    </span>
                                  </div>
                                  <span className="text-gray-800 dark:text-gray-200">{option.optionText}</span>
                                  {option.isCorrect && (
                                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 ml-auto" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No questions added yet</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Click "Add Question" to start building this assignment
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ! Submissions Section */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-blue-900/40">
          <CardTitle className="flex items-center text-lg">
            <Users className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />
            Student Submissions ({assignment.results.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {assignment.results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-800">
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300">Student</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300">Score</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300">Grade</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignment.results.map((result) => {
                    const percentage = totalPoints > 0 ? (result.score / totalPoints) * 100 : 0;
                    return (
                      <tr key={result.id} className="border-b dark:border-gray-800 hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-semibold mr-3">
                              {result.student.name.charAt(0)}{result.student.surname.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{result.student.name} {result.student.surname}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">@{result.student.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{result.score}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">/{totalPoints}</span>
                        </td>
                        <td className="p-4">
                          <span className={`text-lg font-bold ${
                            percentage >= 80 ? "text-green-600 dark:text-green-400" :
                            percentage >= 60 ? "text-blue-600 dark:text-blue-400" :
                            percentage >= 40 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400"
                          }`}>
                            {percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300">
                            Submitted
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">No submissions yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Students haven't submitted this assignment
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {userRole !== "student" && plagiarismReport && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-amber-900/40">
            <CardTitle className="flex items-center gap-3 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Plagiarism Checker
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Integrity scan for {plagiarismReport.subjectName} in {plagiarismReport.className}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <DashboardMetricCard
                title="Theory Responses"
                value={plagiarismReport.totalTheoryResponses.toString()}
                description="Eligible long-form answers included in the scan."
                icon={FileText}
                tone="sky"
                badge="Coverage"
              />
              <DashboardMetricCard
                title="Compared Pairs"
                value={plagiarismReport.comparedPairs.toString()}
                description="Student-answer pairs checked for overlap."
                icon={Users}
                tone="violet"
                badge="Pairs"
              />
              <DashboardMetricCard
                title="Flagged Pairs"
                value={plagiarismReport.flaggedPairs.toString()}
                description="Pairs above the suspicious similarity threshold."
                icon={AlertTriangle}
                tone="amber"
                badge="Integrity"
              />
              <DashboardMetricCard
                title="Highest Similarity"
                value={`${(plagiarismReport.highestSimilarity * 100).toFixed(1)}%`}
                description="Strongest overlap detected in this assignment."
                icon={CheckCircle}
                tone="emerald"
                badge="Peak"
              />
            </div>

            {plagiarismReport.matches.length > 0 ? (
              <div className="space-y-4">
                {plagiarismReport.matches.map((match, index) => (
                  <div key={`${match.questionId}-${match.studentA.id}-${match.studentB.id}`} className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-5">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                          Flag {index + 1} • Similarity {(match.similarity * 100).toFixed(1)}%
                        </p>
                        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">{match.questionText}</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {match.sharedPhrases.map((phrase) => (
                          <span
                            key={phrase}
                            className="rounded-full border border-amber-300 dark:border-amber-800 bg-white dark:bg-amber-900/40 px-3 py-1 text-xs text-amber-800 dark:text-amber-200"
                          >
                            {phrase}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{match.studentA.name}</p>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{match.studentA.answer}</p>
                      </div>
                      <div className="rounded-2xl border border-white dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{match.studentB.name}</p>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{match.studentB.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/20 px-5 py-4 text-sm text-emerald-700 dark:text-emerald-300">
                No suspicious overlap was detected across the theory submissions that were long enough to compare.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

