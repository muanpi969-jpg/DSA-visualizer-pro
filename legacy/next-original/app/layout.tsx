import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppNavbar } from "@/components/app-shell/AppNavbar";

export const metadata: Metadata = {
  metadataBase: new URL("https://dsa-visualizer.local"),
  title: {
    default: "DSA Visualizer — See algorithms think",
    template: "%s · DSA Visualizer",
  },
  description:
    "Interactive, step-by-step visualizations of data structures and algorithms with live code tracing, metrics, and accessible playback controls.",
  applicationName: "DSA Visualizer",
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
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
            <div className="flex min-h-screen flex-col">
              <AppNavbar />
              <main className="flex-1">{children}</main>
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
