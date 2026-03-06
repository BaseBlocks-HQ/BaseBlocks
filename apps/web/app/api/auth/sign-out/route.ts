import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Clears httpOnly auth cookies that crossDomainClient can't reach.
// Called during logout before redirect.
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("better-auth.convex_jwt");
  cookieStore.delete("better-auth.session_token");
  return NextResponse.json({ ok: true });
}
