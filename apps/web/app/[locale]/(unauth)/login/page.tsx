import type { Metadata } from "next";
import { LoginPageClient } from "./login-page-client";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to your BaseBlocks account to build and manage your sites.",
};

export default function LoginPage() {
  return <LoginPageClient />;
}
