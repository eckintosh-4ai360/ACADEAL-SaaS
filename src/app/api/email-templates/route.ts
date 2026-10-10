import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  sendTemplateEmail,
  renderEmailTemplate,
  initializeEmailTemplates,
} from "@/lib/emailTemplates";
import { EmailTemplateCategory } from "@prisma/client";

//* GET - Get all email templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //* Only admins can manage templates
    if (session.user.role !== "admin" && (session.user.role as string) !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") as EmailTemplateCategory | null;
    const includeInactive = searchParams.get("includeInactive") === "true";

    if (category) {
      const result = await getEmailTemplate(category);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 404 }
        );
      }
      return NextResponse.json(result);
    }

    const result = await getAllEmailTemplates({ includeInactive });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

//* POST - Create or update email template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //* Only admins can manage templates
    if (session.user.role !== "admin" && (session.user.role as string) !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      action,
      templateId,
      name,
      category,
      subject,
      bodyHtml,
      bodyText,
      variables,
      recipient,
      variables: templateVariables,
    } = body;

    //* Initialize templates
    if (action === "initialize") {
      const result = await initializeEmailTemplates();
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json(result);
    }

    //* Send test email or broadcast
    if (action === "send" && templateId && recipient) {
      const result = await sendTemplateEmail(
        templateId,
        recipient,
        templateVariables || {}
      );
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json(result);
    }

    if (action === "broadcast" && templateId) {
      const { broadcastTemplateEmail } = await import("@/lib/emailTemplates");
      const result = await broadcastTemplateEmail(
        templateId,
        templateVariables || {}
      );
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json(result);
    }

    //* Create new template
    if (action === "create") {
      if (!name || !category || !subject || !bodyHtml) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      const result = await createEmailTemplate({
        name,
        category,
        subject,
        bodyHtml,
        bodyText,
        variables,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json(result, { status: 201 });
    }

    //* Update existing template
    if (action === "update" && templateId) {
      const result = await updateEmailTemplate(templateId, {
        name,
        category,
        subject,
        bodyHtml,
        bodyText,
        variables,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Email template operation error:", error);
    return NextResponse.json(
      { error: "Failed to process email template" },
      { status: 500 }
    );
  }
}

//* DELETE - Delete email template
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //* Only admins can delete templates
    if (session.user.role !== "admin" && (session.user.role as string) !== "super-admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    const result = await deleteEmailTemplate(parseInt(templateId));

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
