import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { deleteWorkspace } from "@/lib/workspaces/delete-workspace";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { organizationId } = await params;
    const convex = getServerConvexClient(token);
    const result = await deleteWorkspace(convex, {
      organizationId,
      mode: "workspace",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Organization deletion failed",
      },
      { status: 400 },
    );
  }
}
