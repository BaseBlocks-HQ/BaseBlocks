import { vercelAdapter } from "@flags-sdk/vercel";
import { flag } from "flags/next";

export const analytics = flag<boolean>({
  key: "analytics",
  adapter: vercelAdapter,
  defaultValue: process.env.NODE_ENV === "development",
  description: "Enable site-scoped analytics while it is under development",
  options: [
    { label: "Off", value: false },
    { label: "On", value: true },
  ],
});

const enabledOutsideProduction =
  process.env.NODE_ENV === "development" ||
  process.env.VERCEL_ENV === "preview";

export const billing = flag<boolean>({
  key: "billing",
  adapter: vercelAdapter,
  defaultValue: enabledOutsideProduction,
  description: "Enable workspace billing while merchant onboarding is pending",
  options: [
    { label: "Off", value: false },
    { label: "On", value: true },
  ],
});

export const editorAi = flag<boolean>({
  key: "editor-ai",
  adapter: vercelAdapter,
  defaultValue: enabledOutsideProduction,
  description: "Enable editor AI while merchant onboarding is pending",
  options: [
    { label: "Off", value: false },
    { label: "On", value: true },
  ],
});

export const notionIntegration = flag<boolean>({
  key: "notion-integration",
  adapter: vercelAdapter,
  defaultValue: false,
  description:
    "Enable the functional Notion integration while it is under development",
  options: [
    { label: "Off", value: false },
    { label: "On", value: true },
  ],
});
