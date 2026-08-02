import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAlgorithmBySlug,
  getAllSlugs,
} from "@/lib/algorithms/registry";
import { VisualizerShell } from "@/components/visualizer/VisualizerShell";

interface PageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const def = getAlgorithmBySlug(params.slug);
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

export default function VisualizerPage({ params }: PageProps) {
  const def = getAlgorithmBySlug(params.slug);
  if (!def) notFound();

  return <VisualizerShell slug={def.slug} />;
}
