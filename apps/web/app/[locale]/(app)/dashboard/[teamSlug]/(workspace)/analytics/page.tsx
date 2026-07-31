import { AnalyticsPage } from "@/features/dashboard/analytics/analytics-page";

type Props = {
  searchParams: Promise<{ site?: string }>;
};

export default async function TeamAnalyticsPage({ searchParams }: Props) {
  const { site } = await searchParams;

  return <AnalyticsPage initialSiteId={site} />;
}
