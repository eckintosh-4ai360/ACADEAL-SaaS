import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowLeft, Library } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { LessonNecessities } from "@/components/LessonNecessities";
import { Button } from "@/components/ui/button";

export default async function AcademicsNecessitiesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  if (!role || !["admin", "teacher", "student", "parent"].includes(role)) {
    redirect("/dashboard");
  }

  const backHref =
    role === "student"
      ? "/dashboard/academics"
      : role === "parent"
        ? "/dashboard"
        : "/dashboard/lessons";

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4">
        <Link href={backHref} className="block">
          <Button variant="ghost" size="sm" className="w-fit gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="rounded-[28px] border-none bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-sky-200">
                <Library className="h-4 w-4" />
                Academics Resource Hub
              </div>
              <div>
                <h1 className="text-3xl font-black sm:text-4xl">Necessities</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-200 sm:text-base">
                  Quick access to syllabi, academic reference materials, video lessons, exam
                  regulations, and the school library catalog from one clear sidebar location.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LessonNecessities role={role} />
    </div>
  );
}
