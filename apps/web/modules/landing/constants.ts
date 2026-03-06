import editorPreviewImage from "@/public/landing/editor-preview-v3.png";
import buildSiteImage from "@/public/landing/steps/build-site-v2.png";
import createWorkspaceImage from "@/public/landing/steps/create-workspace-v7.png";
import publishTeamImage from "@/public/landing/steps/publish-team-v4.png";
import type { Transition } from "motion/react";
import {
  IconAppStack,
  IconFolders,
  IconRocket,
  IconSitemap,
  IconSquarePointer,
  IconUsers,
} from "nucleo-glass";
import type { LandingFeature, LandingStep } from "./types";

type FontVariant = "square" | "grid" | "triangle" | "circle" | "sans" | "mono";

export const landingFonts: Record<FontVariant, string> = {
  square: "var(--font-geist-pixel-square)",
  grid: "var(--font-geist-pixel-grid)",
  triangle: "var(--font-geist-pixel-triangle)",
  circle: "var(--font-geist-pixel-circle)",
  sans: "var(--font-geist-sans)",
  mono: "var(--font-geist-mono)",
};

export const animationSteps: ReadonlyArray<{
  font: FontVariant;
  size: number;
  amber?: true;
}> = [
  { font: "square", size: 10 },
  { font: "grid", size: 8.2 },
  { font: "sans", size: 6.8, amber: true },
  { font: "triangle", size: 5.5 },
  { font: "mono", size: 4.5 },
  { font: "circle", size: 3.8 },
  { font: "square", size: 3.2, amber: true },
  { font: "square", size: 2.8 },
];

export const lastStep = animationSteps.length - 1;
export const stepIndices = animationSteps.map((_, index) => index);
export const stepSizes = animationSteps.map((step) => step.size);

export const morphSpring = { stiffness: 30, damping: 15, mass: 3 } as const;
export const layoutSpring = {
  type: "spring",
  stiffness: 80,
  damping: 20,
} as const satisfies Transition;

export const landingEditorPreviewImage = editorPreviewImage;

export const landingFeatures: readonly LandingFeature[] = [
  {
    icon: IconAppStack,
    titleKey: "visualEditorTitle",
    descKey: "visualEditorDesc",
    num: "01",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: IconRocket,
    titleKey: "draftDeployTitle",
    descKey: "draftDeployDesc",
    num: "02",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: IconFolders,
    titleKey: "documentLibrariesTitle",
    descKey: "documentLibrariesDesc",
    num: "03",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: IconUsers,
    titleKey: "teamWorkspacesTitle",
    descKey: "teamWorkspacesDesc",
    num: "04",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: IconSquarePointer,
    titleKey: "customThemesTitle",
    descKey: "customThemesDesc",
    num: "05",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: IconSitemap,
    titleKey: "openSourceTitle",
    descKey: "openSourceDesc",
    num: "06",
    iconClassName:
      "[transform:scaleY(-1)] group-hover:[transform:scaleY(-1)_scale(1.1)]",
  },
] as const;

export const landingSteps: readonly LandingStep[] = [
  {
    num: "01",
    titleKey: "step1Title",
    descKey: "step1Desc",
    imageAltKey: "step1ImageAlt",
    image: createWorkspaceImage,
  },
  {
    num: "02",
    titleKey: "step2Title",
    descKey: "step2Desc",
    imageAltKey: "step2ImageAlt",
    image: buildSiteImage,
  },
  {
    num: "03",
    titleKey: "step3Title",
    descKey: "step3Desc",
    imageAltKey: "step3ImageAlt",
    image: publishTeamImage,
  },
] as const;
