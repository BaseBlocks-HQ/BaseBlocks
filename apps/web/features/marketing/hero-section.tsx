import type { ReactNode } from "react";
import { HeroParticleField } from "./hero-particle-field";

interface HeroSectionProps {
  authCta: ReactNode;
  description: string;
  title: string;
}

export function HeroSection({ authCta, description, title }: HeroSectionProps) {
  return (
    <section className="landing-hero">
      <div className="landing-rail landing-hero-grid">
        <HeroParticleField />
        <div className="landing-hero-copy">
          <h1>{title}</h1>
          <p className="landing-hero-description">{description}</p>
          <div className="landing-hero-actions">{authCta}</div>
        </div>
      </div>
    </section>
  );
}
