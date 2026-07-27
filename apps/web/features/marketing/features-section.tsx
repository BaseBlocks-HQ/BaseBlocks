import { OpenEditorDemo } from "./openeditor-demo";

export function FeaturesSection() {
  return (
    <section id="features" className="landing-section scroll-mt-20">
      <div className="landing-rail landing-editor-section">
        <OpenEditorDemo />
      </div>
    </section>
  );
}
