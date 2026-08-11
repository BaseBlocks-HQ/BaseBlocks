import { join } from "node:path";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
if (!convexUrl) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL must be provided by `convex deploy` before the web build",
  );
}

const parsed = new URL(convexUrl);
if (!parsed.hostname.endsWith(".convex.cloud")) {
  throw new Error(`Unexpected Convex cloud URL: ${convexUrl}`);
}

const convexSiteUrl = new URL(convexUrl);
convexSiteUrl.hostname = convexSiteUrl.hostname.replace(
  ".convex.cloud",
  ".convex.site",
);

const child = Bun.spawn(["bun", "run", "build"], {
  cwd: join(import.meta.dir, "..", "apps/web"),
  env: {
    ...process.env,
    NEXT_PUBLIC_CONVEX_SITE_URL: convexSiteUrl.origin,
  },
  stdout: "inherit",
  stderr: "inherit",
});

const exitCode = await child.exited;
if (exitCode !== 0) {
  throw new Error(`web build exited with code ${exitCode}`);
}
