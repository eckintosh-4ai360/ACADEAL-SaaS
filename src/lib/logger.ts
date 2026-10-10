import prisma from "./prisma";

interface LogActivityParams {
  userId: string;
  userName: string;
  role: string;
  action: string;
  ipAddress?: string;
}

export async function logActivity({
  userId,
  userName,
  role,
  action,
  ipAddress,
}: LogActivityParams) {
  try {
    //* Safely check if the model exists in the generated client
    if (!(prisma as any).activityLog) {
      console.warn("Prisma ActivityLog model not found in client. Please run 'npx prisma generate'.");
      return;
    }

    await (prisma as any).activityLog.create({
      data: {
        userId: userId as string,
        userName: userName as string,
        role: role as string,
        action: action as string,
        ipAddress: (ipAddress as string) || "unknown",
      },
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}
