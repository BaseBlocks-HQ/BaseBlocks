import type { ReactNode } from "react";

// Root layout - minimal wrapper
// The actual html/body tags are in [locale]/layout.tsx
// This allows for proper locale-based lang attribute
export default function RootLayout({ children }: { children: ReactNode }) {
	return children;
}
