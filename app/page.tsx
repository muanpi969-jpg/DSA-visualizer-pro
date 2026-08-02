import { redirect } from "next/navigation";

// The first screen is the usable catalog, never a marketing landing page.
export default function HomePage() {
  redirect("/visualizers");
}
