import Link from "next/link";
import { getServerSession } from "next-auth";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

import DiscussionForums from "./DiscussionForums";

export const metadata = {
  title: "Discussion Forums | Eckintosh Student Management",
  description:
    "Class discussion forums for Ghana NaCCA curriculum school - ask questions, share resources, and collaborate.",
};

export default async function DiscussionForumsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "parent") {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden rounded-[32px] bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.1),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.1),_transparent_28%),linear-gradient(to_bottom,_rgba(248,250,252,0.96),_rgba(241,245,249,0.98))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.14),_transparent_28%),linear-gradient(to_bottom,_rgba(15,23,42,0.96),_rgba(2,6,23,1))]" />
      <div className="absolute left-0 top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/10" />
      <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-500/10" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard/academics/study-tools"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Study Tools
          </Link>
        </div>

        <DiscussionForums
          viewer={{
            role: session.user.role,
            displayName:
              session.user.name?.trim() ||
              session.user.username ||
              session.user.loginId ||
              "Current User",
            username: session.user.username,
          }}
        />
      </div>
    </div>
  );
}
