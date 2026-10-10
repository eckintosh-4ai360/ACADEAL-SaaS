import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSmsConfig, sendSMS } from "@/lib/sms";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await getSmsConfig();

    return NextResponse.json({
      config: {
        provider: config.provider,
        providerSource: config.providerSource,
        apiKey: config.apiKey
          ? `${config.apiKey.slice(0, 6)}...${config.apiKey.slice(-4)}`
          : null,
        apiKeySource: config.apiKeySource,
        senderId: config.senderId || null,
        senderIdSource: config.senderIdSource,
        isConfigured: !!(config.apiKey && config.senderId),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone, message } = await req.json();
    if (!phone || !message) {
      return NextResponse.json(
        { error: "phone and message required" },
        { status: 400 }
      );
    }

    const config = await getSmsConfig();

    if (!config.apiKey || !config.senderId) {
      return NextResponse.json({
        success: false,
        error: `SMS provider (${config.provider}) is not fully configured`,
        provider: config.provider,
        debug: { apiKey: !!config.apiKey, senderId: !!config.senderId },
      });
    }

    const result = await sendSMS(phone, message);

    return NextResponse.json({
      success: result.success,
      provider: result.provider || config.provider,
      error: result.error,
      providerResponse: result.data,
      config: {
        provider: config.provider,
        senderId: config.senderId,
        apiKeyMasked: config.apiKey
          ? `${config.apiKey.slice(0, 6)}...${config.apiKey.slice(-4)}`
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
