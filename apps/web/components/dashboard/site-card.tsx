"use client";

import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { EditSiteDialog } from "@/components/dialogs/edit-site-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { getSiteUrl } from "@/lib/utils";
import { api } from "@repo/backend";
import { useMutation } from "convex/react";
import { Building2, Eye, ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

interface SiteCardProps {
	site: {
		_id: string;
		name: string;
		slug: string;
		description?: string;
		logoUrl?: string;
		isPublished: boolean;
		company?: {
			_id: string;
			name: string;
			slug: string;
		} | null;
	};
	companySlug?: string; // Optional now, will use site.company.slug if available
}

export function SiteCard({ site, companySlug }: SiteCardProps) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const t = useTranslations();

	const deleteSite = useMutation(api.sites.mutations.remove);

	// Use company slug from site object if available, fallback to prop
	const effectiveCompanySlug = site.company?.slug ?? companySlug ?? "";

	// Link to the site root - the root page will redirect to the default page
	const siteUrl = getSiteUrl(effectiveCompanySlug);

	// Preview handler that works on localhost (subdomain) and production
	const handlePreview = useCallback(() => {
		const isLocalhost =
			window.location.hostname === "localhost" ||
			window.location.hostname === "127.0.0.1" ||
			window.location.hostname.endsWith(".localhost");

		if (isLocalhost) {
			const port = window.location.port || "3000";
			window.open(`http://${effectiveCompanySlug}.localhost:${port}/`, "_blank");
		} else {
			window.open(getSiteUrl(effectiveCompanySlug), "_blank");
		}
	}, [effectiveCompanySlug]);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteSite({ siteId: site._id as any });
			setDeleteOpen(false);
		} catch (err) {
			console.error("Failed to delete site:", err);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<>
			<Card className="hover:border-primary/50 transition-colors">
				<CardHeader>
					<div className="flex items-start justify-between gap-3">
						{/* Logo */}
						<div className="flex-shrink-0">
							{site.logoUrl ? (
								<img
									src={site.logoUrl}
									alt={site.name}
									className="h-10 w-10 rounded-lg object-contain border bg-muted"
								/>
							) : (
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
									{site.name[0]?.toUpperCase() || "S"}
								</div>
							)}
						</div>
						{/* Title and description */}
						<div className="flex-1 min-w-0">
							<CardTitle className="text-lg truncate">{site.name}</CardTitle>
							<CardDescription className="truncate">
								{site.description || t("sites.noDescription")}
							</CardDescription>
							{site.company && (
								<div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
									<Building2 className="h-3 w-3" />
									<span className="truncate">{site.company.name}</span>
								</div>
							)}
						</div>
						<div className="flex items-center gap-2">
							<div
								className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
									site.isPublished
										? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
										: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
								}`}
							>
								{site.isPublished ? t("sites.published") : t("sites.draft")}
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="h-8 w-8">
										<MoreVertical className="h-4 w-4" />
										<span className="sr-only">{t("common.settings")}</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => setEditOpen(true)}>
										<Pencil className="h-4 w-4 mr-2" />
										{t("common.edit")}
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => setDeleteOpen(true)}
										className="text-destructive focus:text-destructive"
									>
										<Trash2 className="h-4 w-4 mr-2" />
										{t("common.delete")}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-2">
						<Link href={`/sites/${site._id}`} className="flex-1">
							<Button variant="outline" className="w-full">
								{t("sites.edit")}
							</Button>
						</Link>
						{/* Preview button - always available, works on localhost and production */}
						<Button
							variant="ghost"
							size="icon"
							title={t("sites.preview")}
							onClick={handlePreview}
						>
							<Eye className="h-4 w-4" />
						</Button>
						{/* Published link - only when published, uses proper domain */}
						{site.isPublished && (
							<Button
								variant="ghost"
								size="icon"
								asChild
								title={t("sites.viewLive")}
							>
								<a href={siteUrl} target="_blank" rel="noopener noreferrer">
									<ExternalLink className="h-4 w-4" />
								</a>
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			<EditSiteDialog open={editOpen} onOpenChange={setEditOpen} site={site} />

			<ConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={t("sites.delete")}
				description={t("sites.confirmDelete")}
				confirmLabel={
					isDeleting ? t("dialogs.delete.deleting") : t("sites.delete")
				}
				variant="destructive"
				onConfirm={handleDelete}
			/>
		</>
	);
}
