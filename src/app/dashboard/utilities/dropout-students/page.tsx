import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SearchBar } from "@/components/ui/search-bar";
import { GRADE_NAMES } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { DeleteDropoutButton } from "@/components/buttons/DeleteDropoutButton";
import { AddFromActiveButton } from "@/components/buttons/AddFromActiveButton";
import { EditDropoutButton } from "@/components/buttons/EditDropoutButton";
import { RevertDropoutButton } from "@/components/buttons/RevertDropoutButton";

export default async function DropoutStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = 10;
  const search = params.search || "";

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { surname: { contains: search, mode: "insensitive" } },
      { studentId: { contains: search, mode: "insensitive" } },
    ];
  }

  const [dropouts, total] = await Promise.all([
    prisma.dropoutStudent.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { dropoutDate: "desc" },
    }),
    prisma.dropoutStudent.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dropout Students</h1>
          <p className="text-gray-500 mt-1">Archive of students who have left the institution</p>
        </div>
        <div className="flex items-center gap-2">
          <AddFromActiveButton />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SearchBar placeholder="Search dropouts by name or student ID..." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dropout Records ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Student</th>
                  <th className="text-left p-4 font-medium">ID</th>
                  <th className="text-left p-4 font-medium">Prev. Class/Grade</th>
                  <th className="text-left p-4 font-medium">Dropout Date</th>
                  <th className="text-left p-4 font-medium">Reason</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dropouts.map((dropout) => (
                  <tr key={dropout.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">{dropout.name} {dropout.surname}</p>
                          <p className="text-sm text-muted-foreground">@{dropout.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-mono text-muted-foreground">
                      {dropout.studentId}
                    </td>
                    <td className="p-4 text-sm">
                      {dropout.originalClass} ({dropout.originalGrade})
                    </td>
                    <td className="p-4 text-sm">
                      {new Date(dropout.dropoutDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm max-w-xs truncate">
                      {dropout.dropoutReason || "-"}
                    </td>
                    <td className="p-4 flex items-center gap-2">
                       <RevertDropoutButton id={dropout.id} name={`${dropout.name} ${dropout.surname}`} />
                       <EditDropoutButton dropout={dropout} />
                       <DeleteDropoutButton id={dropout.id} name={`${dropout.name} ${dropout.surname}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} records
              </p>
              <div className="flex items-center space-x-2">
                {page > 1 && (
                  <Link href={`/dashboard/utilities/dropout-students?page=${page - 1}`}>
                    <Button variant="outline" size="sm">Previous</Button>
                  </Link>
                )}
                <span className="text-sm">Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <Link href={`/dashboard/utilities/dropout-students?page=${page + 1}`}>
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
