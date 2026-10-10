import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddSubjectButton } from "@/components/forms/AddSubjectButton";
import { SubjectActions } from "@/components/tables/SubjectActions";
import { SearchBar } from "@/components/ui/search-bar";

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";

  const where: any = {};

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const [subjects, teachers] = await Promise.all([
    prisma.subject.findMany({
      where,
      include: {
        teachers: true,
        _count: {
          select: {
            lessons: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      select: { id: true, name: true, surname: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subjects</h1>
          <p className="text-gray-500 mt-1">Manage all subjects in the system</p>
        </div>
        <AddSubjectButton teachers={teachers} />
      </div>

      <div className="flex items-center gap-4">
        <SearchBar placeholder="Search subjects by name..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <Card key={subject.id}>
            <CardHeader>
              <CardTitle>{subject.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Teachers:</span>
                <span className="font-medium">{subject.teachers.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Lessons:</span>
                <span className="font-medium">{subject._count.lessons}</span>
              </div>
              <div className="space-y-1">
                {subject.teachers.slice(0, 3).map((teacher) => (
                  <div key={teacher.id} className="text-xs text-gray-600">
                    • {teacher.name} {teacher.surname}
                  </div>
                ))}
                {subject.teachers.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{subject.teachers.length - 3} more
                  </div>
                )}
              </div>
              <div className="pt-3">
                <SubjectActions subject={subject} teachers={teachers} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

