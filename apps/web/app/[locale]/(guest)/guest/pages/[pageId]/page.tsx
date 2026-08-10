import { GuestPage } from "@/features/guests/guest-page";
import { getToken } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function SharedPageRoute({
  params,
}: {
  params: Promise<{ locale: string; pageId: string }>;
}) {
  const { locale, pageId } = await params;
  if (!(await getToken())) {
    const destination = `/${locale}/guest/pages/${pageId}`;
    redirect(`/${locale}/login?redirectTo=${encodeURIComponent(destination)}`);
  }
  return <GuestPage pageId={pageId} />;
}
