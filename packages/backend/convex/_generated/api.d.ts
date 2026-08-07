/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiChangesets from "../aiChangesets.js";
import type * as aiConversations from "../aiConversations.js";
import type * as aiEntitlements from "../aiEntitlements.js";
import type * as aiRuns from "../aiRuns.js";
import type * as aiWorkspaces from "../aiWorkspaces.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as deploymentPreflight from "../deploymentPreflight.js";
import type * as draftRestore from "../draftRestore.js";
import type * as draftRestores from "../draftRestores.js";
import type * as editorWorkspace from "../editorWorkspace.js";
import type * as fileExtraction from "../fileExtraction.js";
import type * as fileExtractionAction from "../fileExtractionAction.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as integrationAccess from "../integrationAccess.js";
import type * as integrationModel from "../integrationModel.js";
import type * as integrationNango from "../integrationNango.js";
import type * as integrationWebhookSignature from "../integrationWebhookSignature.js";
import type * as integrationWebhooks from "../integrationWebhooks.js";
import type * as integrations from "../integrations.js";
import type * as libraries from "../libraries.js";
import type * as model_aiChangesetAudit from "../model/aiChangesetAudit.js";
import type * as model_aiChangesetPlan from "../model/aiChangesetPlan.js";
import type * as model_aiChangesetReferences from "../model/aiChangesetReferences.js";
import type * as model_aiChangesetRevert from "../model/aiChangesetRevert.js";
import type * as model_aiRunPolicy from "../model/aiRunPolicy.js";
import type * as model_aiWorkspaceBounds from "../model/aiWorkspaceBounds.js";
import type * as model_aiWorkspaceFingerprint from "../model/aiWorkspaceFingerprint.js";
import type * as model_contentObjects from "../model/contentObjects.js";
import type * as model_draft from "../model/draft.js";
import type * as model_draftChanges from "../model/draftChanges.js";
import type * as model_fileExtraction from "../model/fileExtraction.js";
import type * as model_libraryAccess from "../model/libraryAccess.js";
import type * as model_pageDeletion from "../model/pageDeletion.js";
import type * as model_pageDocuments from "../model/pageDocuments.js";
import type * as model_pageHierarchy from "../model/pageHierarchy.js";
import type * as model_publishedRelease from "../model/publishedRelease.js";
import type * as model_releaseChangeDetails from "../model/releaseChangeDetails.js";
import type * as model_releaseChanges from "../model/releaseChanges.js";
import type * as model_releaseDiff from "../model/releaseDiff.js";
import type * as model_releaseOperations from "../model/releaseOperations.js";
import type * as model_releaseState from "../model/releaseState.js";
import type * as model_siteDeletion from "../model/siteDeletion.js";
import type * as organizations from "../organizations.js";
import type * as pageContent from "../pageContent.js";
import type * as pageContentFormat from "../pageContentFormat.js";
import type * as pages from "../pages.js";
import type * as permissions from "../permissions.js";
import type * as published from "../published.js";
import type * as releasePublication from "../releasePublication.js";
import type * as releases from "../releases.js";
import type * as search from "../search.js";
import type * as sharing from "../sharing.js";
import type * as siteDomains from "../siteDomains.js";
import type * as sites from "../sites.js";
import type * as validators_ai from "../validators/ai.js";
import type * as validators_integrations from "../validators/integrations.js";
import type * as validators_releases from "../validators/releases.js";
import type * as validators_sites from "../validators/sites.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiChangesets: typeof aiChangesets;
  aiConversations: typeof aiConversations;
  aiEntitlements: typeof aiEntitlements;
  aiRuns: typeof aiRuns;
  aiWorkspaces: typeof aiWorkspaces;
  auth: typeof auth;
  crons: typeof crons;
  deploymentPreflight: typeof deploymentPreflight;
  draftRestore: typeof draftRestore;
  draftRestores: typeof draftRestores;
  editorWorkspace: typeof editorWorkspace;
  fileExtraction: typeof fileExtraction;
  fileExtractionAction: typeof fileExtractionAction;
  files: typeof files;
  http: typeof http;
  integrationAccess: typeof integrationAccess;
  integrationModel: typeof integrationModel;
  integrationNango: typeof integrationNango;
  integrationWebhookSignature: typeof integrationWebhookSignature;
  integrationWebhooks: typeof integrationWebhooks;
  integrations: typeof integrations;
  libraries: typeof libraries;
  "model/aiChangesetAudit": typeof model_aiChangesetAudit;
  "model/aiChangesetPlan": typeof model_aiChangesetPlan;
  "model/aiChangesetReferences": typeof model_aiChangesetReferences;
  "model/aiChangesetRevert": typeof model_aiChangesetRevert;
  "model/aiRunPolicy": typeof model_aiRunPolicy;
  "model/aiWorkspaceBounds": typeof model_aiWorkspaceBounds;
  "model/aiWorkspaceFingerprint": typeof model_aiWorkspaceFingerprint;
  "model/contentObjects": typeof model_contentObjects;
  "model/draft": typeof model_draft;
  "model/draftChanges": typeof model_draftChanges;
  "model/fileExtraction": typeof model_fileExtraction;
  "model/libraryAccess": typeof model_libraryAccess;
  "model/pageDeletion": typeof model_pageDeletion;
  "model/pageDocuments": typeof model_pageDocuments;
  "model/pageHierarchy": typeof model_pageHierarchy;
  "model/publishedRelease": typeof model_publishedRelease;
  "model/releaseChangeDetails": typeof model_releaseChangeDetails;
  "model/releaseChanges": typeof model_releaseChanges;
  "model/releaseDiff": typeof model_releaseDiff;
  "model/releaseOperations": typeof model_releaseOperations;
  "model/releaseState": typeof model_releaseState;
  "model/siteDeletion": typeof model_siteDeletion;
  organizations: typeof organizations;
  pageContent: typeof pageContent;
  pageContentFormat: typeof pageContentFormat;
  pages: typeof pages;
  permissions: typeof permissions;
  published: typeof published;
  releasePublication: typeof releasePublication;
  releases: typeof releases;
  search: typeof search;
  sharing: typeof sharing;
  siteDomains: typeof siteDomains;
  sites: typeof sites;
  "validators/ai": typeof validators_ai;
  "validators/integrations": typeof validators_integrations;
  "validators/releases": typeof validators_releases;
  "validators/sites": typeof validators_sites;
  workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../authComponent/_generated/component.js").ComponentApi<"betterAuth">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  anydoc: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"anydoc">;
};
