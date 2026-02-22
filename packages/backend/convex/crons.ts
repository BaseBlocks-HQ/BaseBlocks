import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Rotate expired access codes every hour
crons.interval(
  "rotate-expired-access-codes",
  { hours: 1 },
  internal.sharing.internal.rotateExpiredCodes,
);

// Clean up expired sessions every 6 hours
crons.interval(
  "cleanup-expired-sessions",
  { hours: 6 },
  internal.sharing.internal.cleanupExpiredSessions,
);

export default crons;
