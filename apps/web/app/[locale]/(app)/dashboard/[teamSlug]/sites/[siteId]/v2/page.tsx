import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ siteId: string; teamSlug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function TeamSiteEditorV2Page({
  params,
  searchParams,
}: Props) {
  const { siteId, teamSlug } = await params;
  const { page } = await searchParams;
  redirect(
    `/dashboard/${teamSlug}/sites/${siteId}${page ? `?page=${page}` : ""}`,
  );
}
