import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteNotPublished() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Site Not Available</h1>
        <p className="text-muted-foreground mb-8">
          This site is not yet published.
        </p>
        <Button asChild>
          <Link href="/">Go to BaseBlocks</Link>
        </Button>
      </div>
    </div>
  );
}
