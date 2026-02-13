/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_extractDocument from "../actions/extractDocument.js";
import type * as auth from "../auth.js";
import type * as banners_queries from "../banners/queries.js";
import type * as blocks_mutations from "../blocks/mutations.js";
import type * as blocks_queries from "../blocks/queries.js";
import type * as companies_mutations from "../companies/mutations.js";
import type * as companies_queries from "../companies/queries.js";
import type * as crons from "../crons.js";
import type * as deployments_mutations from "../deployments/mutations.js";
import type * as deployments_queries from "../deployments/queries.js";
import type * as documentFolders_mutations from "../documentFolders/mutations.js";
import type * as documentFolders_queries from "../documentFolders/queries.js";
import type * as documentLibraries_mutations from "../documentLibraries/mutations.js";
import type * as documentLibraries_queries from "../documentLibraries/queries.js";
import type * as documents_internal from "../documents/internal.js";
import type * as documents_mutations from "../documents/mutations.js";
import type * as documents_queries from "../documents/queries.js";
import type * as http from "../http.js";
import type * as layouts_mutations from "../layouts/mutations.js";
import type * as layouts_queries from "../layouts/queries.js";
import type * as lib_entityAuthClient from "../lib/entityAuthClient.js";
import type * as lib_extractBlockNoteText from "../lib/extractBlockNoteText.js";
import type * as lib_extractable from "../lib/extractable.js";
import type * as lib_markModified from "../lib/markModified.js";
import type * as members_actions from "../members/actions.js";
import type * as members_internal from "../members/internal.js";
import type * as members_mutations from "../members/mutations.js";
import type * as members_queries from "../members/queries.js";
import type * as migrations from "../migrations.js";
import type * as pages_mutations from "../pages/mutations.js";
import type * as pages_queries from "../pages/queries.js";
import type * as search_queries from "../search/queries.js";
import type * as sharing_internal from "../sharing/internal.js";
import type * as sharing_mutations from "../sharing/mutations.js";
import type * as sharing_queries from "../sharing/queries.js";
import type * as sites_mutations from "../sites/mutations.js";
import type * as sites_queries from "../sites/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/extractDocument": typeof actions_extractDocument;
  auth: typeof auth;
  "banners/queries": typeof banners_queries;
  "blocks/mutations": typeof blocks_mutations;
  "blocks/queries": typeof blocks_queries;
  "companies/mutations": typeof companies_mutations;
  "companies/queries": typeof companies_queries;
  crons: typeof crons;
  "deployments/mutations": typeof deployments_mutations;
  "deployments/queries": typeof deployments_queries;
  "documentFolders/mutations": typeof documentFolders_mutations;
  "documentFolders/queries": typeof documentFolders_queries;
  "documentLibraries/mutations": typeof documentLibraries_mutations;
  "documentLibraries/queries": typeof documentLibraries_queries;
  "documents/internal": typeof documents_internal;
  "documents/mutations": typeof documents_mutations;
  "documents/queries": typeof documents_queries;
  http: typeof http;
  "layouts/mutations": typeof layouts_mutations;
  "layouts/queries": typeof layouts_queries;
  "lib/entityAuthClient": typeof lib_entityAuthClient;
  "lib/extractBlockNoteText": typeof lib_extractBlockNoteText;
  "lib/extractable": typeof lib_extractable;
  "lib/markModified": typeof lib_markModified;
  "members/actions": typeof members_actions;
  "members/internal": typeof members_internal;
  "members/mutations": typeof members_mutations;
  "members/queries": typeof members_queries;
  migrations: typeof migrations;
  "pages/mutations": typeof pages_mutations;
  "pages/queries": typeof pages_queries;
  "search/queries": typeof search_queries;
  "sharing/internal": typeof sharing_internal;
  "sharing/mutations": typeof sharing_mutations;
  "sharing/queries": typeof sharing_queries;
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

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
          oneBatchOnly?: boolean;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
};
