import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./betterAuthSetup";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins: (process.env.APP_URL ?? "")
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean),
  },
});

export default http;
