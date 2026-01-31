"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getSiteUrl } from "@/lib/utils";
import { Eye, EyeOff, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEditorContext } from "./editor-context";
import { PreviewButton } from "./preview-button";

interface EditorHeaderProps {
	companySlug: string;
	sitePublished: boolean;
	onPublish: () => void;
	onUnpublish?: () => void;
}

export function EditorHeader({
	companySlug,
	sitePublished,
	onPublish,
	onUnpublish,
}: EditorHeaderProps) {
	const t = useTranslations();
	const { canEdit } = useEditorContext();

	return (
		<header className="border-b h-14 flex items-center justify-between px-4">
			<div className="flex items-center gap-2">
				<SidebarTrigger />
				{!canEdit && (
					<Badge variant="secondary" className="gap-1">
						<Eye className="h-3 w-3" />
						View Only
					</Badge>
				)}
			</div>
			<div className="flex items-center gap-2">
				<PreviewButton companySlug={companySlug} />
				{canEdit && (
					<>
						{sitePublished ? (
							<>
								{onUnpublish && (
									<Button variant="outline" size="sm" onClick={onUnpublish}>
										<EyeOff className="h-4 w-4 mr-1.5" />
										{t("editor.unpublish")}
									</Button>
								)}
								<Button variant="outline" size="sm" asChild>
									<a
										href={getSiteUrl(companySlug)}
										target="_blank"
										rel="noopener noreferrer"
									>
										<Globe className="h-4 w-4 mr-1.5" />
										{t("editor.viewLive")}
									</a>
								</Button>
							</>
						) : (
							<Button size="sm" onClick={onPublish}>
								<Globe className="h-4 w-4 mr-1.5" />
								{t("editor.publish")}
							</Button>
						)}
					</>
				)}
				{!canEdit && sitePublished && (
					<Button variant="outline" size="sm" asChild>
						<a
							href={getSiteUrl(companySlug)}
							target="_blank"
							rel="noopener noreferrer"
						>
							<Globe className="h-4 w-4 mr-1.5" />
							{t("editor.viewLive")}
						</a>
					</Button>
				)}
			</div>
		</header>
	);
}
