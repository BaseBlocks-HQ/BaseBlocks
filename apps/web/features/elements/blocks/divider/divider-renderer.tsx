import type { ElementRendererProps } from "@/features/elements/registry";

export function DividerRenderer(_props: ElementRendererProps<"divider">) {
  return <hr className="my-8" />;
}
