"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useConvexAuth } from "convex/react";
import { useTranslations } from "next-intl";

export default function LandingPage() {
	const { isAuthenticated, isLoading } = useConvexAuth();
	const t = useTranslations();

	return (
		<div className="flex min-h-screen flex-col bg-background">
			{/* Header */}
			<header>
				<div className="container mx-auto flex h-16 items-center justify-between px-4">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
							B
						</div>
						<span className="text-xl font-semibold">BaseBlocks</span>
					</div>
					<nav className="flex items-center gap-2">
						<LanguageSwitcher />
						<ModeToggle />
						{isLoading ? (
							<Button variant="ghost" disabled>
								{t("common.loading")}
							</Button>
						) : isAuthenticated ? (
							<Link href="/dashboard">
								<Button>{t("navigation.dashboard")}</Button>
							</Link>
						) : (
							<Link href="/login">
								<Button>{t("common.signIn")}</Button>
							</Link>
						)}
					</nav>
				</div>
			</header>

			{/* Hero Section */}
			<main className="container mx-auto flex flex-1 items-center px-4">
				<div className="mx-auto max-w-3xl text-center">
					<h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
						{t("landing.heroTitle")}
					</h1>
					<p className="mt-6 text-lg text-muted-foreground">
						{t("landing.heroDescription")}
					</p>
					<div className="mt-10 flex items-center justify-center gap-4">
						{isAuthenticated ? (
							<Link href="/dashboard">
								<Button size="lg">{t("common.goToDashboard")}</Button>
							</Link>
						) : (
							<Link href="/login">
								<Button size="lg">{t("common.getStarted")}</Button>
							</Link>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
