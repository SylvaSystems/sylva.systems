import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

/*
  Masthead header, academic-journal style: centered wordmark on top,
  then a hairline rule, then a centered row of small-caps links separated
  by thin vertical rules.

  Design decisions (from the audit round):
  - NOT sticky: journal pages don't chase you down the screen. This also
    lets the hero video pin to the very top of the viewport.
  - Two stacked rows means nothing can overflow on a 320px phone screen.
  - "Reach out" is an underlined link, not a button, to keep the masthead
    quiet; the loud green CTA lives in the hero panel.

  <Link> is Next.js's version of <a> for internal pages - it prefetches
  the target page for instant navigation. Plain <a> is used for external
  URLs elsewhere in the site.

  Trailing slashes in href ("/about/") match the trailingSlash setting in
  next.config.ts, which GitHub Pages needs to serve folder-style URLs.
*/
export function SiteNav() {
  return (
    <header className="border-b border-rule bg-paper">
      <div className="mx-auto max-w-page px-4 sm:px-8">
        {/* Row 1: the wordmark lockup, centered, linking home.
            The font-size here is the lockup's ONE scale knob: everything
            inside <Wordmark /> is sized relative to it (see wordmark.tsx). */}
        <p className="pt-8 text-center">
          <Link href="/" className="inline-block text-2xl sm:text-[30px]">
            <Wordmark />
          </Link>
        </p>

        {/*
          Row 2: the link row. border-t draws the rule between the rows.
          [font-variant-caps:small-caps] is a raw CSS property (square
          brackets = arbitrary Tailwind); Latin Modern renders it as
          synthesized small capitals, the LaTeX look.
        */}
        <nav className="mt-6 flex justify-center border-t border-rule py-3 text-sm [font-variant-caps:small-caps]">
          <Link href="/about/" className="px-4 hover:text-pine sm:px-6">
            Meet the team
          </Link>
          {/* Thin vertical rule between links; aria-hidden = decoration only,
              skipped by screen readers */}
          <span aria-hidden="true" className="w-px bg-rule" />
          <Link href="/blog/" className="px-4 hover:text-pine sm:px-6">
            Blog
          </Link>
          <span aria-hidden="true" className="w-px bg-rule" />
          <Link
            href="/contact/"
            className="px-4 underline underline-offset-4 hover:text-pine sm:px-6"
          >
            Reach out
          </Link>
        </nav>
      </div>
    </header>
  );
}
