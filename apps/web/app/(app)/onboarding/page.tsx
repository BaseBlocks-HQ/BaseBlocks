"use client";

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
import { useEntityAuth } from "@/lib/auth";
import { generateSlug, SLUG_PATTERN } from "@/lib/validation";
import { api } from "@repo/backend";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useEntityAuth();
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to BaseBlocks</CardTitle>
          <CardDescription>
            Let&apos;s set up your company workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Acme Inc"
                value={companyName}
                onChange={(e) => handleCompanyNameChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Your Site URL</Label>
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
                  .baseblocks.dev
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                This will be your company&apos;s unique URL
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
