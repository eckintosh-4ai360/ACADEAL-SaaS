import prisma from "@/lib/prisma";
import { BehaviorPageClient } from "@/components/BehaviorPageClient";

async function loadBehaviorData() {
  const [behaviors, students] = await Promise.all([
    prisma.behavior.findMany({
      include: {
        student: {
          include: {
            class: true,
            grade: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    }),
    prisma.student.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
      },
    }),
  ]);

  return { behaviors, students };
}

export default async function BehaviorPage() {
  let behaviors: Awaited<ReturnType<typeof loadBehaviorData>>["behaviors"] = [];
  let students: Awaited<ReturnType<typeof loadBehaviorData>>["students"] = [];
  let dbErrorMessage: string | null = null;

  try {
    ({ behaviors, students } = await loadBehaviorData());
  } catch (firstError) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      ({ behaviors, students } = await loadBehaviorData());
    } catch (retryError) {
      console.error("Behavior page DB load failed:", retryError ?? firstError);
      dbErrorMessage =
        "Could not connect to the database right now. Showing empty data. Please refresh in a moment.";
    }
  }

  const stats = {
    total: behaviors.length,
    positive: behaviors.filter((b) => b.type === "POSITIVE").length,
    negative: behaviors.filter((b) => b.type === "NEGATIVE").length,
    neutral: behaviors.filter((b) => b.type === "NEUTRAL").length,
    critical: behaviors.filter((b) => b.severity === "CRITICAL").length,
  };

  return (
    <BehaviorPageClient
      behaviors={behaviors}
      students={students}
      stats={stats}
      dbErrorMessage={dbErrorMessage}
    />
  );
}
