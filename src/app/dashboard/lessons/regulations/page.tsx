import { format } from "date-fns";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Landmark,
  Download,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Calendar,
  FileText,
  ShieldCheck,
  User,
} from "lucide-react";

import { AddExamRegulationButton } from "@/components/forms/AddExamRegulationButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  canAccessLessonMaterialKind,
  canManageLessonMaterialKind,
  formatFileSize,
  getLessonMaterialDownloadUrl,
} from "@/lib/utils";

type RegulationDocumentRecord = {
  id: number;
  title: string;
  description: string;
  fileName: string;
  fileSizeBytes: number;
  uploadedByName: string;
  updatedAt: Date;
};

type RegulationDocumentDelegate = {
  findMany: (args: { orderBy: { updatedAt: "desc" }[] }) => Promise<RegulationDocumentRecord[]>;
};

function getRegulationDocumentDelegate(): RegulationDocumentDelegate | null {
  const client = prisma as unknown as {
    examRegulationDocument?: RegulationDocumentDelegate;
  };

  return client.examRegulationDocument || null;
}

function isMissingRegulationsTable(error: unknown): boolean {
  const prismaError = error as {
    code?: string;
    meta?: { modelName?: string };
    message?: string;
  };

  if (prismaError?.code === "P2021") {
    return true;
  }

  const modelName = prismaError?.meta?.modelName || "";
  const message = prismaError?.message || "";

  return (
    modelName.includes("ExamRegulationDocument") ||
    message.includes("ExamRegulationDocument")
  );
}

//* Sample exam regulations data
const examRules = [
  {
    id: 1,
    title: "Arrival and Entry",
    rules: [
      "Students must arrive at least 15 minutes before the exam start time",
      "Late arrivals (up to 30 minutes) may be admitted at the discretion of the supervisor",
      "No entry is permitted after 30 minutes from the start of the examination",
      "Valid student ID must be presented upon entry",
    ],
  },
  {
    id: 2,
    title: "Permitted Materials",
    rules: [
      "Only approved calculators are allowed (see approved calculator list)",
      "Pencils, pens, erasers, and rulers are permitted",
      "Formula sheets must be provided by the school (no personal notes)",
      "Water bottles must be clear and label-free",
    ],
  },
  {
    id: 3,
    title: "Prohibited Items",
    rules: [
      "Mobile phones and electronic devices (must be turned off and stored)",
      "Smart watches and fitness trackers",
      "Books, notes, or unauthorized reference materials",
      "Communication with other students during the exam",
    ],
  },
  {
    id: 4,
    title: "During the Examination",
    rules: [
      "Silence must be maintained at all times",
      "Raise your hand if you need assistance from a supervisor",
      "No student may leave during the first 30 minutes or last 15 minutes",
      "All answers must be written in the designated answer booklet",
    ],
  },
];

const importantDates = [
  {
    id: 1,
    event: "Mid-Term Examinations",
    dateRange: "March 15-22, 2024",
    status: "upcoming",
  },
  {
    id: 2,
    event: "Final Examinations",
    dateRange: "June 10-24, 2024",
    status: "upcoming",
  },
  {
    id: 3,
    event: "Exam Timetable Release",
    dateRange: "February 28, 2024",
    status: "completed",
  },
  {
    id: 4,
    event: "Special Accommodation Requests Deadline",
    dateRange: "March 1, 2024",
    status: "upcoming",
  },
];

const faqs = [
  {
    question: "What should I do if I feel unwell during an exam?",
    answer: "Raise your hand immediately to notify the exam supervisor. They will assist you and document the situation. You may be eligible for special consideration.",
  },
  {
    question: "Can I use a bathroom during the examination?",
    answer: "Yes, but you must be accompanied by a supervisor. You will not be given extra time for bathroom breaks, so plan accordingly.",
  },
  {
    question: "What happens if I'm caught cheating?",
    answer: "Academic dishonesty is taken very seriously. Penalties range from a zero on the exam to expulsion, depending on the severity of the violation.",
  },
  {
    question: "How do I request special accommodations?",
    answer: "Students requiring special accommodations (extra time, separate room, etc.) must submit a request through the Student Services office at least two weeks before the exam date.",
  },
];

export default async function ExamRegulationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!canAccessLessonMaterialKind(session.user.role, "regulations")) {
    redirect("/dashboard");
  }

  const canManage = canManageLessonMaterialKind(session.user.role, "regulations");
  const backHref = "/dashboard/academics/necessities";

  const regulationsDelegate = getRegulationDocumentDelegate();
  let regulationsFeatureReady = Boolean(regulationsDelegate);

  if (!regulationsFeatureReady) {
    console.warn(
      "Prisma ExamRegulationDocument model not found in client. Run the migration, regenerate Prisma, and restart the dev server."
    );
  }

  let documents: RegulationDocumentRecord[] = [];

  if (regulationsDelegate) {
    try {
      documents = await regulationsDelegate.findMany({
        orderBy: [{ updatedAt: "desc" }],
      });
    } catch (error) {
      if (isMissingRegulationsTable(error)) {
        regulationsFeatureReady = false;
        console.warn(
          "ExamRegulationDocument table not found. Run the Prisma migration, regenerate Prisma, and restart the dev server."
        );
      } else {
        throw error;
      }
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="w-fit gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        
        <div className="border-b pb-6 border-border/50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                <Landmark className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-black tracking-tight text-foreground">Exam Regulations</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  Official rules, downloadable forms, and policy documents for examinations.
                </p>
              </div>
            </div>
            {canManage && regulationsFeatureReady && <AddExamRegulationButton />}
          </div>
        </div>
      </div>

      <Card className="border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            Important Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {importantDates.map((date) => (
              <div key={date.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-3">
                  {date.status === "completed" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  )}
                  <div>
                    <p className="font-semibold">{date.event}</p>
                    <p className="text-sm text-muted-foreground">{date.dateRange}</p>
                  </div>
                </div>
                <Badge variant={date.status === "completed" ? "secondary" : "default"}>
                  {date.status === "completed" ? "Completed" : "Upcoming"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Examination Rules & Procedures</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {examRules.map((section) => (
            <Card key={section.id} className="hover:shadow-lg transition-all duration-300">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {section.rules.map((rule, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border border-border/60 bg-muted/10 px-4 py-4"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold text-foreground">
                <span className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <span>{faq.question}</span>
                </span>
                <span className="text-lg leading-none text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pl-7 pt-3 text-sm leading-6 text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-600" />
            Official Documents
          </h2>
          <Badge variant="outline" className="w-fit">
            {documents.length} file{documents.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-lg transition-all duration-300 border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-base font-bold">{doc.title}</CardTitle>
                      <CardDescription className="mt-2 text-sm">
                        {doc.description}
                      </CardDescription>
                    </div>
                    <div className="rounded-xl bg-orange-100 p-2 text-orange-600 dark:bg-orange-950/40">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      <span>{doc.uploadedByName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Updated {format(new Date(doc.updatedAt), "yyyy-MM-dd")}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatFileSize(doc.fileSizeBytes)}
                    </span>
                    <Button asChild size="sm" className="gap-2">
                      <a
                        href={getLessonMaterialDownloadUrl(
                          "regulations",
                          doc.id,
                          doc.fileName
                        )}
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-2 border-dashed py-12 text-center">
            <CardContent className="space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                <FileText className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <CardTitle className="text-muted-foreground">
                No official regulation documents have been uploaded yet.
              </CardTitle>
              <CardDescription>
                {!regulationsFeatureReady
                  ? "This feature is waiting for the new database schema. Run the Prisma migration, regenerate the client, and restart the app."
                  : canManage
                    ? "Upload the first PDF so students, teachers, and parents can download it here."
                    : "Check back later for published exam policies and forms."}
              </CardDescription>
              {canManage && regulationsFeatureReady && (
                <div className="flex justify-center pt-2">
                  <AddExamRegulationButton />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Academic Integrity Warning
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200">
                All students are expected to maintain the highest standards of academic integrity. 
                Any form of cheating, plagiarism, or unauthorized collaboration will result in serious 
                consequences including potential expulsion. Familiarize yourself with the academic 
                integrity policy before taking any examination.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
