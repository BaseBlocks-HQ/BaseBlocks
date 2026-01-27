import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ subdomain: string }>;
};

export default async function SubdomainRootPage({ params }: Props) {
  const { subdomain } = await params;
  // Redirect to home page
  redirect(`/site/${subdomain}/home`);
}
