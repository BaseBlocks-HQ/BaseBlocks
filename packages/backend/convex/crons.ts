import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "recover stalled integration syncs",
  { minutes: 5 },
  internal.integrationModel.recoverStalledSyncs,
);

crons.interval(
  "expire included AI credits",
  { minutes: 15 },
  internal.aiCredits.expireDueIncludedLots,
);

crons.interval(
  "repair paid workspace seats",
  { hours: 24 },
  internal.billing.reconcilePaidSeats,
  { limit: 25 },
);

crons.interval(
  "purge abandoned site assets",
  { hours: 1 },
  internal.siteAssetPurge.purge,
  {},
);

export default crons;
