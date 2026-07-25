# Sylva Systems website

This is the website for our school project / loose startup "Sylva Systems".
It is hosted entirely on GitHub Pages.

## Rules

**NEVER** generate written content. Use what is provided in `content.md` and
address any gaps. `content.md` is the single source of truth for all visible
site copy. The only generated strings allowed are unavoidable UI chrome
(form labels, "Send", "No posts yet.").

Design rules in force (from the tasteskill audit process):

- One theme, locked: light mode, latex.css light palette. No dark mode.
- One accent color (pine green) used identically everywhere.
- Corner radius 0 everywhere (sharp, industrial).
- Zero em-dashes (U+2014) and en-dashes (U+2013) anywhere. Ranges use a
  plain hyphen ("1-2 months").
- Curly apostrophes (') in all visible copy, never straight quotes (').
- Latin Modern is the only typeface (the LaTeX font, from the latex-css
  project). Single-font IS the design.
- No images are faked. Missing assets are omitted entirely (site is
  publishable as-is); each spot keeps a JSX comment describing the asset
  and the layout to restore when it arrives.
- Every external link (`<a href="https://...">`) opens in a new tab:
  `target="_blank" rel="noopener noreferrer"` (the rel part is the security
  companion - without it the new tab can script the opening page). Internal
  navigation (`<Link href="/...">`) NEVER opens a new tab; same-tab is
  correct for moving around one's own site.

## How the whole thing works (plain-English tour)

### The big picture

This is a **Next.js** project configured for **static export**. That means:
we write pages as React components (`.tsx` files), and `npm run build`
converts them into plain HTML, CSS, and JavaScript files in the `out/`
folder. GitHub Pages just serves those files. There is no server, no
database, nothing running at request time. Every visitor gets the same
pre-built files.

Chain of tools, bottom to top:

- **Node.js** runs JavaScript outside a browser. All build tooling runs on it.
- **npm** installs the libraries listed in `package.json` into
  `node_modules/` (never edit that folder; it is disposable).
- **TypeScript** (`.tsx` files) is JavaScript plus type annotations. The
  build checks types, then strips them. `.tsx` means "TypeScript with JSX".
- **JSX** is the HTML-looking syntax inside the components. It is not HTML;
  it compiles to JavaScript function calls. Practical differences:
  `class` is written `className`, all tags must close (`<img ... />`), and
  `{curly braces}` drop back into JavaScript (variables, loops).
- **React** is the component system. A component is a function that returns
  JSX. Components compose: `page.tsx` uses `<MediaSlot />`, etc.
- **Next.js** is the framework on top of React. It gives us file-based
  routing (see below), the build pipeline, and font loading.
- **Tailwind CSS** is the styling system. Instead of writing CSS files per
  component, elements get utility classes like `mt-6 text-lg font-bold`.
  Each class is one CSS rule. The build scans our files and generates a
  stylesheet containing only the classes actually used.

### File map

```
content.md              Source of truth for all copy. Not shipped; copied from.
CLAUDE.md               This file.
package.json            Project manifest: dependencies + npm scripts.
next.config.ts          Next.js settings (static export switch lives here).
tsconfig.json           TypeScript settings. Rarely touched.
tailwind.config.ts      Tailwind settings: our color tokens, fonts, widths.
postcss.config.mjs      Wires Tailwind into the CSS build. Never touched.
app/                    THE PAGES. Folder structure = URL structure.
  layout.tsx            Shell around every page: <html>, font, nav, footer.
  globals.css           Theme tokens (colors) + base styles + form error state.
  page.tsx              Landing page (the URL "/").
  about/page.tsx        "/about/" - About text + The Team list.
  contact/page.tsx      "/contact/" - contact form.
  blog/page.tsx         "/blog/" - empty for now.
components/             Reusable pieces used by the pages.
  site-nav.tsx          Masthead header (wordmark + link row).
  site-footer.tsx       Dark one-line footer.
  media-slot.tsx        Labeled placeholder box for missing images/video.
  hero-lattice.tsx      Animated hero grid canvas (client component, PARKED).
public/                 Files copied to the site as-is.
  fonts/                Latin Modern .woff2 font files (from latex-css repo).
  .nojekyll             Tells GitHub Pages not to run Jekyll on the output.
out/                    BUILD OUTPUT. The actual deployed site. Regenerated
                        by every build; never edit by hand.
node_modules/           Installed libraries. Disposable; never edit.
```

### Routing: how URLs map to files

Next.js "App Router": every folder under `app/` with a `page.tsx` becomes a
URL. `app/about/page.tsx` -> `/about/`. To add a new page, make a folder
with a `page.tsx` in it. `layout.tsx` wraps every page automatically - that
is why the nav and footer appear everywhere without being repeated in each
page file.

### How a page gets to the browser

1. `layout.tsx` renders `<html><body>` with the font variable attached,
   then the nav, then the current page's content, then the footer.
2. Every component here is a **Server Component** (the Next.js default):
   it runs once at build time and outputs static HTML. One client
   component exists but is PARKED (built, working, not rendered):
   `components/hero-lattice.tsx`, the animated hero grid canvas. While
   parked, the site ships zero client JS beyond the framework itself;
   the hero shows the static .bg-diamond CSS pattern. Re-enable per the
   "PARKED" comment in app/page.tsx's hero. All interactive behavior on
   the live site is pure CSS (hover states, form validation).
3. `npm run build` writes the finished HTML per page into `out/`.

### The styling system, tokens first

`app/globals.css` defines the palette as CSS variables (design tokens):

- `--paper` page background (latex.css light: hsl(210,20%,98%))
- `--ink` text (latex.css: hsl(0,5%,10%))
- `--ink-soft` secondary text
- `--rule` hairlines/borders
- `--pine` / `--pine-deep` the single green accent + its hover shade
- `--error` form invalid red (latex.css's link red)

`tailwind.config.ts` maps those variables to class names, so `bg-paper`,
`text-ink`, `border-rule`, `bg-pine` work everywhere. To retheme the whole
site, change the numbers in `globals.css` once.

Common Tailwind vocabulary used in this project:

- Spacing scale: `p-8` padding, `mt-6` margin-top, `gap-4` grid/flex gap.
  Number x 0.25rem (so 8 = 2rem = 32px).
- `md:` and `sm:` prefixes = "at this screen width and up". Everything
  written without a prefix is the MOBILE style; `md:grid-cols-2` upgrades
  it on bigger screens. This is how every section collapses to one column
  on phones.
- `max-w-page` (72rem) and `max-w-measure` (42rem, comfortable reading
  width) are custom widths defined in `tailwind.config.ts`.
- Arbitrary values in square brackets: `h-[100dvh]` (dvh = dynamic viewport
  height, safe on iOS), `grid-cols-[10rem_1fr]` (fixed + flexible column).

### The font

Latin Modern (the LaTeX typeface), self-hosted: the `.woff2` files in
`public/fonts/` came from the latex-css GitHub repo. `layout.tsx` loads
them with `next/font/local`, which generates the `@font-face` CSS and a
CSS variable `--font-latin-modern`; `tailwind.config.ts` points the
`font-serif` family at that variable; `globals.css` applies it to `body`.
No external font requests ever leave the page.

### The hero scroll trick (landing page)

The hero is a `200dvh`-tall section (two viewports). Inside it:

- The video placeholder sits in a `sticky top-0 h-[100dvh]` wrapper.
  "Sticky" means: scroll with the page until you hit the top, then stay
  pinned there while the rest of the section scrolls past.
- The pitch panel sits in an absolutely-positioned layer over the first
  viewport only, so it scrolls away normally.

Net effect: panel scrolls off, video stays fullscreen for one extra
viewport of scrolling, then the section ends and the video scrolls away
too. Pure CSS - no JavaScript, nothing to break, nothing to gate behind
reduced-motion preferences.

### The contact form

Plain HTML `<form>` that POSTs to Formspree (a service that receives form
submissions and emails them to you - free tier is fine). Works on a static
host because the browser does the submitting.

**TODO before launch:** create a form at https://formspree.io, then replace
`YOUR_FORM_ID` in `app/contact/page.tsx` with the real id.

Validation is the browser's own (`required`, `type="email"`). The red
invalid-border styling lives in `globals.css` (`:user-invalid` fires only
after the user has interacted with a field).

### Placeholders and how to replace them

The site currently ships with NO placeholders: every missing asset's
section was reflowed to a text-only layout, and each spot carries a JSX
comment describing the asset and the exact markup/classes to restore the
original image layout. `components/media-slot.tsx` still exists (unused)
if a labeled placeholder box is ever wanted during development again.

To add a real image: put the file in `public/images/` and follow the
restore comment at the marked spot, e.g. `<img src="/images/file.jpg"
alt="..." width={...} height={...} />`. For the hero video, follow the
hero comment in `app/page.tsx` and use:

```
<video autoPlay muted loop playsInline poster="/images/poster.jpg"
       className="absolute inset-0 h-full w-full object-cover">
  <source src="/videos/flight.mp4" type="video/mp4" />
</video>
```

Assets in place:

- About: 6 team headshots, 800x800 JPEGs in `public/images/team/`
  (originals in `assets/`; Nathan's was center-cropped square + resized,
  Hank's was 797x797 upscaled to 800x800).

Assets still needed (each described by a comment at its spot in the page):

1. Hero: flight/field-test video + poster still.
2. Current Project: deforestation editorial photo
   (candidate: Science article image, Guardian/Eyevine/Redux - NEEDS LICENSE).
3. Tools row wide: drone-training photo
   (candidate: CNN image, Marizilda Cruppe/WWF-UK - NEEDS LICENSE).
4. Tools row square: ranger patrol photo
   (candidate: Junglekeepers Instagram post Cz3179MAXcq - ask them).
5. Requirements: prototype workbench photo (our own).
6. About: team group photo (our own).

Licensing note: citing a photo credits the author; it is not permission.
Agency photos (Guardian/eyevine, WWF) need a paid license. The
Junglekeepers photo needs a simple written OK from them.

### Day-to-day commands

```
npm install       # once per machine, installs node_modules
npm run dev       # local dev server at http://localhost:3000, live-reloads
npm run build     # type-checks + builds the deployable site into out/
```

Deploy = publish the `out/` folder to GitHub Pages (e.g. push it to the
Pages branch, or use an Action that runs `npm run build` and uploads
`out/`). `public/.nojekyll` is required so Pages serves the `_next/`
folder (Jekyll ignores underscore-folders by default).

If the site is served from `username.github.io/REPO` instead of a custom
domain, set `basePath: "/REPO"` in `next.config.ts`. With the custom
domain (sylva.systems) leave it as is.

### Adding blog posts later

`app/blog/page.tsx` is a stub. Simplest path when posts exist: create
`app/blog/my-post-title/page.tsx` per post (URL becomes
`/blog/my-post-title/`) and turn the blog page into a list of links.
When there are more than a handful, switch to Markdown files + a loader -
ask Claude to wire that up when the time comes.
