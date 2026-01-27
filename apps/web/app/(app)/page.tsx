"use client";

import { Button } from "@/components/ui/button";
import { useConvexAuth } from "convex/react";
import Link from "next/link";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              B
            </div>
            <span className="text-xl font-semibold">BaseBlocks</span>
          </div>
          <nav className="flex items-center gap-4">
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
      <main className="container mx-auto px-4 py-24">
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
                <Button size="lg">Get Started Free</Button>
              </Link>
            )}
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-32 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Easy Site Builder"
            description="Create pages with our intuitive drag-and-drop editor. Add text, images, documents, and more."
          />
          <FeatureCard
            title="Secure Sharing"
            description="Share your sites with private links. Control who has access and track views."
          />
          <FeatureCard
            title="Custom Domains"
            description="Use your own subdomain or connect a custom domain for professional branding."
          />
          <FeatureCard
            title="Document Management"
            description="Upload and organize PDFs, images, and documents. Your team can easily find and download files."
          />
          <FeatureCard
            title="Real-time Collaboration"
            description="Work together with your team in real-time. See changes as they happen."
          />
          <FeatureCard
            title="Analytics"
            description="Track page views and document downloads. Understand how your content is being used."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 text-sm text-muted-foreground">
          <p>&copy; 2024 BaseBlocks. All rights reserved.</p>
          <nav className="flex gap-4">
            <Link href="#" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
