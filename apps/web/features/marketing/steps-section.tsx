import { StepRailPattern } from "./step-rail-pattern";

type TranslateFn = (key: string) => string;

const steps: readonly {
  num: string;
  titleKey: string;
  descKey: string;
}[] = [
  {
    num: "01",
    titleKey: "step1Title",
    descKey: "step1Desc",
  },
  {
    num: "02",
    titleKey: "step2Title",
    descKey: "step2Desc",
  },
  {
    num: "03",
    titleKey: "step3Title",
    descKey: "step3Desc",
  },
];

interface StepsSectionProps {
  landingTranslations: TranslateFn;
}

export function StepsSection({ landingTranslations }: StepsSectionProps) {
  return (
    <section
      id="how-it-works"
      className="landing-section landing-steps-section scroll-mt-20"
    >
      <div className="landing-rail landing-open-heading landing-steps-heading">
        <h2>{landingTranslations("stepsTitle")}</h2>
      </div>

      <div className="landing-step-rails">
        <StepRailPattern />
        <div className="landing-step-grid">
          {steps.map((step, index) => (
            <article
              className={`landing-step-row ${
                index % 2 === 1 ? "landing-step-row-reverse" : ""
              }`}
              key={step.titleKey}
            >
              <div className="landing-step-copy">
                <div>
                  <h3>{landingTranslations(step.titleKey)}</h3>
                  <p>{landingTranslations(step.descKey)}</p>
                </div>
              </div>
              <div className="landing-step-visual" aria-hidden="true">
                <div className="landing-step-marker">{step.num}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
