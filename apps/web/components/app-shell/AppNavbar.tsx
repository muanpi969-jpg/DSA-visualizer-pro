"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownUp,
  ArrowUpRight,
  Binary,
  BookOpen,
  Boxes,
  Braces,
  ChevronRight,
  GitBranch,
  Github,
  LayoutGrid,
  Network,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { getAlgorithmsByCategory } from "@/lib/algorithms/registry";

const CATEGORY_ICONS = {
  sorting: ArrowDownUp,
  search: ScanSearch,
  graph: Network,
  tree: GitBranch,
  "dynamic-programming": Braces,
  "data-structures": Boxes,
};

export function AppNavbar() {
  const pathname = usePathname().replace(/\/+$/, "") || "/";
  const groups = getAlgorithmsByCategory();
  const isVisualizer = pathname.startsWith("/visualizers/");
  return (
    <>
      <aside
        className="studio-sidebar glass-panel glass-strong scrollbar-thin"
        aria-label="Main navigation"
      >
        <Link href="/" className="mb-9 flex items-center gap-2.5 px-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Binary className="h-[21px] w-[21px]" strokeWidth={1.7} />
          </span>
          <span className="text-[17px] font-semibold tracking-[-.04em]">
            DSA{" "}
            <span className="font-normal text-muted-foreground">Studio</span>
          </span>
        </Link>
        <p className="sidebar-label mb-3">Workspace</p>
        <nav className="space-y-1">
          <Link
            href="/"
            className={`sidebar-link ${pathname === "/" ? "active" : ""}`}
          >
            <LayoutGrid className="h-4 w-4" /> Overview
          </Link>
          <Link
            href="/visualizers"
            className={`sidebar-link ${pathname.startsWith("/visualizers") ? "active" : ""}`}
          >
            <BookOpen className="h-4 w-4" /> All algorithms{" "}
            <span className="ml-auto text-[10px] opacity-65">
              {groups.reduce((sum, group) => sum + group.items.length, 0)}
            </span>
          </Link>
        </nav>
        <p className="sidebar-label mb-3 mt-8">Explore by topic</p>
        <nav className="space-y-1" aria-label="Algorithm categories">
          {groups.map((group) => {
            const Icon = CATEGORY_ICONS[group.category];
            return (
              <Link
                key={group.category}
                href={`/visualizers?category=${group.category}#algorithm-library`}
                className="sidebar-link"
              >
                <Icon className="h-4 w-4" strokeWidth={1.7} />
                <span className="min-w-0 flex-1">
                  {group.label === "Dynamic Programming"
                    ? "Dynamic prog."
                    : group.label}
                </span>
                <span className="text-[10px] opacity-65">
                  {group.items.length}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-8">
          <div className="rounded-2xl border border-primary/10 bg-primary/[.035] p-3.5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> A little
              clarity, every step.
            </div>
            <p className="text-[11px] leading-[1.65] text-muted-foreground">
              Play it. Pause it. See exactly why it works.
            </p>
            <Link
              href="/visualizers/bubble-sort"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
            >
              Try your first visualizer <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-5 flex items-center justify-between px-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-viz-success" /> Runs
              in your browser
            </span>
            <span>v1.0</span>
          </div>
        </div>
      </aside>
      <header className="studio-topbar">
        <div className="desktop-breadcrumb flex items-center gap-2 text-xs text-muted-foreground">
          <span>Workspace</span>
          <ChevronRight className="h-3 w-3 opacity-50" />
          <span className="font-medium text-foreground">
            {isVisualizer
              ? "Visualizer"
              : pathname === "/"
                ? "Overview"
                : "Algorithm library"}
          </span>
        </div>
        <Link
          href="/"
          className="mobile-brand hidden items-center gap-2 text-[15px] font-semibold tracking-[-.035em]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
            <Binary className="h-[18px] w-[18px]" />
          </span>
          DSA Studio
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/visualizers"
            className="hidden text-[11px] text-muted-foreground transition-colors hover:text-primary sm:inline"
          >
            Explore algorithms
          </Link>
          <a
            href="https://github.com/muanpi969-jpg/DSA-visualizer-pro"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="View source on GitHub"
            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          >
            <Github className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Source</span>
          </a>
          <span className="h-4 w-px bg-border" />
          <ThemeToggle />
        </div>
      </header>
    </>
  );
}
