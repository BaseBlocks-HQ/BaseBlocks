/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access_mutations from "../access/mutations.js";
import type * as access_queries from "../access/queries.js";
import type * as auth from "../auth.js";
import type * as blocks_mutations from "../blocks/mutations.js";
import type * as blocks_queries from "../blocks/queries.js";
import type * as companies_mutations from "../companies/mutations.js";
import type * as companies_queries from "../companies/queries.js";
import type * as documentFolders_mutations from "../documentFolders/mutations.js";
import type * as documentFolders_queries from "../documentFolders/queries.js";
import type * as documentLibraries_mutations from "../documentLibraries/mutations.js";
import type * as documentLibraries_queries from "../documentLibraries/queries.js";
import type * as documents_mutations from "../documents/mutations.js";
import type * as documents_queries from "../documents/queries.js";
import type * as http from "../http.js";
import type * as pages_mutations from "../pages/mutations.js";
import type * as pages_queries from "../pages/queries.js";
import type * as sites_mutations from "../sites/mutations.js";
import type * as sites_queries from "../sites/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "access/mutations": typeof access_mutations;
  "access/queries": typeof access_queries;
  auth: typeof auth;
  "blocks/mutations": typeof blocks_mutations;
  "blocks/queries": typeof blocks_queries;
  "companies/mutations": typeof companies_mutations;
  "companies/queries": typeof companies_queries;
  "documentFolders/mutations": typeof documentFolders_mutations;
  "documentFolders/queries": typeof documentFolders_queries;
  "documentLibraries/mutations": typeof documentLibraries_mutations;
  "documentLibraries/queries": typeof documentLibraries_queries;
  "documents/mutations": typeof documents_mutations;
  "documents/queries": typeof documents_queries;
  http: typeof http;
  "pages/mutations": typeof pages_mutations;
  "pages/queries": typeof pages_queries;
  "sites/mutations": typeof sites_mutations;
  "sites/queries": typeof sites_queries;
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

export declare const components: {};
