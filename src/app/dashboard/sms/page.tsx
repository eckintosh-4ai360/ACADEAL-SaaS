import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SmsPageClient } from "@/components/sms/SmsPageClient";

type SessionUserPayload = {
  role?: string;
};

export default async function SmsPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as SessionUserPayload | undefined;
  
  if (!session || !session.user || sessionUser?.role !== "admin") {
    redirect("/login");
  }

  const logs = await prisma.smsLog.findMany({
    orderBy: {
      sentAt: "desc",
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <SmsPageClient initialLogs={logs.map(log => ({
        ...log,
        sentAt: log.sentAt.toISOString()
      }))} />
    </div>
  );
}
