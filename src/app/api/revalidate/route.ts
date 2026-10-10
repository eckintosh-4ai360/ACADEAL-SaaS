import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

function matchesRevalidationSecret(candidate: unknown) {
  const expected = process.env.REVALIDATION_SECRET;

  //* Fail closed. A plain `candidate !== expected` comparison passed when the
  //* env var was unset, because a body with no secret compares undefined to
  //* undefined and matches.
  if (!expected) {
    console.error("REVALIDATION_SECRET is not configured; rejecting revalidation request.");
    return false;
  }

  if (typeof candidate !== "string" || candidate.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, secret } = body;

    //* Validate secret to prevent unauthorized revalidation
    if (!matchesRevalidationSecret(secret)) {
      return NextResponse.json(
        { message: "Invalid secret" },
        { status: 401 }
      );
    }

    //* Revalidate the specified path
    if (path) {
      revalidatePath(path);
      return NextResponse.json({ revalidated: true, path });
    }

    //* Revalidate the entire dashboard if no specific path
    revalidatePath("/dashboard");
    return NextResponse.json({ revalidated: true, path: "/dashboard" });
  } catch (err) {
    return NextResponse.json(
      { message: "Error revalidating", error: String(err) },
      { status: 500 }
    );
  }
}
