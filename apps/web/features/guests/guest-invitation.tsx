"use client";

import { useRouter } from "@/i18n/navigation";
import { workspaceApi } from "@/lib/convex/workspace-api";
import { Button } from "@baseblocks/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@baseblocks/ui/card";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useTranslations } from "next-intl";

type InvitationView = {
  pageId: string;
  pageTitle: string;
  permission: "viewer" | "editor";
  status: string;
  expiresAt: number;
};

export function GuestInvitation({ token }: { token: string }) {
  const router = useRouter();
  const t = useTranslations("guests.invitation");
  const invitation = useQuery(workspaceApi.pageGuests.getInvitation, {
    token,
  }) as InvitationView | null | undefined;
  const accept = useMutation(workspaceApi.pageGuests.accept);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitation === undefined ? <Spinner className="size-5" /> : null}
          {invitation === null ? <p>{t("unavailable")}</p> : null}
          {invitation ? (
            <>
              <p>
                {t("description", {
                  permission: t(
                    invitation.permission === "editor" ? "edit" : "view",
                  ),
                  page: invitation.pageTitle,
                })}
              </p>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <Button
                disabled={
                  submitting ||
                  (invitation.status !== "pending" &&
                    invitation.status !== "accepted")
                }
                onClick={async () => {
                  if (invitation.status === "accepted") {
                    router.push(`/guest/pages/${invitation.pageId}`);
                    return;
                  }
                  setSubmitting(true);
                  setError(null);
                  try {
                    const result = (await accept({ token })) as {
                      pageId: string;
                    };
                    router.push(`/guest/pages/${result.pageId}`);
                  } catch (caught) {
                    setError(
                      caught instanceof Error
                        ? caught.message
                        : t("acceptFailed"),
                    );
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? <Spinner className="size-4" /> : null}
                {invitation.status === "accepted" ? t("open") : t("accept")}
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
