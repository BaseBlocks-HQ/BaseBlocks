import { join } from "node:path";

const root = join(import.meta.dir, "..");
const webRoot = join(root, "apps/web");
const backendRoot = join(root, "packages/backend");
const environment = process.env.VERCEL_ENV ?? "development";
const deployKey = process.env.CONVEX_DEPLOY_KEY?.trim();

async function run(command: string[], cwd: string, env = process.env) {
  const child = Bun.spawn(command, {
    cwd,
    env,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} exited with code ${exitCode}`);
  }
}

if (environment === "preview" || environment === "production") {
  if (!deployKey) {
    throw new Error(
      `CONVEX_DEPLOY_KEY is required for Vercel ${environment} builds`,
    );
  }

  // Convex preview keys create/reuse a deployment named after the Vercel
  // branch. Production keys target the shared production deployment.
  await run(
    [
      "bunx",
      "convex",
      "deploy",
      "--cmd-url-env-var-name",
      "NEXT_PUBLIC_CONVEX_URL",
      "--cmd",
      "bun ../../scripts/build-web.ts",
    ],
    backendRoot,
  );
} else {
  await run(["bun", "run", "build"], webRoot);
}
