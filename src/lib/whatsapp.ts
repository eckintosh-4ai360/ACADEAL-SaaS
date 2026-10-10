import prisma from "./prisma";

type WhatsAppResult = {
  success: boolean;
  error?: string;
  data?: unknown;
  messageId?: string;
  status?: string;
};

type WhatsAppConfig = {
  accessToken: string | null;
  phoneNumberId: string | null;
  receiptTemplateName: string | null;
  receiptTemplateLanguage: string;
  accessTokenSource: "db" | "env" | "missing";
  phoneNumberIdSource: "db" | "env" | "missing";
  receiptTemplateNameSource: "db" | "env" | "missing";
  receiptTemplateLanguageSource: "db" | "env" | "default";
};

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION?.trim() || "v20.0";
const DEFAULT_RECEIPT_TEMPLATE_LANGUAGE =
  process.env.WHATSAPP_RECEIPT_TEMPLATE_LANGUAGE?.trim() || "en_US";

export function normalizeWhatsAppPhoneNumber(phone: string): string | null {
  const digitsOnly = phone.replace(/\D/g, "");

  if (!digitsOnly) {
    return null;
  }

  if (digitsOnly.length === 10 && digitsOnly.startsWith("0")) {
    return `233${digitsOnly.substring(1)}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith("233")) {
    return digitsOnly;
  }

  if (digitsOnly.length === 9) {
    return `233${digitsOnly}`;
  }

  if (digitsOnly.length >= 10 && digitsOnly.length <= 15 && !digitsOnly.startsWith("0")) {
    return digitsOnly;
  }

  return null;
}

async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    const settings = await prisma.systemSettings.findFirst({
      select: {
        whatsappAccessToken: true,
        whatsappPhoneNumberId: true,
        whatsappReceiptTemplateName: true,
        whatsappReceiptTemplateLanguage: true,
      },
    });

    const dbAccessToken = settings?.whatsappAccessToken?.trim() || null;
    const envAccessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || null;
    const dbPhoneNumberId = settings?.whatsappPhoneNumberId?.trim() || null;
    const envPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null;
    const dbReceiptTemplateName = settings?.whatsappReceiptTemplateName?.trim() || null;
    const envReceiptTemplateName =
      process.env.WHATSAPP_RECEIPT_TEMPLATE_NAME?.trim() || null;
    const dbReceiptTemplateLanguage =
      settings?.whatsappReceiptTemplateLanguage?.trim() || null;
    const envReceiptTemplateLanguage =
      process.env.WHATSAPP_RECEIPT_TEMPLATE_LANGUAGE?.trim() || null;

    return {
      accessToken: dbAccessToken || envAccessToken,
      phoneNumberId: dbPhoneNumberId || envPhoneNumberId,
      receiptTemplateName: dbReceiptTemplateName || envReceiptTemplateName,
      receiptTemplateLanguage:
        dbReceiptTemplateLanguage ||
        envReceiptTemplateLanguage ||
        DEFAULT_RECEIPT_TEMPLATE_LANGUAGE,
      accessTokenSource: dbAccessToken ? "db" : envAccessToken ? "env" : "missing",
      phoneNumberIdSource: dbPhoneNumberId ? "db" : envPhoneNumberId ? "env" : "missing",
      receiptTemplateNameSource: dbReceiptTemplateName
        ? "db"
        : envReceiptTemplateName
          ? "env"
          : "missing",
      receiptTemplateLanguageSource: dbReceiptTemplateLanguage
        ? "db"
        : envReceiptTemplateLanguage
          ? "env"
          : "default",
    };
  } catch (error) {
    console.warn("Could not fetch WhatsApp settings from DB, using fallback:", error);

    const envAccessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || null;
    const envPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null;
    const envReceiptTemplateName =
      process.env.WHATSAPP_RECEIPT_TEMPLATE_NAME?.trim() || null;
    const envReceiptTemplateLanguage =
      process.env.WHATSAPP_RECEIPT_TEMPLATE_LANGUAGE?.trim() || null;

    return {
      accessToken: envAccessToken,
      phoneNumberId: envPhoneNumberId,
      receiptTemplateName: envReceiptTemplateName,
      receiptTemplateLanguage:
        envReceiptTemplateLanguage || DEFAULT_RECEIPT_TEMPLATE_LANGUAGE,
      accessTokenSource: envAccessToken ? "env" : "missing",
      phoneNumberIdSource: envPhoneNumberId ? "env" : "missing",
      receiptTemplateNameSource: envReceiptTemplateName ? "env" : "missing",
      receiptTemplateLanguageSource: envReceiptTemplateLanguage ? "env" : "default",
    };
  }
}

export async function sendWhatsAppMessage(payload: Record<string, unknown>): Promise<WhatsAppResult> {
  try {
    const { accessToken, phoneNumberId, accessTokenSource, phoneNumberIdSource } = await getWhatsAppConfig();

    if (!accessToken) {
      console.log("WhatsApp access token missing, skipping send");
      return { success: false, error: "WhatsApp access token not configured" };
    }

    if (!phoneNumberId) {
      console.log("WhatsApp phone number ID missing, skipping send");
      return { success: false, error: "WhatsApp phone number ID not configured" };
    }

    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

    console.log(
      `Attempting to send WhatsApp message (accessTokenSource=${accessTokenSource}, phoneNumberIdSource=${phoneNumberIdSource})`
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const rawBody = await response.text();
    let parsedBody: unknown = rawBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      // Preserve raw text if Meta does not return JSON.
    }

    if (!response.ok) {
      console.error("WhatsApp API Error:", {
        status: response.status,
        statusText: response.statusText,
        response: parsedBody,
      });
      return {
        success: false,
        error: `WhatsApp request failed with status ${response.status}`,
        data: parsedBody,
      };
    }

    const responseData =
      typeof parsedBody === "object" && parsedBody !== null
        ? (parsedBody as {
            messages?: Array<{ id?: string; message_status?: string }>;
          })
        : null;

    const firstMessage = responseData?.messages?.[0];

    return {
      success: true,
      data: parsedBody,
      messageId: firstMessage?.id,
      status: firstMessage?.message_status,
    };
  } catch (error) {
    console.error("WhatsApp sending error:", error);
    return { success: false, error: "Failed to send WhatsApp message" };
  }
}

export async function sendWhatsAppTextMessage(
  phone: string,
  message: string,
  previewUrl = true
): Promise<WhatsAppResult> {
  if (!phone?.trim() || !message?.trim()) {
    return { success: false, error: "Phone and message are required" };
  }

  const recipient = normalizeWhatsAppPhoneNumber(phone);
  if (!recipient) {
    return { success: false, error: "Invalid WhatsApp phone number format" };
  }

  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: {
      body: message,
      preview_url: previewUrl,
    },
  });
}

type ReceiptTemplateInput = {
  phone: string;
  schoolName: string;
  studentName: string;
  amountPaid: string;
  receiptUrl: string;
};

function toTemplateParameter(text: string) {
  return {
    type: "text" as const,
    text: text.trim() || "-",
  };
}

export async function sendWhatsAppReceiptTemplateMessage(
  input: ReceiptTemplateInput
): Promise<WhatsAppResult> {
  const { phone, schoolName, studentName, amountPaid, receiptUrl } = input;

  if (!phone?.trim()) {
    return { success: false, error: "Phone is required" };
  }

  const recipient = normalizeWhatsAppPhoneNumber(phone);
  if (!recipient) {
    return { success: false, error: "Invalid WhatsApp phone number format" };
  }

  const {
    receiptTemplateName,
    receiptTemplateLanguage,
    receiptTemplateNameSource,
    receiptTemplateLanguageSource,
  } = await getWhatsAppConfig();

  if (!receiptTemplateName) {
    console.log("WhatsApp receipt template name missing, skipping send");
    return { success: false, error: "WhatsApp receipt template name not configured" };
  }

  console.log(
    `Attempting to send WhatsApp receipt template (${receiptTemplateName}, templateNameSource=${receiptTemplateNameSource}, templateLanguageSource=${receiptTemplateLanguageSource})`
  );

  return sendWhatsAppMessage({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: receiptTemplateName,
      language: {
        code: receiptTemplateLanguage,
      },
      components: [
        {
          type: "body",
          parameters: [
            toTemplateParameter(schoolName),
            toTemplateParameter(studentName),
            toTemplateParameter(amountPaid),
            toTemplateParameter(receiptUrl),
          ],
        },
      ],
    },
  });
}
