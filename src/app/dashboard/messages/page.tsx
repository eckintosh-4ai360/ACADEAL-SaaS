import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MessagesPageClient } from "@/components/messages/MessagesPageClient";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = (session.user as any)?.role || "student";
  const username = (session.user as any)?.username;
  const { tab } = await searchParams;
  const activeTab = tab || "inbox";

  //* Get user ID and type based on role
  let userId: string | null = null;
  let userType: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN" = "STUDENT";

  if (userRole === "student") {
    const student = await prisma.student.findUnique({
      where: { username },
      select: { id: true, name: true, surname: true },
    });
    userId = student?.id || null;
    userType = "STUDENT";
  } else if (userRole === "teacher") {
    const teacher = await prisma.teacher.findUnique({
      where: { username },
      select: { id: true, name: true, surname: true },
    });
    userId = teacher?.id || null;
    userType = "TEACHER";
  } else if (userRole === "parent") {
    const parent = await prisma.parent.findUnique({
      where: { username },
      select: { id: true, name: true, surname: true },
    });
    userId = parent?.id || null;
    userType = "PARENT";
  } else if (userRole === "admin") {
    const admin = await prisma.admin.findUnique({
      where: { username },
      select: { id: true },
    });
    userId = admin?.id || null;
    userType = "ADMIN";
  }

  if (!userId) {
    redirect("/login");
  }

  //* Fetch messages for the current user
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, senderType: userType },
        { receiverId: userId, receiverType: userType },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  //* Fetch sender/receiver info for each message
  const messagesWithUsers = await Promise.all(
    messages.map(async (message) => {
      let sender = null;
      let receiver = null;

      //* Fetch sender info
      if (message.senderType === "STUDENT") {
        sender = await prisma.student.findUnique({
          where: { id: message.senderId },
          select: { id: true, name: true, surname: true, username: true },
        });
      } else if (message.senderType === "TEACHER") {
        sender = await prisma.teacher.findUnique({
          where: { id: message.senderId },
          select: { id: true, name: true, surname: true, username: true },
        });
      } else if (message.senderType === "PARENT") {
        sender = await prisma.parent.findUnique({
          where: { id: message.senderId },
          select: { id: true, name: true, surname: true, username: true },
        });
      }

      //* Fetch receiver info
      if (message.receiverType === "STUDENT") {
        receiver = await prisma.student.findUnique({
          where: { id: message.receiverId },
          select: { id: true, name: true, surname: true, username: true },
        });
      } else if (message.receiverType === "TEACHER") {
        receiver = await prisma.teacher.findUnique({
          where: { id: message.receiverId },
          select: { id: true, name: true, surname: true, username: true },
        });
      } else if (message.receiverType === "PARENT") {
        receiver = await prisma.parent.findUnique({
          where: { id: message.receiverId },
          select: { id: true, name: true, surname: true, username: true },
        });
      }

      return {
        ...message,
        sender: sender || { name: "Unknown", surname: "User", username: "unknown" },
        receiver: receiver || { name: "Unknown", surname: "User", username: "unknown" },
      };
    })
  );

  return (
    <MessagesPageClient
      messages={messagesWithUsers}
      userId={userId}
      userType={userType}
      activeTab={activeTab}
    />
  );
}
