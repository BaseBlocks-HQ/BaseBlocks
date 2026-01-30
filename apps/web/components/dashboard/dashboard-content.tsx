"use client";

import { CreateSiteDialog } from "@/components/dialogs";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { DashboardSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { useEntityAuth } from "@/lib/auth";
import { api } from "@repo/backend";
import { useConvexAuth, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { SitesGrid } from "./sites-grid";

export function DashboardContent() {
	const router = useRouter();
	const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
	const { logout } = useEntityAuth();
	const t = useTranslations();

	const company = useQuery(api.companies.queries.getMine);
	const sites = useQuery(api.sites.queries.list);

	// Redirect to onboarding if no company
	useEffect(() => {
		if (!authLoading && isAuthenticated && company === null) {
			router.push("/onboarding");
		}
	}, [authLoading, isAuthenticated, company, router]);

	// Redirect to login if not authenticated
	useEffect(() => {
		if (!authLoading && !isAuthenticated) {
			router.push("/login");
		}
	}, [authLoading, isAuthenticated, router]);

	if (authLoading || company === undefined) {
		return <DashboardSkeleton />;
	}

	if (!isAuthenticated || !company) {
		return null;
	}

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b">
				<div className="container mx-auto flex h-16 items-center justify-between px-4">
					<div className="flex items-center gap-4">
						<Link href="/" className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
								B
							</div>
							<span className="text-xl font-semibold">BaseBlocks</span>
						</Link>
						<span className="text-muted-foreground">/</span>
						<span className="font-medium">{company.name}</span>
					</div>
					<nav className="flex items-center gap-2">
						<LanguageSwitcher />
						<ModeToggle />
						<Button variant="ghost" size="sm" onClick={logout}>
							{t("common.signOut")}
						</Button>
					</nav>
				</div>
			</header>

			<main className="container mx-auto px-4 py-8">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-2xl font-bold">{t("dashboard.yourSites")}</h1>
						<p className="text-muted-foreground">{t("dashboard.manageSites")}</p>
					</div>
					<CreateSiteDialog />
				</div>

				<SitesGrid sites={sites} companySlug={company.slug} />
			</main>
		</div>
	);
}
