import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import {
  attachDomain,
  detachDomain,
  inspectDomain,
  validateCustomHostname,
  verifyDomain,
} from "@/lib/vercel/domains";
import { api, type Id } from "@baseblocks/backend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DomainAction = "add" | "inspect" | "remove" | "verify";

function statusFor(result: Awaited<ReturnType<typeof inspectDomain>>) {
  if (result.domain.verified && !result.configuration.misconfigured)
    return "verified" as const;
  return result.configuration.misconfigured
    ? ("misconfigured" as const)
    : ("pending" as const);
}

export async function POST(request: Request) {
  try {
    const token = await getToken();
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as {
      action?: DomainAction;
      hostname?: string;
      siteId?: string;
    };
    if (!body.action || !body.hostname || !body.siteId) {
      return NextResponse.json(
        { error: "action, hostname, and siteId are required" },
        { status: 400 },
      );
    }

    const hostname = validateCustomHostname(body.hostname);
    const siteId = body.siteId as Id<"sites">;
    const convex = getServerConvexClient(token);

    // Authorize against Convex before making any infrastructure change.
    await convex.query(api.siteDomains.assertAvailable, { siteId, hostname });

    if (body.action === "remove") {
      await detachDomain(hostname);
      await convex.mutation(api.siteDomains.remove, { siteId, hostname });
      return NextResponse.json({ hostname, removed: true });
    }

    const result =
      body.action === "add"
        ? await attachDomain(hostname)
        : body.action === "verify"
          ? await verifyDomain(hostname)
          : await inspectDomain(hostname);
    const status = statusFor(result);
    await convex.mutation(api.siteDomains.record, { siteId, hostname, status });

    return NextResponse.json({
      hostname,
      status,
      verified: result.domain.verified,
      verification: result.domain.verification ?? [],
      configuredBy: result.configuration.configuredBy,
      recommendedCNAME: result.configuration.recommendedCNAME,
      recommendedIPv4: result.configuration.recommendedIPv4,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Domain operation failed",
      },
      { status: 400 },
    );
  }
}
