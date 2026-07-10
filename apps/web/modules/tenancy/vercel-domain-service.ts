import "server-only";

import { getRootDomain, normalizeHostname } from "@/modules/tenancy/host";
import { Vercel } from "@vercel/sdk";

function getConfig() {
  const accessToken = process.env.VERCEL_ACCESS_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!accessToken || !projectId || !teamId) {
    throw new Error(
      "Custom domains require VERCEL_ACCESS_TOKEN, VERCEL_PROJECT_ID, and VERCEL_TEAM_ID",
    );
  }
  return { accessToken, projectId, teamId };
}

export function validateCustomHostname(value: string): string {
  const hostname = normalizeHostname(value);
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === getRootDomain() ||
    hostname.endsWith(`.${getRootDomain()}`) ||
    hostname.endsWith(".vercel.app") ||
    !hostname.includes(".") ||
    !/^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z0-9][a-z0-9-]{0,62}$/.test(
      hostname,
    )
  ) {
    throw new Error(
      "Enter a valid custom hostname outside BaseBlocks and vercel.app",
    );
  }
  return hostname;
}

function client() {
  const config = getConfig();
  return { config, vercel: new Vercel({ bearerToken: config.accessToken }) };
}

async function inspectConfiguration(hostname: string) {
  const { config, vercel } = client();
  return vercel.domains.getDomainConfig({
    domain: hostname,
    projectIdOrName: config.projectId,
    teamId: config.teamId,
  });
}

export async function attachDomain(value: string) {
  const hostname = validateCustomHostname(value);
  const { config, vercel } = client();
  const domain = await vercel.projects.addProjectDomain({
    idOrName: config.projectId,
    teamId: config.teamId,
    requestBody: { name: hostname },
  });
  const configuration = await inspectConfiguration(hostname);
  return { domain, configuration };
}

export async function inspectDomain(value: string) {
  const hostname = validateCustomHostname(value);
  const { config, vercel } = client();
  const [domain, configuration] = await Promise.all([
    vercel.projects.getProjectDomain({
      idOrName: config.projectId,
      teamId: config.teamId,
      domain: hostname,
    }),
    inspectConfiguration(hostname),
  ]);
  return { domain, configuration };
}

export async function verifyDomain(value: string) {
  const hostname = validateCustomHostname(value);
  const { config, vercel } = client();
  await vercel.projects.verifyProjectDomain({
    idOrName: config.projectId,
    teamId: config.teamId,
    domain: hostname,
  });
  return inspectDomain(hostname);
}

export async function detachDomain(value: string) {
  const hostname = validateCustomHostname(value);
  const { config, vercel } = client();
  await vercel.projects.removeProjectDomain({
    idOrName: config.projectId,
    teamId: config.teamId,
    domain: hostname,
    requestBody: { removeRedirects: true },
  });
}
