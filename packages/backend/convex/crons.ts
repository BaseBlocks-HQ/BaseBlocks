import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "rotate-expired-access-codes",
  { hours: 1 },
  internal.sharing.internal.rotateExpiredCodes,
);

crons.interval(
  "cleanup-expired-sessions",
  { hours: 6 },
  internal.sharing.internal.cleanupExpiredSessions,
);

export default crons;
