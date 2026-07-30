import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { handleNangoWebhook } from "./integrationWebhooks";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);
http.route({
  path: "/integrations/webhooks/nango",
  method: "POST",
  handler: handleNangoWebhook,
});

export default http;
