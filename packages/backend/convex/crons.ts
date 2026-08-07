import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "recover stalled integration syncs",
  { minutes: 5 },
  internal.integrationModel.recoverStalledSyncs,
);

export default crons;
