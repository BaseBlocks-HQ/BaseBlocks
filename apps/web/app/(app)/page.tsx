"use client";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { useConvexAuth } from "convex/react";
import Link from "next/link";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

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
          <nav className="flex items-center gap-4">
            <ModeToggle />
            {isLoading ? (
              <Button variant="ghost" disabled>
                Loading...
              </Button>
            ) : isAuthenticated ? (
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto flex flex-1 items-center px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Build Internal Sites for Your Company
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Create and share internal documentation, resources, and knowledge
            bases with your team. Simple, secure, and beautifully designed.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="lg">Go to Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg">Get Started</Button>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
