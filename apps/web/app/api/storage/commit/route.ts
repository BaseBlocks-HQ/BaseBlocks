import { getToken } from "@/lib/auth/server";
/**
 * Proxy endpoint for committing files to Entity Storage
 * Authenticates via Better Auth session cookie, then forwards JWT to Entity Storage
 */
import { type NextRequest, NextResponse } from "next/server";

const ENTITY_STORAGE_SITE_URL = process.env.NEXT_PUBLIC_ENTITY_STORAGE_SITE_URL;

export async function POST(request: NextRequest) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const response = await fetch(`${ENTITY_STORAGE_SITE_URL}/fs/commit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || `Commit failed: ${response.status}` },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Commit failed" },
      { status: 500 },
    );
  }
}
