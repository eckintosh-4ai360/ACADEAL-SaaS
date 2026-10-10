import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmailTemplate, renderEmailTemplate } from "@/lib/emailTemplates";
import { EmailTemplateCategory } from "@prisma/client";

//* GET - Preview email template with variables
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") as EmailTemplateCategory;
    const templateId = searchParams.get("id");

    if (!category && !templateId) {
      return NextResponse.json(
        { error: "Category or template ID is required" },
        { status: 400 }
      );
    }

    let result;
    if (templateId) {
      //* Get by ID (import dynamically since we don't have a getById function)
      const prisma = (await import("@/lib/prisma")).default;
      const template = await prisma.emailTemplate.findUnique({
        where: { id: parseInt(templateId) },
      });

      if (!template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }

      result = { success: true, template };
    } else {
      result = await getEmailTemplate(category);
    }

    if (!result.success || !result.template) {
      return NextResponse.json(
        { error: result.error || "Template not found" },
        { status: 404 }
      );
    }

    //* Parse variables from query params
    const variables: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith("var_")) {
        variables[key.replace("var_", "")] = value;
      }
    });

    const rendered = renderEmailTemplate(result.template, variables);

    return NextResponse.json({
      success: true,
      template: {
        ...result.template,
        renderedSubject: rendered.subject,
        renderedBodyHtml: rendered.bodyHtml,
        renderedBodyText: rendered.bodyText,
      },
    });
  } catch (error) {
    console.error("Preview template error:", error);
    return NextResponse.json(
      { error: "Failed to preview template" },
      { status: 500 }
    );
  }
}
