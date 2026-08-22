import { routing } from "@/i18n/routing";
import {
  BlocksIcon,
  BookOpen01Icon,
  ComputerIcon,
  CookieIcon,
  CreditCardIcon,
  FeatherIcon,
  File01Icon,
  GaugeIcon,
  GitCompareArrowsIcon,
  GlobeIcon,
  HierarchyIcon,
  LayoutGridIcon,
  LayoutThreeColumnIcon,
  LayoutTopIcon,
  Legal01Icon,
  PaintBoardIcon,
  PencilEdit01Icon,
  RocketIcon,
  SentIcon,
  CogIcon,
  SlidersHorizontalIcon,
  UserGroupIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { docs } from "collections/server";
import { defineI18n } from "fumadocs-core/i18n";
import { loader } from "fumadocs-core/source";
import { createElement } from "react";

const docsI18n = defineI18n({
  languages: [...routing.locales],
  defaultLanguage: routing.defaultLocale,
  hideLocale: "default-locale",
});

const docsIconMap = {
  Blocks: BlocksIcon,
  BookOpen: BookOpen01Icon,
  Columns3: LayoutThreeColumnIcon,
  Cookie: CookieIcon,
  CreditCard: CreditCardIcon,
  Eye: ViewIcon,
  Feather: FeatherIcon,
  FileText: File01Icon,
  Gauge: GaugeIcon,
  GitCompareArrows: GitCompareArrowsIcon,
  Globe: GlobeIcon,
  Monitor: ComputerIcon,
  Network: HierarchyIcon,
  Palette: PaintBoardIcon,
  PanelsTopLeft: LayoutTopIcon,
  PenLine: PencilEdit01Icon,
  Rocket: RocketIcon,
  Scale: Legal01Icon,
  Send: SentIcon,
  Settings: CogIcon,
  SlidersHorizontal: SlidersHorizontalIcon,
  SquareGrid: LayoutGridIcon,
  UsersRound: UserGroupIcon,
} as const;

function resolveContentIcon(icon: string | undefined) {
  if (!icon) return;
  if (icon in docsIconMap) {
    return createElement(HugeiconsIcon, {
      icon: docsIconMap[icon as keyof typeof docsIconMap],
      strokeWidth: 1.65,
    });
  }
}

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  i18n: docsI18n,
  icon: resolveContentIcon,
});
