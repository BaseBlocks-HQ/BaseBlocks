import { Button } from "@/components/ui/button";
import type { ElementRendererProps } from "@/components/elements/registry";
import { Download, FileText } from "lucide-react";

export function FileRenderer({ content }: ElementRendererProps<"file">) {
  return (
    <div className="my-4 p-4 border rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <span className="font-medium">{content.filename}</span>
      </div>
      <Button variant="outline" size="sm" asChild>
        <a href={content.url} download>
          <Download className="h-4 w-4 mr-2" />
          Download
        </a>
      </Button>
    </div>
  );
}
