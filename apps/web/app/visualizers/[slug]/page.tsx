import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAlgorithmBySlug, getAllSlugs } from "@/lib/algorithms/registry";
import { VisualizerShell } from "@/components/visualizer/VisualizerShell";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const def = getAlgorithmBySlug(slug);
  if (!def) return { title: "Not found" };
  return {
    title: def.title,
    description: def.description,
    keywords: def.tags,
    openGraph: {
      title: `${def.title} · DSA Visualizer`,
      description: def.summary,
      type: "article",
    },
  };
}

export default async function VisualizerPage({ params }: PageProps) {
  const { slug } = await params;
  const def = getAlgorithmBySlug(slug);
  if (!def) notFound();

  return <VisualizerShell slug={def.slug} />;
}
