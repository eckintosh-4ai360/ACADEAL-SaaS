import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AddAdminButton } from "@/components/forms/AddAdminButton";
import { SearchBar } from "@/components/ui/search-bar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminTableRow } from "@/components/tables/AdminTableRow";
import { PageSizeSelector } from "@/components/ui/PageSizeSelector";

export default async function AdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; pageSize?: string }>;
}) {
  //* Check if user is super admin
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin" || session.user.adminRole !== "SUPER_ADMIN") {
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
      { staffId: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [admins, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.admin.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const getPageUrl = (p: number) => {
    const urlParams = new URLSearchParams();
    if (search) urlParams.set("search", search);
    if (pageSize !== 15) urlParams.set("pageSize", pageSize.toString());
    urlParams.set("page", p.toString());
    return `/dashboard/admins?${urlParams.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Management</h1>
          <p className="text-gray-500 mt-1">Manage all admin users in the system</p>
        </div>
        <AddAdminButton />
      </div>

      <div className="flex items-center gap-4">
        <SearchBar placeholder="Search admins by name, admin ID, username, or email..." />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>All Admins ({total})</CardTitle>
          <PageSizeSelector />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Admin ID</th>
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Created At</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <AdminTableRow 
                    key={admin.id} 
                    admin={admin}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center space-x-2">
                {page > 1 && (
                  <Link href={getPageUrl(page - 1)}>
                    <Button variant="outline" size="sm">Previous</Button>
                  </Link>
                )}
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
