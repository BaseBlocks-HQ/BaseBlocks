/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assets_mutations from "../assets/mutations.js";
import type * as assets_queries from "../assets/queries.js";
import type * as assets_urls from "../assets/urls.js";
import type * as auth from "../auth.js";
import type * as authOrigins from "../authOrigins.js";
import type * as authSetup from "../authSetup.js";
import type * as crons from "../crons.js";
import type * as deployments_mutations from "../deployments/mutations.js";
import type * as deployments_queries from "../deployments/queries.js";
import type * as deployments_snapshots from "../deployments/snapshots.js";
import type * as documentFolders_mutations from "../documentFolders/mutations.js";
import type * as documentFolders_queries from "../documentFolders/queries.js";
import type * as documentLibraries_mutations from "../documentLibraries/mutations.js";
import type * as documentLibraries_queries from "../documentLibraries/queries.js";
import type * as documents_cleanup from "../documents/cleanup.js";
import type * as documents_listings from "../documents/listings.js";
import type * as documents_mutations from "../documents/mutations.js";
import type * as documents_queries from "../documents/queries.js";
import type * as documents_searchMetadata from "../documents/searchMetadata.js";
import type * as http from "../http.js";
import type * as layouts_mutations from "../layouts/mutations.js";
import type * as layouts_queries from "../layouts/queries.js";
import type * as layouts_validators from "../layouts/validators.js";
import type * as members_internal from "../members/internal.js";
import type * as members_mutations from "../members/mutations.js";
import type * as members_profileMerge from "../members/profileMerge.js";
import type * as members_queries from "../members/queries.js";
import type * as objectStorage_actions from "../objectStorage/actions.js";
import type * as objectStorage_config from "../objectStorage/config.js";
import type * as objectStorage_deleteObject from "../objectStorage/deleteObject.js";
import type * as pages_mutations from "../pages/mutations.js";
import type * as pages_queries from "../pages/queries.js";
import type * as pages_tree from "../pages/tree.js";
import type * as search_extractBlockNoteText from "../search/extractBlockNoteText.js";
import type * as search_indexPageContent from "../search/indexPageContent.js";
import type * as search_mutations from "../search/mutations.js";
import type * as search_queries from "../search/queries.js";
import type * as sharing_access from "../sharing/access.js";
import type * as sharing_crypto from "../sharing/crypto.js";
import type * as sharing_internal from "../sharing/internal.js";
import type * as sharing_mutations from "../sharing/mutations.js";
import type * as sharing_pageAccess from "../sharing/pageAccess.js";
import type * as sharing_queries from "../sharing/queries.js";
import type * as siteAudiences_mutations from "../siteAudiences/mutations.js";
import type * as siteAudiences_queries from "../siteAudiences/queries.js";
import type * as sites_markModified from "../sites/markModified.js";
import type * as sites_mutations from "../sites/mutations.js";
import type * as sites_queries from "../sites/queries.js";
import type * as sites_resolvers from "../sites/resolvers.js";
import type * as sites_validators from "../sites/validators.js";
import type * as teams_mutations from "../teams/mutations.js";
import type * as teams_queries from "../teams/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "assets/mutations": typeof assets_mutations;
  "assets/queries": typeof assets_queries;
  "assets/urls": typeof assets_urls;
  auth: typeof auth;
  authOrigins: typeof authOrigins;
  authSetup: typeof authSetup;
  crons: typeof crons;
  "deployments/mutations": typeof deployments_mutations;
  "deployments/queries": typeof deployments_queries;
  "deployments/snapshots": typeof deployments_snapshots;
  "documentFolders/mutations": typeof documentFolders_mutations;
  "documentFolders/queries": typeof documentFolders_queries;
  "documentLibraries/mutations": typeof documentLibraries_mutations;
  "documentLibraries/queries": typeof documentLibraries_queries;
  "documents/cleanup": typeof documents_cleanup;
  "documents/listings": typeof documents_listings;
  "documents/mutations": typeof documents_mutations;
  "documents/queries": typeof documents_queries;
  "documents/searchMetadata": typeof documents_searchMetadata;
  http: typeof http;
  "layouts/mutations": typeof layouts_mutations;
  "layouts/queries": typeof layouts_queries;
  "layouts/validators": typeof layouts_validators;
  "members/internal": typeof members_internal;
  "members/mutations": typeof members_mutations;
  "members/profileMerge": typeof members_profileMerge;
  "members/queries": typeof members_queries;
  "objectStorage/actions": typeof objectStorage_actions;
  "objectStorage/config": typeof objectStorage_config;
  "objectStorage/deleteObject": typeof objectStorage_deleteObject;
  "pages/mutations": typeof pages_mutations;
  "pages/queries": typeof pages_queries;
  "pages/tree": typeof pages_tree;
  "search/extractBlockNoteText": typeof search_extractBlockNoteText;
  "search/indexPageContent": typeof search_indexPageContent;
  "search/mutations": typeof search_mutations;
  "search/queries": typeof search_queries;
  "sharing/access": typeof sharing_access;
  "sharing/crypto": typeof sharing_crypto;
  "sharing/internal": typeof sharing_internal;
  "sharing/mutations": typeof sharing_mutations;
  "sharing/pageAccess": typeof sharing_pageAccess;
  "sharing/queries": typeof sharing_queries;
  "siteAudiences/mutations": typeof siteAudiences_mutations;
  "siteAudiences/queries": typeof siteAudiences_queries;
  "sites/markModified": typeof sites_markModified;
  "sites/mutations": typeof sites_mutations;
  "sites/queries": typeof sites_queries;
  "sites/resolvers": typeof sites_resolvers;
  "sites/validators": typeof sites_validators;
  "teams/mutations": typeof teams_mutations;
  "teams/queries": typeof teams_queries;
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
};
