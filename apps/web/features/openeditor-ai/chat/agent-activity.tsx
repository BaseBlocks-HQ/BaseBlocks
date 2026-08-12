import { Marker, MarkerContent, MarkerIcon } from "@baseblocks/ui/marker";
import { Spinner } from "@baseblocks/ui/spinner";
import {
  ArrowDown01Icon,
  CheckmarkCircle02Icon,
  ToolsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ActivityItem, getAgentActivity } from "./agent-activity-model";

function ActivityMarker({ activity }: { activity: ActivityItem }) {
  return (
    <Marker
      className={activity.state === "error" ? "text-destructive" : undefined}
      role={activity.state === "pending" ? "status" : undefined}
    >
      <MarkerIcon>
        {activity.state === "pending" ? (
          <Spinner className="size-4" />
        ) : activity.state === "completed" ? (
          <HugeiconsIcon icon={CheckmarkCircle02Icon} />
        ) : (
          <HugeiconsIcon icon={ToolsIcon} />
        )}
      </MarkerIcon>
      <MarkerContent
        className={activity.state === "pending" ? "shimmer" : undefined}
      >
        {activity.label}
        {activity.detail ? ` — ${activity.detail}` : null}
      </MarkerContent>
    </Marker>
  );
}

export function AgentActivity({ source }: { source: unknown }) {
  const activities = getAgentActivity(source);
  if (activities.length === 0) return null;

  return (
    <div aria-label="Agent activity" className="space-y-2 px-1">
      {activities.map((activity) =>
        activity.details?.length ? (
          <details className="group/activity" key={activity.id}>
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">
                <ActivityMarker activity={activity} />
              </span>
              <HugeiconsIcon
                aria-hidden
                className="size-3.5 shrink-0 transition-transform group-open/activity:rotate-180"
                icon={ArrowDown01Icon}
              />
            </summary>
            <dl className="mt-2 ml-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg bg-muted/50 px-3 py-2 text-xs">
              {activity.details.map((detail) => (
                <div
                  className="contents"
                  key={`${detail.label}:${detail.value}`}
                >
                  <dt className="text-muted-foreground">{detail.label}</dt>
                  <dd className="min-w-0 wrap-break-word text-foreground">
                    {detail.value}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        ) : (
          <ActivityMarker activity={activity} key={activity.id} />
        ),
      )}
    </div>
  );
}

export function PendingAgentActivity({
  requestPersisted,
}: {
  requestPersisted: boolean;
}) {
  return (
    <div aria-label="Agent activity" className="space-y-2" role="status">
      {requestPersisted ? (
        <Marker>
          <MarkerIcon>
            <HugeiconsIcon icon={CheckmarkCircle02Icon} />
          </MarkerIcon>
          <MarkerContent>Request received</MarkerContent>
        </Marker>
      ) : null}
      <Marker>
        <MarkerIcon>
          <Spinner className="size-4" />
        </MarkerIcon>
        <MarkerContent className="shimmer">
          {requestPersisted ? "Working on your site…" : "Starting the agent…"}
        </MarkerContent>
      </Marker>
    </div>
  );
}
