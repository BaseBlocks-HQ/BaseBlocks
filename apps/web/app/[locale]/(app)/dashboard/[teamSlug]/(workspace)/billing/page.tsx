import { BillingPage } from "@/features/dashboard/billing/billing-page";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { billing } from "@/flags";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ teamSlug: string }> };

export default async function BillingRoute({ params }: Props) {
  const [{ teamSlug }, billingEnabled] = await Promise.all([params, billing()]);
  if (!billingEnabled) redirect(getTeamDashboardPath(teamSlug));
  return <BillingPage />;
}
