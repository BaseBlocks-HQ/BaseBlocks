import { isAuthenticated } from "@/lib/auth/server";
import { LandingPage } from "@/modules/landing";

export default async function Page() {
  const authed = await isAuthenticated();
  return <LandingPage isAuthenticated={authed} />;
}
