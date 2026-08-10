import { reconcileHostedAiReservations } from "@/features/openeditor-ai/server/reconciliation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    !cronSecret ||
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return unauthorized();
  }
  const result = await reconcileHostedAiReservations();
  return Response.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
