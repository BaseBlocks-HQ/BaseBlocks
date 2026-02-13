/**
 * Proxy endpoint for committing files to Entity Storage
 * Authenticates via Better Auth session cookie, then forwards JWT to Entity Storage
 */
import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth-server";

const ENTITY_STORAGE_SITE_URL =
  process.env.NEXT_PUBLIC_ENTITY_STORAGE_SITE_URL ||
  "https://rightful-cat-553.convex.site";

export async function POST(request: NextRequest) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await request.json();

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
    console.error("Storage commit proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Commit failed" },
      { status: 500 },
    );
  }
}
