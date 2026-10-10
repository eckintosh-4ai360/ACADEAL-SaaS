import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SystemChatPage } from "@/components/system-chat/SystemChatPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI Assistant | Acadeal",
  description:
    "Ask questions about live school data or instruct the AI to draft parent messages with confirmation.",
};

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  if (session.user.role !== "admin" && session.user.role !== "teacher") {
    redirect("/dashboard");
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <SystemChatPage userKey={session.user.id} />
    </div>
  );
}
