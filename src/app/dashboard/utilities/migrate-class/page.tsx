import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MigrateClassTab } from "@/components/settings/MigrateClassTab";
import { TotalClassMigrationTab } from "@/components/settings/TotalClassMigrationTab";
import { RecallMigrationButton } from "@/components/settings/RecallMigrationButton";
import { ArrowRightLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MigrateClassPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "admin" || session.user.adminRole !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  //* Get all classes for migration tab
  const classes = await prisma.class.findMany({
    include: {
      grade: true,
      students: {
        select: {
          id: true,
          name: true,
          surname: true,
        },
      },
    },
    orderBy: [
      { grade: { level: "asc" } },
      { name: "asc" },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-8 h-8 text-primary" />
            Migrate Class
          </h1>
          <p className="text-gray-500 mt-1">Promote students to the next class at the end of term/semester</p>
        </div>
        <div className="flex items-center gap-2">
          <RecallMigrationButton />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Migration Tool</CardTitle>
          <CardDescription>
            Migrate entire classes to the next grade or manually move specific students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="total" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="total">Total Migration</TabsTrigger>
              <TabsTrigger value="individual">Individual Migration</TabsTrigger>
            </TabsList>
            
            <TabsContent value="total" className="mt-0">
               <TotalClassMigrationTab classes={classes} />
            </TabsContent>
            
            <TabsContent value="individual" className="mt-0">
               <MigrateClassTab classes={classes} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
