"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import {
  DashboardList,
  DashboardListRow,
  DashboardPageHeader,
} from "@/features/dashboard/layout/dashboard-page";
import { api } from "@baseblocks/backend";
import type { FunctionReturnType } from "convex/server";
import {
  integrationProviders,
  type IntegrationProviderKey,
} from "@baseblocks/domain";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@baseblocks/ui/alert-dialog";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import { useAction, useQuery } from "convex/react";
import {
  ArrowUpRight,
  Check,
  LoaderCircle,
  RefreshCw,
  Unplug,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type IntegrationConnection = FunctionReturnType<
  typeof api.integrations.listConnections
>[number];

function ProviderMark({ provider }: { provider: IntegrationProviderKey }) {
  return (
    <span
      className={cn(
        "flex size-10 items-center justify-center overflow-hidden rounded-lg",
        provider === "github" && "bg-white p-1",
      )}
    >
      <Image
        alt=""
        aria-hidden="true"
        className={cn(
          "size-9 object-contain",
          provider === "confluence" && "size-10",
        )}
        height={40}
        src={`/integrations/${provider}.svg`}
        width={40}
      />
    </span>
  );
}

function ConnectionStatus({
  connection,
}: {
  connection: IntegrationConnection;
}) {
  const t = useTranslations("integrations");

  if (connection.status === "active") {
    if (connection.syncStatus === "error") {
      return <Badge variant="destructive">{t("status.needsAttention")}</Badge>;
    }
    if (
      connection.syncStatus === "running" ||
      connection.syncStatus === "queued"
    ) {
      return (
        <Badge variant="secondary">
          <LoaderCircle className="animate-spin" />
          {t("status.syncing")}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Check />
        {t("status.connected")}
      </Badge>
    );
  }
  if (connection.status === "awaitingAuthorization") {
    return <Badge variant="outline">{t("status.awaitingAuthorization")}</Badge>;
  }
  if (connection.status === "disconnecting") {
    return <Badge variant="outline">{t("status.disconnecting")}</Badge>;
  }
  return <Badge variant="destructive">{t("status.needsAttention")}</Badge>;
}

interface ConnectionCardProps {
  connection: IntegrationConnection;
  canManage: boolean;
  busyId: string | null;
  onAuthorize: (provider: IntegrationProviderKey) => Promise<void>;
  onDisconnect: (connectionId: IntegrationConnection["_id"]) => Promise<void>;
  onReconnect: (connectionId: IntegrationConnection["_id"]) => Promise<void>;
  onRetrySync: (connectionId: IntegrationConnection["_id"]) => Promise<void>;
}

function ConnectionCard({
  connection,
  canManage,
  busyId,
  onAuthorize,
  onDisconnect,
  onReconnect,
  onRetrySync,
}: ConnectionCardProps) {
  const t = useTranslations("integrations");
  const provider = integrationProviders.find(
    (candidate) => candidate.key === connection.provider,
  )!;
  const busy =
    busyId === connection._id || busyId === `provider:${connection.provider}`;
  const canRetryAuthorization =
    connection.status === "awaitingAuthorization" ||
    (connection.status === "error" && !connection.canReconnect);

  return (
    <DashboardListRow>
      <ProviderMark provider={connection.provider} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{provider.name}</h3>
          <ConnectionStatus connection={connection} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {connection.status === "active"
            ? t("resourcesSynced", { count: connection.resourceCount })
            : connection.errorMessage || t("finishAuthorization")}
        </p>
        {connection.syncErrorMessage ? (
          <p className="mt-1 text-sm text-destructive">
            {connection.syncErrorMessage}
          </p>
        ) : null}
      </div>
      {canManage ? (
        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          {canRetryAuthorization ? (
            <Button
              disabled={busy}
              onClick={() => void onAuthorize(connection.provider)}
              size="sm"
              variant="outline"
            >
              {busy ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <ArrowUpRight />
              )}
              {t("actions.continue")}
            </Button>
          ) : null}
          {connection.status === "error" && connection.canReconnect ? (
            <Button
              disabled={busy}
              onClick={() => void onReconnect(connection._id)}
              size="sm"
              variant="outline"
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
              {t("actions.reconnect")}
            </Button>
          ) : null}
          {connection.status === "active" &&
          connection.syncStatus === "error" ? (
            <Button
              disabled={busy}
              onClick={() => void onRetrySync(connection._id)}
              size="sm"
              variant="outline"
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
              {t("actions.retrySync")}
            </Button>
          ) : null}
          {connection.canReconnect ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={busy} size="sm" variant="ghost">
                  <Unplug />
                  {t("actions.disconnect")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("disconnect.title", { provider: provider.name })}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("disconnect.description")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("disconnect.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void onDisconnect(connection._id)}
                    variant="destructive"
                  >
                    {t("actions.disconnect")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      ) : null}
    </DashboardListRow>
  );
}

export function IntegrationsPage({
  notionEnabled,
}: {
  notionEnabled: boolean;
}) {
  const t = useTranslations("integrations");
  const { capabilities, team } = useTeamAccess();
  const connections = useQuery(
    api.integrations.listConnections,
    notionEnabled ? { organizationId: team._id } : "skip",
  );
  const beginAuthorization = useAction(api.integrations.beginAuthorization);
  const reconnect = useAction(api.integrations.reconnect);
  const disconnect = useAction(api.integrations.disconnect);
  const retrySync = useAction(api.integrations.retrySync);
  const [busyId, setBusyId] = useState<string | null>(null);
  const connectedProviders = new Set(
    connections?.map((connection) => connection.provider) ?? [],
  );
  const availableProviders = notionEnabled
    ? connections === undefined
      ? []
      : integrationProviders.filter(
          (provider) => !connectedProviders.has(provider.key),
        )
    : integrationProviders;

  const openAuthorization = async (
    operationId: string,
    run: () => Promise<{ connectUrl: string }>,
  ) => {
    const popup = window.open(
      "about:blank",
      "baseblocks-integration",
      "popup,width=640,height=760",
    );
    if (!popup) {
      toast.error(t("popupBlocked"));
      return;
    }
    popup.opener = null;

    setBusyId(operationId);
    try {
      const { connectUrl } = await run();
      popup.location.replace(connectUrl);
      popup.focus();
    } catch (error) {
      popup.close();
      toast.error(error instanceof Error ? error.message : t("connectFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleAuthorize = async (provider: IntegrationProviderKey) => {
    await openAuthorization(`provider:${provider}`, () =>
      beginAuthorization({
        organizationId: team._id,
        provider,
      }),
    );
  };

  const handleReconnect = async (
    connectionId: IntegrationConnection["_id"],
  ) => {
    await openAuthorization(connectionId, () => reconnect({ connectionId }));
  };

  const handleDisconnect = async (
    connectionId: IntegrationConnection["_id"],
  ) => {
    setBusyId(connectionId);
    try {
      await disconnect({ connectionId });
      toast.success(t("disconnected"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("disconnectFailed"),
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRetrySync = async (
    connectionId: IntegrationConnection["_id"],
  ) => {
    setBusyId(connectionId);
    try {
      await retrySync({ connectionId });
      toast.success(t("syncRequested"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("syncFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 sm:px-6">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[64rem] pt-[calc(var(--app-header-height)+1.25rem)] pb-5">
          <DashboardPageHeader title={t("title")} />

          {notionEnabled && connections && connections.length > 0 ? (
            <section className="mb-10" aria-labelledby="connected-apps-title">
              <h2
                id="connected-apps-title"
                className="mb-3 text-sm font-medium"
              >
                {t("connectedApps")}
              </h2>
              <DashboardList>
                {connections.map((connection) => (
                  <ConnectionCard
                    key={connection._id}
                    busyId={busyId}
                    canManage={capabilities.canManageIntegrations}
                    connection={connection}
                    onAuthorize={handleAuthorize}
                    onDisconnect={handleDisconnect}
                    onReconnect={handleReconnect}
                    onRetrySync={handleRetrySync}
                  />
                ))}
              </DashboardList>
            </section>
          ) : null}

          {(!notionEnabled || connections !== undefined) &&
          availableProviders.length > 0 ? (
            <section aria-labelledby="available-apps-title">
              <h2
                id="available-apps-title"
                className="mb-3 text-sm font-medium"
              >
                {t("availableApps")}
              </h2>
              <DashboardList>
                {availableProviders.map((provider) => {
                  const available =
                    notionEnabled && provider.availability === "available";
                  const busy = busyId === `provider:${provider.key}`;
                  return (
                    <DashboardListRow
                      className={cn(!available && "opacity-70")}
                      key={provider.key}
                    >
                      <ProviderMark provider={provider.key} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium">{provider.name}</h3>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {t(`providers.${provider.key}`)}
                        </p>
                      </div>
                      {available ? (
                        <Button
                          className="ml-auto shrink-0"
                          disabled={!capabilities.canManageIntegrations || busy}
                          onClick={() => void handleAuthorize(provider.key)}
                          size="sm"
                        >
                          {busy ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <ArrowUpRight />
                          )}
                          {t("actions.connect")}
                        </Button>
                      ) : (
                        <Badge className="ml-auto shrink-0" variant="outline">
                          {t("comingSoon")}
                        </Badge>
                      )}
                    </DashboardListRow>
                  );
                })}
              </DashboardList>
              {notionEnabled && !capabilities.canManageIntegrations ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("adminRequired")}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
