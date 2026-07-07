import type { LayoutSettings, LayoutType } from "@baseblocks/domain";

// ── Editor engine types ──────────────────────────────────────────────

/** Backend-agnostic site data passed to the editor as props */
export interface SiteData {
  teamId?: string;
  contentModifiedAt?: number;
  lastDeployedAt?: number;
}

/** Backend-agnostic page data passed to the editor as props */
export interface PageData {
  title: string;
  pageTabs: PageTab[];
}

export interface PageTab {
  id: string;
  label: string;
}

/** Backend-agnostic layout document (mirrors the Convex Doc<"layouts"> shape) */
export interface LayoutDoc {
  _id: string;
  type: LayoutType;
  order: number;
  tabId?: string;
  slots: LayoutSlotDoc[];
  settings: LayoutSettings;
}

export interface LayoutSlotDoc {
  id: string;
  position: number;
  blocks: LayoutBlockDoc[];
}

interface LayoutBlockDoc {
  id: string;
  type: string;
  content: unknown;
}

/** Permissions passed as props to the editor */
export interface EditorPermissions {
  canEdit: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

// ── Feature UI types ─────────────────────────────────────────────────

/** Sharing settings for a site */
export interface SharingSettings {
  visibility: string;
  accessCodeRotationHours: number;
  accessCodeSessionDays: number;
}

/** Access code data for password-protected sites */
export interface AccessCodeData {
  code: string;
  expiresAt?: number;
  isExpired: boolean;
}

/** A single deployment entry */
export interface DeploymentData {
  id: string;
  version: number;
  status: string;
  notes?: string;
  deployedAt: number;
  summary: {
    pagesDeployed: number;
    layoutsDeployed: number;
    settingsChanged: boolean;
  };
}
