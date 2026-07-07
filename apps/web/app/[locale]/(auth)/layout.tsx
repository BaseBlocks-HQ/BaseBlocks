import { getToken } from "@/lib/auth/server";
import { ConvexClientProvider } from "@/lib/convex/provider";
import {
  MediaViewerModal,
  MediaViewerProvider,
} from "@/modules/editor/media-viewer";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { ClientAuthBoundary } from "./client-auth-boundary";

export default async function AuthLayout({ children }: PropsWithChildren) {
  const token = await getToken();

  if (!token) {
    redirect("/login");
  }

  return (
    <ConvexClientProvider initialToken={token}>
      <MediaViewerProvider>
        <ClientAuthBoundary>{children}</ClientAuthBoundary>
        <MediaViewerModal />
      </MediaViewerProvider>
    </ConvexClientProvider>
  );
}
