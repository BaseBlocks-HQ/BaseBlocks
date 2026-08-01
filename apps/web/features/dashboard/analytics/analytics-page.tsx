"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDownRight01Icon,
  ArrowUpRight01Icon,
  Analytics01Icon,
  RadioIcon,
} from "@hugeicons/core-free-icons";
import { useTeamAccess } from "@/features/authentication/team-access";
import { DashboardPageHeader } from "@/features/dashboard/layout/dashboard-page";
import { api } from "@baseblocks/backend";
import { Card, CardContent, CardHeader, CardTitle } from "@baseblocks/ui/card";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type {
  AnalyticsRankedValue,
  AnalyticsSnapshot,
  SiteAnalyticsResponse,
} from "./analytics-types";

const numberFormatter = new Intl.NumberFormat("en-US");
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
function Comparison({
  lowerIsBetter = false,
  value,
}: {
  lowerIsBetter?: boolean;
  value: number;
}) {
  const positive = value > 0;
  const favorable = lowerIsBetter ? !positive : positive;
  const Icon = positive ? ArrowUpRight01Icon : ArrowDownRight01Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        favorable
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400",
      )}
    >
      <HugeiconsIcon
        aria-hidden
        className="size-3"
        icon={Icon}
        strokeWidth={1.8}
      />
      {Math.abs(value)}%
      <span className="sr-only"> compared with the previous period</span>
    </span>
  );
}

function MetricCard({
  comparison,
  label,
  lowerIsBetter,
  suffix,
  value,
}: {
  comparison?: number;
  label: string;
  lowerIsBetter?: boolean;
  suffix?: string;
  value: number;
}) {
  return (
    <Card className="gap-3 border-0 py-4 shadow-none">
      <CardContent className="px-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-3xl font-medium tracking-[-0.04em] tabular-nums">
            {numberFormatter.format(value)}
            {suffix}
          </p>
          {comparison === undefined ? null : (
            <Comparison lowerIsBetter={lowerIsBetter} value={comparison} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TrafficChart({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const points =
    snapshot.timeseries.length > 0
      ? snapshot.timeseries
      : [{ date: snapshot.range.to.slice(0, 10), pageViews: 0, visitors: 0 }];
  const width = 720;
  const height = 220;
  const insetX = 18;
  const insetY = 18;
  const max = Math.max(...points.map((point) => point.pageViews), 1);
  const x = (index: number) =>
    insetX + (index / Math.max(points.length - 1, 1)) * (width - insetX * 2);
  const y = (value: number) =>
    insetY + (1 - value / max) * (height - insetY * 2);
  const line = points
    .map((point, index) => `${x(index)},${y(point.pageViews)}`)
    .join(" ");
  const area = `${insetX},${height - insetY} ${line} ${width - insetX},${height - insetY}`;

  return (
    <div>
      <div className="h-[14rem] w-full overflow-hidden">
        <svg
          aria-label={`Daily page views for ${snapshot.range.label.toLowerCase()}`}
          className="h-full w-full"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <defs>
            <linearGradient id="traffic-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((fraction) => (
            <line
              key={fraction}
              className="stroke-border"
              strokeDasharray="3 5"
              strokeWidth="1"
              x1={insetX}
              x2={width - insetX}
              y1={insetY + fraction * (height - insetY * 2)}
              y2={insetY + fraction * (height - insetY * 2)}
            />
          ))}
          <polygon
            className="fill-[url(#traffic-fill)] text-primary"
            points={area}
          />
          <polyline
            className="fill-none stroke-primary"
            points={line}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          {points.map((point, index) => (
            <circle
              key={point.date}
              className="fill-background stroke-primary"
              cx={x(index)}
              cy={y(point.pageViews)}
              r="3.5"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
      <div
        className="grid text-center text-[0.6875rem] text-muted-foreground"
        style={{
          gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
        }}
      >
        {points.map((point) => (
          <span key={point.date}>
            {shortDateFormatter.format(new Date(`${point.date}T00:00:00Z`))}
          </span>
        ))}
      </div>
    </div>
  );
}

function RankedList({ items }: { items: AnalyticsRankedValue[] }) {
  const max = Math.max(...items.map((item) => item.visitors), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.key}>
          <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
            <span className="min-w-0 truncate" title={item.key}>
              {item.key}
            </span>
            <span className="shrink-0 font-medium tabular-nums">
              {item.visitors}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/75"
              style={{ width: `${(item.visitors / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BreakdownCard({
  items,
  title,
}: {
  items: AnalyticsRankedValue[];
  title: string;
}) {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <RankedList items={items} />
      </CardContent>
    </Card>
  );
}

function AnalyticsDashboard({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  return (
    <>
      <section
        aria-label="Key metrics"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          comparison={snapshot.comparisons.visitors}
          label="Visitors"
          value={snapshot.totals.visitors}
        />
        <MetricCard
          comparison={snapshot.comparisons.pageViews}
          label="Page views"
          value={snapshot.totals.pageViews}
        />
        <MetricCard
          comparison={snapshot.comparisons.bounceRate}
          label="Bounce rate"
          lowerIsBetter
          suffix="%"
          value={snapshot.totals.bounceRate}
        />
        <Card className="gap-3 border-0 py-4 shadow-none">
          <CardContent className="px-4">
            <p className="text-xs font-medium text-muted-foreground">
              Online now
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-3xl font-medium tracking-[-0.04em] tabular-nums">
                {snapshot.totals.online}
              </p>
              <HugeiconsIcon
                icon={RadioIcon}
                aria-hidden
                className="mb-1 size-4 text-emerald-500"
                strokeWidth={1.8}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-3 border-0 shadow-none">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-medium">
              Traffic over time
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Page views · {snapshot.range.label}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-medium tabular-nums">
              {snapshot.totals.pageViews}
            </p>
            <p className="text-xs text-muted-foreground">total views</p>
          </div>
        </CardHeader>
        <CardContent>
          <TrafficChart snapshot={snapshot} />
        </CardContent>
      </Card>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top pages</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Page</th>
                  <th className="pb-2 text-right font-medium">Visitors</th>
                  <th className="pb-2 text-right font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.pages.map((page) => (
                  <tr
                    className="transition-colors hover:bg-muted/25"
                    key={page.key}
                  >
                    <td
                      className="max-w-[24rem] truncate py-3 pr-4 font-mono text-xs"
                      title={page.key}
                    >
                      {page.key}
                    </td>
                    <td className="py-3 text-right font-medium tabular-nums">
                      {page.visitors}
                    </td>
                    <td className="py-3 text-right text-muted-foreground tabular-nums">
                      {page.pageViews}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <BreakdownCard items={snapshot.countries} title="Countries" />
          <BreakdownCard items={snapshot.devices} title="Devices" />
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <BreakdownCard items={snapshot.referrers} title="Referrers" />
        <BreakdownCard
          items={snapshot.operatingSystems}
          title="Operating systems"
        />
      </div>
    </>
  );
}

function AnalyticsState({
  analytics,
  loading,
}: {
  analytics: SiteAnalyticsResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (!analytics || analytics.status === "unavailable") {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center text-center">
        <HugeiconsIcon
          aria-hidden
          className="mb-3 size-8 text-muted-foreground"
          icon={Analytics01Icon}
          strokeWidth={1.5}
        />
        <p className="text-sm font-medium">Analytics isn&apos;t available</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {analytics?.status === "unavailable"
            ? analytics.message
            : "We couldn't load analytics for this site."}
        </p>
      </div>
    );
  }

  return <AnalyticsDashboard snapshot={analytics.snapshot} />;
}

export function AnalyticsPage({ initialSiteId }: { initialSiteId?: string }) {
  const router = useRouter();
  const { team } = useTeamAccess();
  const sites = useQuery(api.sites.listByTeam, {
    organizationId: team._id,
  });
  const [selectedSiteId, setSelectedSiteId] = useState(initialSiteId ?? "");
  const [analytics, setAnalytics] = useState<SiteAnalyticsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const selectedSite = sites?.find((site) => site._id === selectedSiteId);
  const activeSiteId = selectedSite?._id;

  useEffect(() => {
    if (!sites || sites.length === 0) return;
    if (sites.some((site) => site._id === selectedSiteId)) return;

    const firstSiteId = sites[0]?._id;
    if (!firstSiteId) return;
    setSelectedSiteId(firstSiteId);
    router.replace(`?site=${encodeURIComponent(firstSiteId)}`, {
      scroll: false,
    });
  }, [router, selectedSiteId, sites]);

  useEffect(() => {
    if (!activeSiteId) {
      setAnalytics(null);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      organizationId: team._id,
      siteId: activeSiteId,
    });
    setLoading(true);
    setAnalytics(null);

    void fetch(`/api/analytics?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as
          | SiteAnalyticsResponse
          | { error?: string };
        if (!response.ok) {
          throw new Error(
            "error" in result && result.error
              ? result.error
              : `Analytics request failed (${response.status})`,
          );
        }
        return result as SiteAnalyticsResponse;
      })
      .then((result) => setAnalytics(result))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setAnalytics({
          message:
            error instanceof Error
              ? error.message
              : "We couldn't load analytics for this site.",
          status: "unavailable",
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeSiteId, team._id]);

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    router.replace(`?site=${encodeURIComponent(siteId)}`, { scroll: false });
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 sm:px-6">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[64rem] pt-[calc(var(--app-header-height)+1.25rem)] pb-8">
          <DashboardPageHeader
            action={
              sites && sites.length > 0 ? (
                <Select onValueChange={handleSiteChange} value={selectedSiteId}>
                  <SelectTrigger
                    aria-label="Select site"
                    className="h-9 min-w-44 border-0 bg-muted/60 shadow-none"
                  >
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site._id} value={site._id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null
            }
            title="Analytics"
          />

          {sites?.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <HugeiconsIcon
                aria-hidden
                className="mb-3 size-8 text-muted-foreground"
                icon={Analytics01Icon}
                strokeWidth={1.5}
              />
              <p className="text-sm font-medium">No sites yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a site to start viewing analytics.
              </p>
            </div>
          ) : (
            <AnalyticsState
              analytics={analytics}
              loading={sites === undefined || loading}
            />
          )}
        </div>
      </div>
    </main>
  );
}
