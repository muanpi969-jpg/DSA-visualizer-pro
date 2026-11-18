import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">This page could not be found.</h1>
      <p className="text-sm text-muted-foreground">
        The visualizer you are looking for does not exist yet.
      </p>
      <Button asChild>
        <Link href="/visualizers">Back to catalog</Link>
      </Button>
    </div>
  );
}
