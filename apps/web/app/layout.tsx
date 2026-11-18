import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppNavbar } from "@/components/app-shell/AppNavbar";

export const metadata: Metadata = {
  title: {
    default: "DSA Studio — A workspace for understanding algorithms",
    template: "%s · DSA Studio",
  },
  description:
    "Interactive, step-by-step visualizations of data structures and algorithms with live code tracing, metrics, and accessible playback controls.",
  applicationName: "DSA Studio",
  keywords: [
    "algorithms",
    "data structures",
    "visualizer",
    "sorting",
    "graph algorithms",
    "dynamic programming",
    "computer science",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
            <div className="ambient-background" aria-hidden="true" />
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-5 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-card focus:px-4 focus:py-3"
            >
              Skip to content
            </a>
            <div className="min-h-screen">
              <AppNavbar />
              <main id="main-content" className="studio-main">
                {children}
              </main>
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
