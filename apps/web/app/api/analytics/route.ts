import { getSiteAnalytics } from "@/features/dashboard/analytics/vercel-analytics-experiment";
import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { api, type Id } from "@baseblocks/backend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const siteId = searchParams.get("siteId");
    if (!organizationId || !siteId) {
      return NextResponse.json(
        { error: "organizationId and siteId are required" },
        { status: 400 },
      );
    }

    const scope = await getServerConvexClient(token).query(
      api.sites.getAnalyticsScope,
      {
        organizationId,
        siteId: siteId as Id<"sites">,
      },
    );
    if (!scope) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    return NextResponse.json(await getSiteAnalytics(scope), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : "Analytics request failed",
      },
      { status: 500 },
    );
  }
}
