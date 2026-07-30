import { defineApp } from "convex/server";
import { v } from "convex/values";
import betterAuth from "./authComponent/convex.config";

const app = defineApp({
  env: {
    INTEGRATIONS_ENABLED: v.union(v.literal("true"), v.literal("false")),
  },
});
app.use(betterAuth);

export default app;
