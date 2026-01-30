"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { api } from "@repo/backend";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FormDialog } from "./form-dialog";

export function CreateSiteDialog() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const t = useTranslations();

	const createSite = useMutation(api.sites.mutations.create);

	const handleNameChange = (value: string) => {
		setName(value);
		setSlug(generateSlug(value));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsSubmitting(true);

		try {
			await createSite({
				name,
				slug,
				description: description || undefined,
			});
			setOpen(false);
			setName("");
			setSlug("");
			setDescription("");
		} catch (err) {
			setError(err instanceof Error ? err.message : t("common.error"));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<FormDialog
			open={open}
			onOpenChange={setOpen}
			title={t("dialogs.createSite.title")}
			description={t("dialogs.createSite.description")}
			trigger={
				<Button>
					<Plus className="h-4 w-4 mr-2" />
					{t("dashboard.createSite")}
				</Button>
			}
			onSubmit={handleSubmit}
			isSubmitting={isSubmitting}
			submitLabel={t("dialogs.createSite.create")}
			submittingLabel={t("dialogs.createSite.creating")}
		>
			<div className="space-y-2">
				<Label htmlFor="siteName">{t("dialogs.createSite.nameLabel")}</Label>
				<Input
					id="siteName"
					placeholder={t("dialogs.createSite.namePlaceholder")}
					value={name}
					onChange={(e) => handleNameChange(e.target.value)}
					required
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="siteSlug">URL Slug</Label>
				<Input
					id="siteSlug"
					placeholder="engineering-docs"
					value={slug}
					onChange={(e) => setSlug(e.target.value.toLowerCase())}
					required
					pattern={SLUG_PATTERN}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="siteDescription">
					{t("dialogs.createSite.descriptionLabel")}
				</Label>
				<Textarea
					id="siteDescription"
					placeholder={t("dialogs.createSite.descriptionPlaceholder")}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
			</div>

			{error && <p className="text-sm text-destructive">{error}</p>}
		</FormDialog>
	);
}
