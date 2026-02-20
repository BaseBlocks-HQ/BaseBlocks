import type { ElementRendererProps } from "@/features/elements/registry";

export function HeadingRenderer({ content }: ElementRendererProps<"heading">) {
  const level = content.level || 2;

  switch (level) {
    case 1:
      return (
        <h1 className="text-3xl font-semibold mt-6 mb-4">{content.text}</h1>
      );
    case 2:
      return (
        <h2 className="text-2xl font-semibold mt-6 mb-4">{content.text}</h2>
      );
    case 3:
      return (
        <h3 className="text-xl font-semibold mt-6 mb-4">{content.text}</h3>
      );
    case 4:
      return (
        <h4 className="text-lg font-semibold mt-6 mb-4">{content.text}</h4>
      );
    default:
      return <h5 className="font-semibold mt-6 mb-4">{content.text}</h5>;
  }
}
