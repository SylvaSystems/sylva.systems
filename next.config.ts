import type { NextConfig } from "next";

/*
  Next.js configuration.

  output: "export"  - THE static-site switch. `npm run build` writes plain
                      HTML/CSS/JS into out/ instead of needing a server.
                      GitHub Pages serves out/ as-is.
  trailingSlash     - URLs end in "/" ("/about/"), so each page exports as
                      about/index.html, which is how GitHub Pages expects
                      folder-style URLs to work.
  images.unoptimized - Next's image optimizer needs a server; disabled for
                       static export. Plain <img> tags are used instead.

  If the site is ever served from username.github.io/REPO instead of the
  custom domain, add: basePath: "/REPO".
*/
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
