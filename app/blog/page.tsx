import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Sylva Systems",
};

/*
  BLOG PAGE ("/blog/"). Intentionally an empty stub.

  When posts exist: create app/blog/<post-name>/page.tsx per post (the
  folder name becomes the URL) and turn this page into a list of links.
  See CLAUDE.md "Adding blog posts later".
*/

export default function Blog() {
  return (
    <section className="mx-auto max-w-page px-4 py-20 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Blog</h1>
      <p className="mt-6 max-w-measure text-lg italic text-ink-soft">
        No posts yet.
      </p>
    </section>
  );
}
