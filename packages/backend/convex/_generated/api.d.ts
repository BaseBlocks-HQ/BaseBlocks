/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as documents from "../documents.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as libraries from "../libraries.js";
import type * as migrations from "../migrations.js";
import type * as organizations from "../organizations.js";
import type * as pageContent from "../pageContent.js";
import type * as pageStructure from "../pageStructure.js";
import type * as pages from "../pages.js";
import type * as permissions from "../permissions.js";
import type * as search from "../search.js";
import type * as sharing from "../sharing.js";
import type * as siteDomains from "../siteDomains.js";
import type * as sites from "../sites.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  documents: typeof documents;
  files: typeof files;
  http: typeof http;
  libraries: typeof libraries;
  migrations: typeof migrations;
  organizations: typeof organizations;
  pageContent: typeof pageContent;
  pageStructure: typeof pageStructure;
  pages: typeof pages;
  permissions: typeof permissions;
  search: typeof search;
  sharing: typeof sharing;
  siteDomains: typeof siteDomains;
  sites: typeof sites;
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
