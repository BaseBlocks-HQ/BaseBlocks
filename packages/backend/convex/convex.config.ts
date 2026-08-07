import { defineApp } from "convex/server";
import { v } from "convex/values";
import betterAuth from "./authComponent/convex.config";
import workflow from "@convex-dev/workflow/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";

const app = defineApp({
  env: {
    INTEGRATIONS_ENABLED: v.union(v.literal("true"), v.literal("false")),
  },
});
app.use(betterAuth);
app.use(workflow);
app.use(workpool, { name: "anydoc" });

export default app;
