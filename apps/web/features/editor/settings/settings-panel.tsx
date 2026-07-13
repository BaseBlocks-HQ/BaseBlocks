import { Label } from "@baseblocks/ui/label";

export function PanelSettingRow({
  control,
  htmlFor,
  label,
}: {
  control: React.ReactNode;
  htmlFor?: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/30">
      <div className="min-w-0 flex-1 pr-2">
        <Label className="text-sm font-medium leading-none" htmlFor={htmlFor}>
          {label}
        </Label>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
