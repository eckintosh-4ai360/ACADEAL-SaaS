import { format } from "date-fns";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Download,
  FileText,
  Library,
  ScrollText,
  Search,
  User,
} from "lucide-react";

import { AddAcademicReferenceButton } from "@/components/forms/AddAcademicReferenceButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  canAccessLessonResources,
  canManageLessonResources,
  formatFileSize,
  getLessonMaterialDownloadUrl,
  LESSON_RESOURCE_CATEGORIES,
} from "@/lib/utils";

function getCategoryIcon(category: string) {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes("citation") || normalized.includes("format")) {
    return <FileText className="h-5 w-5 text-purple-500" />;
  }

  if (normalized.includes("writing")) {
    return <BookOpen className="h-5 w-5 text-emerald-500" />;
  }

  if (normalized.includes("research")) {
    return <Search className="h-5 w-5 text-amber-500" />;
  }

  return <ScrollText className="h-5 w-5 text-sky-500" />;
}

export default async function AcademicReferencePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!canAccessLessonResources(session.user.role)) {
    redirect("/dashboard");
  }

  const canManage = canManageLessonResources(session.user.role);
  const backHref = "/dashboard/academics/necessities";

  const materials = await prisma.academicReferenceMaterial.findMany({
    orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
  });

  const groupedMaterials = materials.reduce<
    Record<string, typeof materials>
  >((accumulator, material) => {
    const category = material.category.trim() || "Uncategorized";

    if (!accumulator[category]) {
      accumulator[category] = [];
    }

    accumulator[category].push(material);
    return accumulator;
  }, {});

  const orderedCategories = Object.keys(groupedMaterials).sort((left, right) => {
    const leftIndex = LESSON_RESOURCE_CATEGORIES.findIndex((item) => item === left);
    const rightIndex = LESSON_RESOURCE_CATEGORIES.findIndex((item) => item === right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right);
    }

    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });

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
              <div className="rounded-2xl bg-gradient-to-br from-rose-400 to-rose-500 p-4 shadow-lg">
                <Library className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-black tracking-tight text-foreground">
                  Academic Reference
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                  Standardized reference materials, formatting guides, and downloadable study PDFs.
                </p>
              </div>
            </div>
            {canManage && <AddAcademicReferenceButton />}
          </div>
        </div>
      </div>

      {orderedCategories.length > 0 ? (
        <div className="space-y-8">
          {orderedCategories.map((category) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                {getCategoryIcon(category)}
                <h2 className="text-2xl font-bold">{category}</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedMaterials[category].map((material) => (
                  <Card
                    key={material.id}
                    className="border-border/40 transition-all duration-300 hover:shadow-lg"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-bold leading-tight">
                          {material.title}
                        </CardTitle>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {material.resourceType}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {material.description}
                      </p>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5" />
                          <span>{material.uploadedByName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{format(new Date(material.updatedAt), "yyyy-MM-dd")}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatFileSize(material.fileSizeBytes)}
                        </span>
                        <Button asChild size="sm" variant="outline" className="gap-2">
                          <a
                            href={getLessonMaterialDownloadUrl(
                              "reference",
                              material.id,
                              material.fileName
                            )}
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-2 border-dashed py-12 text-center">
          <CardContent className="space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
              <Library className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <CardTitle className="text-muted-foreground">
              No academic references have been uploaded yet.
            </CardTitle>
            {canManage && (
              <div className="flex justify-center pt-2">
                <AddAcademicReferenceButton />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Library className="mt-0.5 h-5 w-5 text-rose-600" />
            <div>
              <h3 className="mb-1 font-semibold text-rose-900 dark:text-rose-100">
                Using Academic References
              </h3>
              <p className="text-sm text-rose-800 dark:text-rose-200">
                These materials help students follow academic standards in writing, citation, and
                research. Use the category label to organize uploads by purpose.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
