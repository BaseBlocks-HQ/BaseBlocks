import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Row = Record<string, unknown> & { _id: string };

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

async function rows(root: string, table: string): Promise<Row[]> {
  const text = await readFile(join(root, table, "documents.jsonl"), "utf8");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Row);
}

const [snapshot, objectManifest] = process.argv.slice(2);
if (!snapshot || !objectManifest)
  throw new Error("Usage: snapshot-audit.ts <snapshot.zip> <object-manifest.json>");

const root = await mkdtemp(join(tmpdir(), "baseblocks-migration-audit-"));
try {
  const unzip = Bun.spawnSync(["unzip", "-q", snapshot, "-d", root]);
  if (unzip.exitCode !== 0) throw new Error(unzip.stderr.toString());
  const [teams, members, sites, pages, sections, columns, blocks, assets, documents, legacySearch] =
    await Promise.all([
      rows(root, "teams"),
      rows(root, "members"),
      rows(root, "sites"),
      rows(root, "pages"),
      rows(root, "sections"),
      rows(root, "columns"),
      rows(root, "blocks"),
      rows(root, "assets"),
      rows(root, "documents"),
      rows(root, "searchableContent"),
    ]);
  const organizations = await rows(root, "_components/betterAuth/organization");
  const authMembers = await rows(root, "_components/betterAuth/member");
  const byId = <T extends Row>(items: T[]) =>
    new Map(items.map((item) => [item._id, item]));
  const teamById = byId(teams);
  const organizationById = byId(organizations);
  const assetById = byId(assets);
  const pageById = byId(pages);
  const ownership = sites.map((site) => {
    const team = teamById.get(site.teamId as string);
    const organizationId = team?.organizationId as string | undefined;
    if (!team || !organizationId || !organizationById.has(organizationId))
      throw new Error(`Invalid ownership chain for site ${site._id}`);
    return { siteId: site._id, organizationId };
  });
  const legacyMemberKeys = new Set(
    members.map((member) => {
      const team = teamById.get(member.teamId as string);
      return `${team?.organizationId}:${member.userId}`;
    }),
  );
  const authMemberKeys = new Set(
    authMembers.map((member) => `${member.organizationId}:${member.userId}`),
  );
  const missingMemberships = [...legacyMemberKeys].filter(
    (key) => !authMemberKeys.has(key),
  );
  const pageContents = pages.map((page) => ({
    pageId: page._id,
    siteId: page.siteId,
    tabs: page.pageTabs ?? [],
    sections: sections
      .filter((section) => section.pageId === page._id)
      .sort((a, b) => (a.order as number) - (b.order as number))
      .map((section, sectionOrder) => ({
        id: section._id,
        tabId: section.tabId,
        region: section.region,
        order: sectionOrder,
        columns: columns
          .filter((column) => column.sectionId === section._id)
          .sort((a, b) => (a.order as number) - (b.order as number))
          .map((column, columnOrder) => ({
            id: column._id,
            order: columnOrder,
            blocks: blocks
              .filter((block) => block.columnId === column._id)
              .sort((a, b) => (a.order as number) - (b.order as number))
              .map((block, blockOrder) => ({
                id: block._id,
                type: block.type,
                content: block.content,
                order: blockOrder,
              })),
          })),
      })),
  }));
  const files = assets.map((asset) => ({
    legacyAssetId: asset._id,
    siteId: asset.siteId,
    kind: asset.kind,
    visibility: asset.visibility,
    objectKey: asset.objectKey,
    filename: asset.filename,
    contentType: asset.contentType,
    size: asset.size,
    checksum: asset.checksum,
    uploadedBy: asset.uploadedBy,
    createdAt: asset.createdAt,
  }));
  const danglingDocuments = documents.filter(
    (document) => !assetById.has(document.assetId as string),
  );
  const danglingSearchFiles = legacySearch.filter(
    (entry) =>
      (entry.metadata as Record<string, unknown>).assetId &&
      !assetById.has((entry.metadata as Record<string, unknown>).assetId as string),
  );
  const orphanedLegacySearch = legacySearch.filter((entry) => {
    if (entry.contentType === "page") return !pageById.has(entry.sourceId as string);
    return !documents.some((document) => document._id === entry.sourceId);
  });
  const manifest = JSON.parse(await readFile(objectManifest, "utf8")) as {
    assets: Array<{ assetId: string; objectKey: string; size: number }>;
  };
  const manifestByAsset = new Map(
    manifest.assets.map((asset) => [asset.assetId, asset]),
  );
  const manifestMismatches = assets.filter((asset) => {
    const item = manifestByAsset.get(asset._id);
    return !item || item.objectKey !== asset.objectKey || item.size !== asset.size;
  });
  const failures = {
    missingMemberships: missingMemberships.length,
    danglingDocuments: danglingDocuments.length,
    danglingSearchFiles: danglingSearchFiles.length,
    orphanedLegacySearch: orphanedLegacySearch.length,
    manifestMismatches: manifestMismatches.length,
    duplicateObjectKeys:
      files.length - new Set(files.map((file) => file.objectKey)).size,
  };
  const result = {
    counts: {
      teams: teams.length,
      members: members.length,
      sites: sites.length,
      pages: pages.length,
      sections: sections.length,
      columns: columns.length,
      blocks: blocks.length,
      pageContents: pageContents.length,
      assets: assets.length,
      files: files.length,
      documents: documents.length,
      legacySearch: legacySearch.length,
      organizations: organizations.length,
      authMembers: authMembers.length,
      objectManifest: manifest.assets.length,
    },
    failures,
    digests: {
      ownership: digest(ownership),
      pageContents: digest(pageContents),
      files: digest(files),
    },
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (Object.values(failures).some((count) => count !== 0)) process.exitCode = 1;
} finally {
  await rm(root, { recursive: true, force: true });
}
