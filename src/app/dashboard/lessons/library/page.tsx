import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Clock, Library } from "lucide-react";

import { LibraryCatalogClient } from "@/components/LibraryCatalogClient";
import { LibraryBorrowingClient } from "@/components/LibraryBorrowingClient";
import { StudentBorrowsClient } from "@/components/StudentBorrowsClient";
import { ParentBorrowsClient } from "@/components/ParentBorrowsClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canAccessLibraryCatalog, canManageLibraryCatalog } from "@/lib/utils";

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  if (!canAccessLibraryCatalog(role)) {
    redirect("/dashboard");
  }

  const canManage = canManageLibraryCatalog(role);
  const backHref = "/dashboard/academics/necessities";

  // 1. Fetch common catalog items (with active borrows to track available copies)
  const items = await prisma.libraryCatalogItem.findMany({
    include: {
      borrows: {
        where: { status: "BORROWED" }
      }
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });

  // 2. Fetch role-specific data
  let studentOptions: { id: string; name: string; surname: string; studentId: string }[] = [];
  let booksOptions: { id: number; title: string; author: string | null; copies: number; activeBorrowCount: number }[] = [];
  let borrows: any[] = [];

  if (role === "admin" || role === "teacher") {
    studentOptions = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
        studentId: true,
      },
      orderBy: [{ surname: "asc" }, { name: "asc" }],
    });

    booksOptions = items
      .filter((item) => item.itemType === "BOOK")
      .map((item) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        copies: item.copies,
        activeBorrowCount: item.borrows.length,
      }));

    borrows = await prisma.libraryBorrow.findMany({
      include: {
        item: true,
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            studentId: true,
          }
        }
      },
      orderBy: { borrowDate: "desc" },
    });
  } else if (role === "student") {
    const student = await prisma.student.findUnique({
      where: { username: session.user.username },
      select: { id: true },
    });

    const studentId = student?.id || "";

    borrows = await prisma.libraryBorrow.findMany({
      where: { studentId },
      include: {
        item: true,
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            studentId: true,
          }
        }
      },
      orderBy: { borrowDate: "desc" },
    });
  } else if (role === "parent") {
    const parent = await prisma.parent.findUnique({
      where: { username: session.user.username },
      select: { id: true },
    });

    const parentId = parent?.id || "";

    borrows = await prisma.libraryBorrow.findMany({
      where: {
        student: {
          parentId: parentId
        }
      },
      include: {
        item: true,
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
            studentId: true,
          }
        }
      },
      orderBy: { borrowDate: "desc" },
    });
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="w-fit gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="border-b border-border/50 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-4 shadow-lg">
                <Library className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-black tracking-tight text-foreground">
                  School Library
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                  Discover books, resources, and manage checkouts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="catalog" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Catalog Entries
          </TabsTrigger>
          <TabsTrigger value="borrows" className="gap-2">
            <Clock className="h-4 w-4" />
            {role === "admin" || role === "teacher"
              ? "Borrowing & Lending"
              : role === "student"
              ? "My Borrows"
              : "Children's Borrows"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <LibraryCatalogClient items={items} canManage={canManage} featureReady={true} />
        </TabsContent>

        <TabsContent value="borrows">
          {role === "admin" || role === "teacher" ? (
            <LibraryBorrowingClient
              borrows={borrows}
              students={studentOptions}
              books={booksOptions}
              isAdmin={role === "admin"}
            />
          ) : role === "student" ? (
            <StudentBorrowsClient borrows={borrows} />
          ) : (
            <ParentBorrowsClient borrows={borrows} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
