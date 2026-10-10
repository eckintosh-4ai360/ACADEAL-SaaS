import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

//* POST - Save push subscription
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body.subscription;
    const userAgent = request.headers.get("user-agent");

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      );
    }

    const userTypeMap: Record<string, any> = {
      admin: "ADMIN",
      teacher: "TEACHER",
      parent: "PARENT",
      student: "STUDENT",
    };

    const userType = userTypeMap[session.user.role as string] || "ADMIN";

    //* Upsert the subscription
    const subscription = await prisma.pushSubscription.upsert({
      where: {
        userId_userType_endpoint: {
          userId: session.user.id,
          userType,
          endpoint,
        },
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
        lastUsed: new Date(),
      },
      create: {
        userId: session.user.id,
        userType,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error("Save push subscription error:", error);
    return NextResponse.json(
      { error: "Failed to save push subscription" },
      { status: 500 }
    );
  }
}

//* DELETE - Remove push subscription
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required" },
        { status: 400 }
      );
    }

    const userTypeMap: Record<string, any> = {
      admin: "ADMIN",
      teacher: "TEACHER",
      parent: "PARENT",
      student: "STUDENT",
    };

    const userType = userTypeMap[session.user.role as string] || "ADMIN";

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: session.user.id,
        userType,
        endpoint,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete push subscription error:", error);
    return NextResponse.json(
      { error: "Failed to delete push subscription" },
      { status: 500 }
    );
  }
}
