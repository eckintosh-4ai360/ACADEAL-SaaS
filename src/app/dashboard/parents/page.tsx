import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChevronDown } from "lucide-react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AddParentButton } from "@/components/forms/AddParentButton";
import { SearchBar } from "@/components/ui/search-bar";
import { ParentTableRow } from "@/components/tables/ParentTableRow";
import { PageSizeSelector } from "@/components/ui/PageSizeSelector";
import { BroadcastEmailButton } from "@/components/forms/BroadcastEmailButton";

export default async function ParentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; pageSize?: string }>;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = (session?.user as any)?.role || "student";
  
  //* Only allow admin and super admin to access this page
  if (userRole !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = parseInt(params.pageSize || "15");
  const search = params.search || "";

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { surname: { contains: search, mode: "insensitive" } },
      { parentUserId: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
    ];
  }

  const [parents, total, pendingParents] = await Promise.all([
    prisma.parent.findMany({
      where: { ...where, isProfileComplete: true },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.parent.count({ where: { ...where, isProfileComplete: true } }),
    prisma.parent.findMany({
      where: { isProfileComplete: false },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const getPageUrl = (p: number) => {
    const urlParams = new URLSearchParams();
    if (search) urlParams.set("search", search);
    if (pageSize !== 15) urlParams.set("pageSize", pageSize.toString());
    urlParams.set("page", p.toString());
    return `/dashboard/parents?${urlParams.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parents</h1>
          <p className="text-gray-500 mt-1">Manage all parents in the system</p>
        </div>
        <div className="flex items-center gap-2">
          <BroadcastEmailButton />
          <AddParentButton />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SearchBar placeholder="Search parents by name, parent ID, username, email, phone, or address..." />
      </div>

      {pendingParents.length > 0 && (
        <details className="group [&_summary::-webkit-details-marker]:hidden border border-orange-200 rounded-lg bg-orange-50/50 focus-within:ring-2 focus-within:ring-orange-500 overflow-hidden">
          <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-gray-900 focus:outline-none bg-white">
            <div className="flex items-center gap-2 font-bold text-lg">
              <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              Pending Setup ({pendingParents.length})
            </div>
            <span className="shrink-0 transition duration-300 group-open:-rotate-180">
              <ChevronDown className="h-5 w-5 text-gray-500" />
            </span>
          </summary>
          <div className="p-4 bg-transparent border-t border-orange-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingParents.map((parent) => (
                <div key={parent.id} className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900">{parent.name} {parent.surname}</h4>
                    <p className="text-xs text-gray-500 mt-1">Parent ID: {parent.parentUserId || "PENDING"}</p>
                    <p className="text-xs text-gray-500 mt-1">Phone: {parent.phone}</p>
                    <p className="text-xs text-gray-500">Students: {parent.students.map(s => `${s.name} ${s.surname}`).join(", ")}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-orange-50 flex justify-end">
                    <ParentTableRow parent={parent as any} variant="buttons" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>All Parents ({total})</CardTitle>
          <PageSizeSelector />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Parent</th>
                  <th className="text-left p-4 font-medium">Parent ID</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Phone</th>
                  <th className="text-left p-4 font-medium">Address</th>
                  <th className="text-left p-4 font-medium">Students</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {parents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No parents found. Click "Add Parent" to create a new parent.
                    </td>
                  </tr>
                ) : (
                  parents.map((parent) => (
                    <ParentTableRow 
                      key={parent.id} 
                      parent={parent}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} parents
              </p>
              <div className="flex items-center space-x-2">
                {page > 1 && (
                  <Link href={getPageUrl(page - 1)}>
                    <Button variant="outline" size="sm">Previous</Button>
                  </Link>
                )}
                <span className="text-sm">Page {page} of {totalPages}</span>
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
