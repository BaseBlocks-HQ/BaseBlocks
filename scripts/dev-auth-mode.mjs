import { execFileSync, spawn } from "node:child_process";

const LOCAL_ORIGIN = "http://localhost:3001";

function printLine(message, stream = process.stdout) {
  stream.write(`${message}\n`);
}

function normalizeOrigin(origin, envName) {
  try {
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`${envName} must use http or https`);
    }
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
      throw new Error(`${envName} must be an origin without a path`);
    }
    return parsed.origin;
  } catch (error) {
    throw new Error(
      `${envName} is invalid: ${origin}${error instanceof Error ? ` (${error.message})` : ""}`,
    );
  }
}

function detectTailscaleOrigin() {
  try {
    const output = execFileSync("tailscale", ["status", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const status = JSON.parse(output);
    const dnsName = status?.Self?.DNSName;
    if (typeof dnsName !== "string" || dnsName.length === 0) {
      return null;
    }
    return normalizeOrigin(`https://${dnsName.replace(/\.$/, "")}`, "DNSName");
  } catch {
    return null;
  }
}

function getMobileOrigin() {
  const explicitOrigin = process.env.DEV_AUTH_MOBILE_ORIGIN;
  if (explicitOrigin) {
    return normalizeOrigin(explicitOrigin, "DEV_AUTH_MOBILE_ORIGIN");
  }

  const detectedOrigin = detectTailscaleOrigin();
  if (detectedOrigin) {
    return detectedOrigin;
  }

  throw new Error(
    "Mobile auth origin could not be determined. Set DEV_AUTH_MOBILE_ORIGIN to your HTTPS Tailscale hostname, for example https://your-machine.tailnet.ts.net.",
  );
}

function resolveOrigins(mode) {
  const localOrigin = normalizeOrigin(
    process.env.DEV_AUTH_LOCAL_ORIGIN ?? LOCAL_ORIGIN,
    "DEV_AUTH_LOCAL_ORIGIN",
  );

  if (mode === "mobile") {
    const mobileOrigin = getMobileOrigin();
    return [mobileOrigin, localOrigin];
  }

  const mobileOrigin = process.env.DEV_AUTH_MOBILE_ORIGIN
    ? normalizeOrigin(
        process.env.DEV_AUTH_MOBILE_ORIGIN,
        "DEV_AUTH_MOBILE_ORIGIN",
      )
    : detectTailscaleOrigin();

  return mobileOrigin ? [localOrigin, mobileOrigin] : [localOrigin];
}

function buildEnv(mode) {
  const origins = resolveOrigins(mode);

  return {
    ...process.env,
    APP_URL: origins.join(","),
    AUTH_REDIRECT_MODE: "same-origin",
    NEXT_PUBLIC_AUTH_REDIRECT_MODE: "same-origin",
  };
}

const [, , mode = "local", maybePrintFlag] = process.argv;

if (!["local", "mobile"].includes(mode)) {
  printLine(`Unsupported dev auth mode: ${mode}`, process.stderr);
  process.exit(1);
}

const env = buildEnv(mode);

if (maybePrintFlag === "--print-env") {
  printLine(
    JSON.stringify(
      {
        mode,
        APP_URL: env.APP_URL,
        AUTH_REDIRECT_MODE: env.AUTH_REDIRECT_MODE,
        NEXT_PUBLIC_AUTH_REDIRECT_MODE: env.NEXT_PUBLIC_AUTH_REDIRECT_MODE,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

printLine(`[dev:${mode}] APP_URL=${env.APP_URL}`);
if (mode === "mobile") {
  printLine(
    "[dev:mobile] If the page does not load on your phone, run: tailscale serve --bg --https=443 http://127.0.0.1:3001",
  );
}

const child = spawn("bun", ["run", "dev:raw"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
