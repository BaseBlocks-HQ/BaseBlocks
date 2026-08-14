import { defineApp } from "convex/server";
import { v } from "convex/values";
import betterAuth from "./authComponent/convex.config";
import workflow from "@convex-dev/workflow/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";

const app = defineApp({
  env: {
    INTEGRATIONS_ENABLED: v.union(v.literal("true"), v.literal("false")),
    BASEBLOCKS_BILLING_ENVIRONMENT: v.optional(
      v.union(v.literal("sandbox"), v.literal("production")),
    ),
    POLAR_ACCESS_TOKEN: v.optional(v.string()),
    POLAR_WEBHOOK_SECRET: v.optional(v.string()),
    POLAR_ALLOW_PRODUCTION: v.optional(
      v.union(v.literal("true"), v.literal("false")),
    ),
    BASEBLOCKS_PAST_DUE_GRACE_DAYS: v.optional(v.string()),
  },
});
app.use(betterAuth);
app.use(workflow);
app.use(workpool, { name: "anydoc" });

export default app;
