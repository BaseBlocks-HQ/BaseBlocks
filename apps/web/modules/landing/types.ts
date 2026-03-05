import type { StaticImageData } from "next/image";
import type { ComponentType, SVGProps } from "react";

export type TranslateFn = (key: string) => string;

export type LandingIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface LandingFeature {
  icon: LandingIcon;
  titleKey: string;
  descKey: string;
  num: string;
  iconClassName: string;
}

export interface LandingStep {
  num: string;
  titleKey: string;
  descKey: string;
  imageAltKey: string;
  image: StaticImageData;
}
