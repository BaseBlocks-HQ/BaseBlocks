import { IntegrationsPage } from "@/features/dashboard/integrations/integrations-page";
import { notionIntegration } from "@/flags";

export default async function IntegrationsRoute() {
  const notionEnabled = await notionIntegration();

  return <IntegrationsPage notionEnabled={notionEnabled} />;
}
