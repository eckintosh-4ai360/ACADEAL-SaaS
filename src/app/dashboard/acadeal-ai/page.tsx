import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AcadealWorkspace } from "@/components/acadeal/AcadealWorkspace";
import { authOptions } from "@/lib/auth";
import { getAcadealPageData } from "@/lib/ai/acadeal";

export const dynamic = "force-dynamic";

export default async function AcadealAiPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  if (session.user.role !== "student" && session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  const data = await getAcadealPageData(session.user.role, session.user.id);

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[44rem]">
      <AcadealWorkspace initialData={data} />
    </div>
  );
}
