import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { promises as fs } from "fs";
import path from "path";
import { guardStaff, guardSuperAdmin } from "@/lib/security/guard";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_STAMP_BYTES = 4 * 1024 * 1024;
const STAMP_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function hasStampImageSignature(buffer: Buffer, type: string) {
  if (type === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (type === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  return type === "image/webp" && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
}

/**
 * Uploads land under `public/`, so whatever extension we write is what the app
 * serves — and it serves from the same origin that holds the session cookie.
 * The extension is therefore chosen from this table by content type, never
 * taken from the caller's filename: an `.html` or `.svg` upload would
 * otherwise be stored XSS.
 */
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

//* Ensure Cloudinary is configured
const getCloudinaryConfig = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  const missing = [];
  if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!apiKey) missing.push('CLOUDINARY_API_KEY');
  if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');

  if (missing.length > 0) {
    return { 
      success: false, 
      error: `Missing Cloudinary variables: ${missing.join(', ')}` 
    };
  }

  return { 
    success: true, 
    config: {
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    }
  };
};

const sanitizeBaseName = (fileName: string) =>
  path
    .basename(fileName, path.extname(fileName))
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .slice(0, 50) || "upload";

async function saveFileLocally(
  file: File,
  buffer: Buffer,
  directorySegments: string[],
  extension: string
) {
  const uploadDir = path.join(process.cwd(), "public", ...directorySegments);
  await fs.mkdir(uploadDir, { recursive: true });

  const safeBaseName = sanitizeBaseName(file.name);
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${safeBaseName}-${uniqueSuffix}${extension}`;

  await fs.writeFile(path.join(uploadDir, filename), buffer);

  return `/${[...directorySegments, filename].join("/")}`;
}

export async function POST(request: NextRequest) {
  const guard = await guardStaff();
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const data = await request.formData();
    const purpose = data.get("purpose");
    if (purpose !== null && purpose !== "school-stamp") {
      return NextResponse.json({ success: false, error: "Unsupported upload purpose." }, { status: 400 });
    }
    const isSchoolStamp = purpose === "school-stamp";
    if (isSchoolStamp) {
      const adminGuard = await guardSuperAdmin();
      if (!adminGuard.ok) return adminGuard.response;
    }
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
    }

    const extension = ALLOWED_TYPES[file.type];

    if (isSchoolStamp && !STAMP_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "School stamps must be PNG, JPEG or WebP images." },
        { status: 415 }
      );
    }

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type. Upload a PNG, JPEG, WebP, GIF or PDF.`,
        },
        { status: 415 }
      );
    }

    if (file.size > (isSchoolStamp ? MAX_STAMP_BYTES : MAX_UPLOAD_BYTES)) {
      return NextResponse.json(
        { success: false, error: `File is larger than the ${isSchoolStamp ? 4 : 10}MB limit.` },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (isSchoolStamp && !hasStampImageSignature(buffer, file.type)) {
      return NextResponse.json(
        { success: false, error: "The file does not contain a valid stamp image." },
        { status: 415 }
      );
    }
    const tenantSlug = guard.actor.tenantSlug.replace(/[^a-zA-Z0-9_-]/g, "-");
    const stampDirectory = ["uploads", tenantSlug, "school-stamps"];

    //* Store timetable PDFs locally so they are always served/viewed reliably by the app.
    if (file.type === "application/pdf") {
      const localPath = await saveFileLocally(
        file,
        buffer,
        ["uploads", "timetables"],
        extension
      );

      return NextResponse.json({
        success: true,
        path: localPath,
      });
    }

    const configResult = getCloudinaryConfig();

    if (!configResult.success || !configResult.config) {
      if (isSchoolStamp && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { success: false, error: "School stamp storage is not configured. Ask the platform owner to configure Cloudinary." },
          { status: 503 }
        );
      }
      const localPath = await saveFileLocally(
        file,
        buffer,
        isSchoolStamp ? stampDirectory : ["uploads"],
        extension
      );
      return NextResponse.json({ success: true, path: localPath });
    }

    const { cloud_name, api_key, api_secret } = configResult.config;

    let pathResult: string;

    try {
      //* Upload to Cloudinary via upload stream
      pathResult = await new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: isSchoolStamp ? `student-management/${tenantSlug}/school-stamps` : 'student-management',
            resource_type: 'auto',
            //* Pass config explicitly to avoid global state issues
            cloud_name,
            api_key,
            api_secret,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (!result) {
              reject(new Error('Upload failed: No result from Cloudinary'));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        uploadStream.end(buffer);
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary upload failed:', cloudinaryError);
      if (isSchoolStamp && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { success: false, error: "School stamp storage is unavailable. Please try again later." },
          { status: 502 }
        );
      }
      pathResult = await saveFileLocally(
        file,
        buffer,
        isSchoolStamp ? stampDirectory : ["uploads"],
        extension
      );
    }

    return NextResponse.json({ success: true, path: pathResult });
  } catch (error: unknown) {
    const err = error as { message?: string; http_code?: number };
    console.error('Upload API Catch Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || 'Upload failed.',
        details: typeof err.http_code === "number" ? `Cloudinary error ${err.http_code}` : undefined
      }, 
      { status: 500 }
    );
  }
}
