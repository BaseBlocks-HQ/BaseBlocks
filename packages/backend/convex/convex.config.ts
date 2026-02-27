import migrations from "@convex-dev/migrations/convex.config.js";
import { defineApp } from "convex/server";
import betterAuth from "./betterAuth/convex.config";

const app = defineApp();
app.use(migrations);
app.use(betterAuth);

export default app;
