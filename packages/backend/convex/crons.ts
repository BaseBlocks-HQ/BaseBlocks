import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "recover stalled integration syncs",
  { minutes: 5 },
  internal.integrationModel.recoverStalledSyncs,
);

crons.interval(
  "recover Polar webhook processing",
  { minutes: 1 },
  internal.billingModel.recoverWebhookEvents,
);

crons.interval(
  "expire included AI credits",
  { minutes: 15 },
  internal.aiCredits.expireDueIncludedLots,
);

crons.interval(
  "reconcile paid workspace seats",
  { minutes: 5 },
  internal.billing.reconcilePaidSeats,
  { limit: 25 },
);

export default crons;
