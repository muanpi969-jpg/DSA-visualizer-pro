"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Braces,
  ChevronRight,
  Play,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  getAllAlgorithms,
  getAlgorithmsByCategory,
} from "@/lib/algorithms/registry";
import { AlgorithmCard } from "./AlgorithmCard";

export function CatalogExplorer() {
  const algorithms = getAllAlgorithms();
  const groups = getAlgorithmsByCategory();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requested = params.get("category") ?? "all";
  const category = groups.some((group) => group.category === requested)
    ? requested
    : "all";
  const [query, setQuery] = React.useState("");
  const languages = new Set(algorithms.flatMap((def) => Object.keys(def.code)));
  const visible = algorithms.filter(
    (def) =>
      (category === "all" || def.category === category) &&
      `${def.title} ${def.summary} ${def.tags.join(" ")}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const setCategory = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete("category");
    else next.set("category", value);
    router.replace(
      `${pathname}${next.size ? `?${next}` : ""}#algorithm-library`,
      { scroll: false },
    );
  };
  return (
    <div className="studio-content">
      <section
        className="hero-panel glass-panel"
        aria-label="Your learning workspace"
      >
        <div className="hero-copy">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-card/50 px-2.5 py-1 text-[10px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> A workspace for curious minds
          </div>
          <h2 className="hero-title">
            Understand the logic.
            <br />
            <span className="text-primary">One step at a time.</span>
          </h2>
          <p className="mt-3 max-w-[350px] text-[12px] leading-[1.75] text-muted-foreground">
            Change the input. Follow the code. See how every comparison, visit,
            and decision fits together.
          </p>
          <Link
            href="/visualizers/bubble-sort"
            className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2.5 text-[11px] font-medium text-primary-foreground shadow-[0_4px_15px_hsl(var(--primary)/.18)] transition-opacity hover:opacity-90"
          >
            <Play className="h-3 w-3 fill-current" /> Start exploring{" "}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>
        <Link
          href="/visualizers/bubble-sort"
          className="hero-preview"
          aria-label="Explore Bubble Sort"
        >
          <div className="hero-preview-window">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f0a29d]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#e8c47c]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#96c9ac]" />
              <span className="ml-auto text-[9px] font-medium text-muted-foreground">
                Bubble Sort
              </span>
              <Braces className="ml-1 h-3 w-3 text-muted-foreground/60" />
            </div>
            <div className="hero-bars" aria-hidden="true">
              {[32, 53, 40, 74, 58, 84, 95, 103].map((height, index) => (
                <div
                  key={index}
                  className={`hero-bar ${index === 3 || index === 4 ? "compare" : index > 5 ? "final" : ""}`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-[8px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-viz-compare" />{" "}
                Compare adjacent values
              </span>
              <span className="flex items-center gap-1 text-primary">
                Open visualizer <ChevronRight className="h-2.5 w-2.5" />
              </span>
            </div>
          </div>
        </Link>
      </section>
      <div className="stat-strip" aria-label="Library at a glance">
        <div className="overview-stat glass-panel">
          <span className="icon-tile">
            <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </span>
          <div>
            <strong className="text-[22px] font-semibold tracking-[-.04em]">
              {algorithms.length}
              <span className="ml-1.5 text-[11px] font-normal tracking-normal text-muted-foreground">
                visualizers
              </span>
            </strong>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Ready to explore
            </p>
          </div>
        </div>
        <div className="overview-stat glass-panel">
          <span className="icon-tile !bg-viz-success/[.08] !text-viz-success">
            <Boxes className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </span>
          <div>
            <strong className="text-[22px] font-semibold tracking-[-.04em]">
              {groups.length}
              <span className="ml-1.5 text-[11px] font-normal tracking-normal text-muted-foreground">
                topics
              </span>
            </strong>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              From arrays to algorithms
            </p>
          </div>
        </div>
        <div className="overview-stat glass-panel">
          <span className="icon-tile !bg-viz-compare/[.08] !text-viz-compare">
            <Braces className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </span>
          <div>
            <strong className="text-[22px] font-semibold tracking-[-.04em]">
              {languages.size}
              <span className="ml-1.5 text-[11px] font-normal tracking-normal text-muted-foreground">
                languages
              </span>
            </strong>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Code you can follow
            </p>
          </div>
        </div>
      </div>
      <section
        id="algorithm-library"
        className="scroll-mt-5"
        aria-labelledby="catalog-title"
      >
        <div className="catalog-toolbar">
          <div>
            <h1
              id="catalog-title"
              className="text-[20px] font-semibold tracking-[-.04em]"
            >
              Algorithm Visualizers
            </h1>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Pick a concept. Make it click.
            </p>
          </div>
          <div className="catalog-search">
            <Search className="pointer-events-none absolute left-3 top-[11px] h-4 w-4 text-muted-foreground/70" />
            <input
              id="catalog-search"
              aria-label="Search algorithms"
              placeholder="Search algorithms…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-2 top-2 rounded-md bg-card p-1 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="category-tabs" aria-label="Filter by category">
          <button
            type="button"
            className={`category-tab ${category === "all" ? "active" : ""}`}
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
          >
            All algorithms{" "}
            <span className="ml-1.5 text-[9px] opacity-60">
              {algorithms.length}
            </span>
          </button>
          {groups.map((group) => (
            <button
              key={group.category}
              type="button"
              className={`category-tab ${category === group.category ? "active" : ""}`}
              aria-pressed={category === group.category}
              onClick={() => setCategory(group.category)}
            >
              {group.label}
              <span className="ml-1.5 text-[9px] opacity-60">
                {group.items.length}
              </span>
            </button>
          ))}
        </div>
        <p className="sr-only" role="status">
          {visible.length} algorithms shown
        </p>
        {visible.length ? (
          <div className="algorithm-grid">
            {visible.map((definition, index) => (
              <AlgorithmCard
                key={definition.slug}
                definition={definition}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl px-6 py-14 text-center">
            <Search className="mx-auto mb-3 h-6 w-6 text-muted-foreground/50" />
            <h2 className="text-sm font-medium">
              No algorithms match your search
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Try another name or explore a different topic.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="mt-5 text-xs font-medium text-primary"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
      <footer className="studio-footer">
        <p>Built for the moment it finally makes sense.</p>
        <p className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-viz-success" /> Interactive.
          Step by step. At your pace.
        </p>
      </footer>
    </div>
  );
}
