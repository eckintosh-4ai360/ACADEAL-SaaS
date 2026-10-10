import prisma from "@/lib/prisma";
import { GraduationCap, Calendar, Mail, Phone, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isMissingDatabaseColumnError, isMissingDatabaseObjectError } from "@/lib/prisma-errors";

interface OldStudentRow {
  id: string;
  studentId: string;
  name: string;
  surname: string;
  sex?: string | null;
  graduationDate?: Date | string | null;
  originalClass?: string | null;
  originalGrade?: string | null;
  completionYear?: number | null;
  outstandingArrears?: number | null;
  phone?: string | null;
  email?: string | null;
}

export default async function OldStudentsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const page = typeof searchParams?.page === "string" ? Math.max(parseInt(searchParams.page) || 1, 1) : 1;
  const pageSize = 10;
  const search = typeof searchParams?.search === "string" ? searchParams.search.trim() : "";

  // Auto-heal: Ensure table and columns exist in tenant database
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OldStudent" (
        "id" TEXT NOT NULL,
        "username" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "surname" TEXT NOT NULL,
        "otherNames" TEXT,
        "email" TEXT,
        "phone" TEXT,
        "address" TEXT,
        "img" TEXT,
        "bloodType" TEXT,
        "sex" "UserSex" NOT NULL DEFAULT 'MALE',
        "birthday" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "residencyStatus" TEXT NOT NULL DEFAULT 'DAY',
        "house" TEXT,
        "guardianName" TEXT,
        "contactNumber" TEXT,
        "occupation" TEXT,
        "nhisNumber" TEXT,
        "admissionDate" TIMESTAMP(3),
        "graduationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "originalClass" TEXT,
        "originalGrade" TEXT,
        "completionYear" INTEGER,
        "outstandingArrears" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "OldStudent_pkey" PRIMARY KEY ("id")
      );
      ALTER TABLE "OldStudent" ADD COLUMN IF NOT EXISTS "outstandingArrears" DOUBLE PRECISION DEFAULT 0;
    `).catch(() => {});
  } catch {
    // Ignore schema auto-healing errors
  }

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { surname: { contains: search, mode: "insensitive" as const } },
          { studentId: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  let oldStudents: OldStudentRow[] = [];
  let total = 0;
  let fetchError: string | null = null;

  try {
    const [records, count] = await Promise.all([
      prisma.oldStudent.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { graduationDate: "desc" },
      }),
      prisma.oldStudent.count({ where }),
    ]);
    oldStudents = records;
    total = count;
  } catch (err) {
    console.error("Failed to query oldStudent:", err);
    if (isMissingDatabaseColumnError(err)) {
      try {
        // Fallback: query without outstandingArrears
        const [fallbackRecords, fallbackCount] = await Promise.all([
          prisma.oldStudent.findMany({
            where,
            select: {
              id: true,
              studentId: true,
              name: true,
              surname: true,
              sex: true,
              graduationDate: true,
              originalClass: true,
              originalGrade: true,
              completionYear: true,
              phone: true,
              email: true,
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { graduationDate: "desc" },
          }),
          prisma.oldStudent.count({ where }),
        ]);
        oldStudents = fallbackRecords.map((r) => ({
          ...r,
          outstandingArrears: 0,
        }));
        total = fallbackCount;
      } catch (fallbackErr) {
        console.error("Fallback query failed:", fallbackErr);
        fetchError = "Unable to load graduated student records.";
      }
    } else if (isMissingDatabaseObjectError(err)) {
      oldStudents = [];
      total = 0;
    } else {
      fetchError = "An error occurred while fetching old student records.";
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", targetPage.toString());
    return `/dashboard/utilities/old-students?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            Old Students (Alumni)
          </h1>
          <p className="text-gray-500 mt-1">Records of students who have graduated from the institution</p>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Graduated Students</CardTitle>
              <CardDescription>A total of {total} student{total === 1 ? "" : "s"} have graduated</CardDescription>
            </div>
            <div className="w-full md:w-72">
              <SearchBar placeholder="Search by name or ID..." className="w-full" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Graduation Date</TableHead>
                  <TableHead>Original Class</TableHead>
                  <TableHead>Completion Year</TableHead>
                  <TableHead>Debt Status</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oldStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      {search ? "No graduated students matching your search." : "No graduated students found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  oldStudents.map((student) => {
                    const firstLetter = (student.name?.trim()?.[0] || "").toUpperCase();
                    const lastLetter = (student.surname?.trim()?.[0] || "").toUpperCase();
                    const initials = `${firstLetter}${lastLetter}` || "S";
                    const arrears = Number(student.outstandingArrears ?? 0);

                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {initials}
                            </div>
                            <div>
                              <div className="font-medium">
                                {student.name || ""} {student.surname || ""}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {typeof student.sex === "string" ? student.sex.toLowerCase() : "N/A"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{student.studentId || "N/A"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            {(() => {
                              try {
                                if (!student.graduationDate) return "N/A";
                                const d = new Date(student.graduationDate);
                                return !isNaN(d.getTime()) ? format(d, "MMM dd, yyyy") : "N/A";
                              } catch {
                                return "N/A";
                              }
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {student.originalClass || "Graduated"}
                            {student.originalGrade ? ` (Grade ${student.originalGrade})` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{student.completionYear ?? "N/A"}</Badge>
                        </TableCell>
                        <TableCell>
                          {!isNaN(arrears) && arrears > 0 ? (
                            <Badge variant="destructive">
                              Owing GHS {arrears.toFixed(2)}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Cleared
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {student.phone && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <span>{student.phone}</span>
                              </div>
                            )}
                            {student.email && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                <span>{student.email}</span>
                              </div>
                            )}
                            {!student.phone && !student.email && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} students
              </p>
              <div className="flex items-center space-x-2">
                {page > 1 && (
                  <Link href={getPageUrl(page - 1)}>
                    <Button variant="outline" size="sm">Previous</Button>
                  </Link>
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link href={getPageUrl(page + 1)}>
                    <Button variant="outline" size="sm">Next</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

