import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { handleNangoWebhook } from "./integrationWebhooks";
import { handlePolarWebhook } from "./billing_webhooks";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);
http.route({
  path: "/integrations/webhooks/nango",
  method: "POST",
  handler: handleNangoWebhook,
});
http.route({
  path: "/billing/webhooks/polar",
  method: "POST",
  handler: handlePolarWebhook,
});

export default http;
