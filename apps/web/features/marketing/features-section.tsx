type TranslateFn = (key: string) => string;

const features: readonly {
  titleKey: string;
  descKey: string;
  num: string;
}[] = [
  {
    titleKey: "editorTitle",
    descKey: "editorDesc",
    num: "01",
  },
  {
    titleKey: "pageTreeTitle",
    descKey: "pageTreeDesc",
    num: "02",
  },
  {
    titleKey: "filesSearchTitle",
    descKey: "filesSearchDesc",
    num: "03",
  },
  {
    titleKey: "teamWorkspacesTitle",
    descKey: "teamWorkspacesDesc",
    num: "04",
  },
  {
    titleKey: "publishingTitle",
    descKey: "publishingDesc",
    num: "05",
  },
  {
    titleKey: "brandingTitle",
    descKey: "brandingDesc",
    num: "06",
  },
];

interface FeaturesSectionProps {
  landingTranslations: TranslateFn;
}

export function FeaturesSection({ landingTranslations }: FeaturesSectionProps) {
  return (
    <section
      id="features"
      className="landing-section landing-section-plain scroll-mt-20"
    >
      <div className="landing-rail landing-open-section">
        <div className="landing-open-heading">
          <h2>{landingTranslations("featuresTitle")}</h2>
          <p>{landingTranslations("featuresSubtitle")}</p>
        </div>

        <div className="landing-feature-list">
          {features.map((feature) => (
            <article className="landing-feature-item" key={feature.titleKey}>
              <span>{feature.num}</span>
              <div>
                <h3>{landingTranslations(feature.titleKey)}</h3>
                <p>{landingTranslations(feature.descKey)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
