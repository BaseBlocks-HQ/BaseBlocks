"use client";

import { CreateSiteDialog } from "@/components/dialogs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { SiteCard } from "./site-card";

interface SitesGridProps {
	sites:
		| Array<{
				_id: string;
				name: string;
				slug: string;
				description?: string;
				logoUrl?: string;
				isPublished: boolean;
		  }>
		| undefined;
	companySlug: string;
}

export function SitesGrid({ sites, companySlug }: SitesGridProps) {
	const t = useTranslations("dashboard");

	if (sites === undefined) {
		return (
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{[1, 2, 3].map((i) => (
					<Card key={i}>
						<CardHeader>
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-4 w-48" />
						</CardHeader>
					</Card>
				))}
			</div>
		);
	}

	if (sites.length === 0) {
		return (
			<Card className="border-dashed">
				<CardContent className="flex flex-col items-center justify-center py-12">
					<Globe className="h-12 w-12 text-muted-foreground mb-4" />
					<h3 className="font-semibold mb-2">{t("noSites")}</h3>
					<p className="text-muted-foreground text-sm mb-4">
						{t("noSitesDescription")}
					</p>
					<CreateSiteDialog />
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{sites.map((site) => (
				<SiteCard key={site._id} site={site} companySlug={companySlug} />
			))}
		</div>
	);
}
