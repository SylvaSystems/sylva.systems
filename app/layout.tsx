import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

/*
  Root layout: the shell that wraps EVERY page on the site.
  Next.js renders this once around whatever page matches the URL, which is
  why the nav and footer never need to be repeated inside page files.
  ("@/..." in imports means "from the project root".)
*/

/*
  Latin Modern, the LaTeX typeface. The .woff2 files live in public/fonts/
  (downloaded from the latex-css project). next/font/local generates the
  @font-face CSS at build time and exposes the family through the CSS
  variable --font-latin-modern, which tailwind.config.ts hooks into
  font-serif. display:"swap" = show fallback text immediately, swap the
  real font in when loaded (no invisible-text flash).
*/
const latinModern = localFont({
  src: [
    { path: "../public/fonts/LM-regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/LM-italic.woff2", weight: "400", style: "italic" },
    { path: "../public/fonts/LM-bold.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/LM-bold-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-latin-modern",
  display: "swap",
});

/*
  Default <title> and <meta description> for every page. Pages can override
  the title (about/contact/blog each do). The description is the approved
  elevator-pitch line from content.md.
*/
export const metadata: Metadata = {
  title: "Sylva Systems",
  description:
    "We are a team deploying mechatronics solutions for unique conservation challenges.",
};

export default function RootLayout({
  children, // "children" = the current page's content, injected by Next.js
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* The font variable goes on <html> so everything inherits it */
    <html lang="en" className={latinModern.variable}>
      {/*
        flex min-h-dvh flex-col + flex-1 on <main>:
        makes <main> stretch so the footer sits at the bottom of the
        viewport even on short pages (the blog stub).
      */}
      <body className="flex min-h-dvh flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
