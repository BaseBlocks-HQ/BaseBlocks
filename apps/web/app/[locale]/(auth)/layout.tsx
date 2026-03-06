import type { ReactNode } from "react";
import { AuthGuard } from "./auth-guard";

// No server-side isAuthenticated() check here.
// With crossDomainClient, auth state lives in localStorage — httpOnly cookies
// are never set on the Next.js domain, so server-side checks always fail.
// AuthGuard + AuthBoundary handle the redirect to /login client-side.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
