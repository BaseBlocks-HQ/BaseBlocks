import { GuestInvitation } from "@/features/guests/guest-invitation";
import { getToken } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function GuestInvitationRoute({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!(await getToken())) {
    const destination = `/${locale}/guest/invitations/${token}`;
    redirect(`/${locale}/login?redirectTo=${encodeURIComponent(destination)}`);
  }
  return <GuestInvitation token={token} />;
}
