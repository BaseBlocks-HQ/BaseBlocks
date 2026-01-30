import {
	MediaViewerModal,
	MediaViewerProvider,
} from "@/components/media-viewer";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing, type Locale } from "@/i18n/routing";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../globals.css";

const geistSans = localFont({
	src: "../fonts/GeistVF.woff",
	variable: "--font-geist-sans",
});
const geistMono = localFont({
	src: "../fonts/GeistMonoVF.woff",
	variable: "--font-geist-mono",
});

type Props = {
	children: ReactNode;
	params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "metadata" });

	return {
		title: t("title"),
		description: t("description"),
	};
}

export default async function LocaleLayout({ children, params }: Props) {
	const { locale } = await params;

	// Ensure that the incoming `locale` is valid
	if (!routing.locales.includes(locale as Locale)) {
		notFound();
	}

	// Enable static rendering
	setRequestLocale(locale);

	// Providing all messages to the client side
	const messages = await getMessages();

	return (
		<html lang={locale} suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable}`}>
				<NextIntlClientProvider messages={messages}>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						<MediaViewerProvider>
							{children}
							<MediaViewerModal />
						</MediaViewerProvider>
						<Toaster />
					</ThemeProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
