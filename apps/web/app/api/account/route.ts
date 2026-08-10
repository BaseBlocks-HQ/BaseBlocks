import { getToken, handler as authHandler } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { deleteWorkspace } from "@/lib/workspaces/delete-workspace";
import { api } from "@baseblocks/backend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function deleteAccount(request: Request, confirmationEmail: unknown) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (typeof confirmationEmail !== "string") {
      return NextResponse.json(
        { error: "Enter your account email to confirm deletion" },
        { status: 400 },
      );
    }

    const convex = getServerConvexClient(token);
    const plan = await convex.query(api.organizations.getAccountDeletionPlan);
    if (
      !plan.email ||
      normalizeEmail(confirmationEmail) !== normalizeEmail(plan.email)
    ) {
      return NextResponse.json(
        { error: "The confirmation email does not match your account" },
        { status: 400 },
      );
    }
    if (!plan.canDeleteAccount) {
      return NextResponse.json(
        {
          error:
            "Transfer ownership of shared workspaces before deleting your account",
          blockedWorkspaces: plan.blockedWorkspaces.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
          })),
        },
        { status: 409 },
      );
    }

    for (const workspace of plan.deletableWorkspaces) {
      await deleteWorkspace(convex, {
        organizationId: workspace.id,
        mode: "account",
      });
    }

    const authRequest = new Request(
      new URL("/api/auth/delete-user", request.url),
      {
        method: "POST",
        headers: new Headers(request.headers),
        body: "{}",
      },
    );
    authRequest.headers.set("content-type", "application/json");
    return await authHandler.POST(authRequest);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Account deletion failed",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { confirmationEmail?: unknown };
  return await deleteAccount(request, body.confirmationEmail);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const response = await deleteAccount(request, form.get("confirmationEmail"));
  if (!response.ok) return response;

  const headers = new Headers(response.headers);
  headers.set(
    "location",
    new URL("/login?accountDeleted=1", request.url).toString(),
  );
  return new Response(null, { status: 303, headers });
}
