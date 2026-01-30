"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { useEntityAuth } from "@/lib/auth";
import { isVercelAppDomain } from "@/lib/utils";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { api } from "@repo/backend";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function OnboardingPage() {
	const router = useRouter();
	const { user } = useEntityAuth();
	const [companyName, setCompanyName] = useState("");
	const [slug, setSlug] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const t = useTranslations();

	const createCompany = useMutation(api.companies.mutations.create);

	const handleCompanyNameChange = (value: string) => {
		setCompanyName(value);
		setSlug(generateSlug(value));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsSubmitting(true);

		try {
			// Use org ID if available, otherwise fallback to user ID
			const eaOrgId = user?.organizationId || user?.id;
			if (!eaOrgId) {
				throw new Error("Not authenticated");
			}
			await createCompany({
				name: companyName,
				slug,
				eaOrgId,
			});

			router.push("/dashboard");
		} catch (err) {
			setError(err instanceof Error ? err.message : t("common.error"));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="absolute top-4 right-4">
				<LanguageSwitcher />
			</div>
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>{t("onboarding.title")}</CardTitle>
					<CardDescription>{t("onboarding.description")}</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="companyName">{t("onboarding.companyName")}</Label>
							<Input
								id="companyName"
								placeholder={t("onboarding.companyNamePlaceholder")}
								value={companyName}
								onChange={(e) => handleCompanyNameChange(e.target.value)}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="slug">URL</Label>
							<div className="flex items-center gap-2">
								<Input
									id="slug"
									placeholder="acme"
									value={slug}
									onChange={(e) => setSlug(e.target.value.toLowerCase())}
									required
									pattern={SLUG_PATTERN}
								/>
								<span className="text-sm text-muted-foreground whitespace-nowrap">
									{isVercelAppDomain()
										? `/s/${slug || "acme"}`
										: `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev"}`}
								</span>
							</div>
						</div>

						{error && <p className="text-sm text-destructive">{error}</p>}

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting
								? t("onboarding.creating")
								: t("onboarding.createWorkspace")}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
