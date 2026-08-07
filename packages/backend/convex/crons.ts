import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "recover stalled integration syncs",
  { minutes: 5 },
  internal.integrationModel.recoverStalledSyncs,
);

crons.interval(
  "recover stalled file extractions",
  { minutes: 5 },
  internal.fileExtraction.recoverStalled,
);

crons.interval(
  "start existing file extraction backfill",
  { minutes: 15 },
  internal.migrations.startFileExtractionBackfill,
  {},
);

crons.interval(
  "recover stalled release publications",
  { minutes: 5 },
  internal.releasePublication.recoverStalled,
);

crons.interval(
  "recover stalled draft restores",
  { minutes: 5 },
  internal.draftRestore.recoverStalled,
);

export default crons;
