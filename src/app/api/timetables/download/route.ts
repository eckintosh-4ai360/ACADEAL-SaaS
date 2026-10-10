import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { guardSession } from "@/lib/security/guard";
import { listTenants } from "@/lib/tenant";

/**
 * Hosts this route may fetch from. Without an allowlist the handler is an open
 * server-side request proxy: it would happily fetch cloud metadata endpoints
 * and internal-only services and hand the body back to the caller.
 */
const STATIC_ALLOWED_HOSTS = new Set(["res.cloudinary.com"]);

async function isAllowedRemoteHost(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (STATIC_ALLOWED_HOSTS.has(normalized)) {
    return true;
  }

  //* The app's own tenant domains — timetables are sometimes stored against a
  //* school's public URL rather than Cloudinary.
  const tenants = await listTenants();

  return tenants.some((tenant) =>
    tenant.domains.some((domain) => domain.toLowerCase() === normalized)
  );
}

function sanitizeFilename(filename: string | null): string {
  const clean =
    (filename || "timetable")
      .replace(/[\r\n]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "timetable";
  return clean;
}

function resolveContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

function unwrapTargetUrl(rawTargetUrl: string, request: NextRequest): string {
  let target = rawTargetUrl.trim();

  for (let i = 0; i < 3; i += 1) {
    if (target.startsWith("/api/timetables/download")) {
      const nested = new URL(target, request.nextUrl.origin).searchParams.get("url");
      if (!nested) break;
      target = nested.trim();
      continue;
    }

    if (/^https?:\/\//i.test(target)) {
      const parsed = new URL(target);
      if (parsed.pathname === "/api/timetables/download") {
        const nested = parsed.searchParams.get("url");
        if (!nested) break;
        target = nested.trim();
        continue;
      }
    }

    break;
  }

  if (!/^https?:\/\//i.test(target) && !target.startsWith("/")) {
    return `/${target}`;
  }

  return target;
}

export async function GET(request: NextRequest) {
  const guard = await guardSession();
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const urlParam = request.nextUrl.searchParams.get("url");
    const filenameParam = request.nextUrl.searchParams.get("filename");
    const mode = request.nextUrl.searchParams.get("mode") || "download";

    if (!urlParam) {
      return NextResponse.json(
        { success: false, error: "Missing file URL." },
        { status: 400 }
      );
    }

    const targetUrl = unwrapTargetUrl(urlParam, request);
    const downloadName = sanitizeFilename(filenameParam);

    if (targetUrl.startsWith("/")) {
      if (!targetUrl.startsWith("/uploads/")) {
        return NextResponse.json(
          { success: false, error: "Invalid local file path." },
          { status: 400 }
        );
      }

      const publicDir = path.join(process.cwd(), "public");
      const relativePath = targetUrl.startsWith("/") ? targetUrl.slice(1) : targetUrl;
      const absolutePath = path.resolve(publicDir, relativePath);
      const resolvedPublicDir = path.resolve(publicDir);

      if (
        absolutePath !== resolvedPublicDir &&
        !absolutePath.startsWith(`${resolvedPublicDir}${path.sep}`)
      ) {
        return NextResponse.json(
          { success: false, error: "Invalid file path." },
          { status: 400 }
        );
      }

      const fileBuffer = await fs.readFile(absolutePath);
      const contentType = resolveContentType(absolutePath);
      const disposition =
        mode === "view" && contentType !== "application/octet-stream"
          ? "inline"
          : `attachment; filename="${downloadName}"`;

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": disposition,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      return NextResponse.json(
        { success: false, error: "Invalid file URL." },
        { status: 400 }
      );
    }

    const parsedTarget = new URL(targetUrl);

    if (!(await isAllowedRemoteHost(parsedTarget.hostname))) {
      return NextResponse.json(
        { success: false, error: "That file host is not permitted." },
        { status: 400 }
      );
    }

    //* `redirect: "manual"` keeps an allowed host from bouncing us to a
    //* disallowed one — following redirects would defeat the check above.
    const upstream = await fetch(parsedTarget, { redirect: "manual" });
    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch timetable file." },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    //* Pinned from the path, never echoed from upstream: passing the remote
    //* content type through would let an allowed host serve active HTML from
    //* this origin.
    const contentType = resolveContentType(parsedTarget.pathname);
    const disposition =
      mode === "view" && contentType !== "application/octet-stream"
        ? "inline"
        : `attachment; filename="${downloadName}"`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to download timetable file.",
      },
      { status: 500 }
    );
  }
}
