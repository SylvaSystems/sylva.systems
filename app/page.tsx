import Link from "next/link";
// Animated hero grid, parked for now - see the comment in the hero below.
// import { HeroLattice } from "@/components/hero-lattice";

/*
  LANDING PAGE ("/").

  All visible copy is verbatim from content.md - no generated site text.
  Six sections, each a different layout family (a tasteskill rule: no two
  sections on the page share the same shape):
    1. Hero: centered pitch panel (fullscreen video returns later)
    2. Current Project: text lede
    3. Two-column academic text
    4. Statement band (tinted)
    5. Definition grid, closed by the regulatory paragraph
    6. Display-figure split (Q4 2026)

  All imagery is deferred until assets are shot/licensed; each section
  keeps a comment describing the asset and the exact layout to restore.

  Recurring Tailwind idioms used below (see CLAUDE.md for the full tour):
  - "mx-auto max-w-page px-4 sm:px-8" = the standard centered content column
  - "md:grid-cols-N" = N columns on desktop, single column on phones
  - "md:col-span-N" = how many of those columns an item occupies
*/

/*
  The four platform requirements from content.md, as data. Kept up here so
  the JSX below can loop over them (requirements.map) instead of repeating
  the same markup four times. Edit the text here, not in the JSX.
*/
const requirements = [
  {
    term: "Reliable",
    detail: "to be easy to use and dependable over thousands of flights.",
  },
  {
    term: "Rugged",
    detail:
      "to survive the harsh conditions of the jungle and to be field-repairable.",
  },
  {
    term: "Long-range",
    detail:
      "to be able to fly 100+ miles and cover the vast swathes of forest under protection in a single flight.",
  },
  {
    term: "Autonomous",
    detail:
      "to make that long-haul possible, adapt to critical situations, and make it home safely every time.",
  },
];

export default function Home() {
  return (
    /* <>...</> is a "fragment": lets us return several sections without
       adding a wrapper element to the HTML */
    <>
      {/*
        1. HERO. Interim video-less version: one viewport, pitch panel
        centered on plain paper.

        When the flight/field-test video exists, restore the pure-CSS
        scroll trick (see git history for the exact markup):
        - Make the <section> h-[200dvh]: a two-viewport scroll "runway".
        - Inside it, a "sticky top-0 h-[100dvh]" wrapper holding the
          <video autoPlay muted loop playsInline poster=...> at
          "absolute inset-0 h-full w-full object-cover": scrolls until it
          hits the top, then stays pinned fullscreen while the runway
          scrolls by, then unpins and scrolls away.
        - Move the panel wrapper div below back to
          "absolute inset-x-0 top-0 z-10 mx-auto flex h-[100dvh] w-full
          max-w-page items-center justify-center px-4 sm:px-8" so it
          overlays the first viewport only and scrolls off to reveal the
          video (and return the panel to bg-paper/95 for contrast over
          footage).
      */}
      <section className="relative bg-diamond">
        {/*
          PARKED: <HeroLattice /> - animated signal lines crawling the
          lattice (components/hero-lattice.tsx, fully built and working).
          To re-enable: uncomment the import at the top of this file and
          render <HeroLattice /> right here, before the panel wrapper.
          The .bg-diamond class on the section doubles as its no-JS /
          reduced-motion fallback, so nothing else changes.
        */}
        {/* relative z-10 lifts the panel layer above the (future) canvas.
            Compact band, not a full viewport: just enough grid showing
            around the card. (Restore h-[100dvh] + items-center when the
            fullscreen video hero returns.) */}
        <div className="relative z-10 mx-auto flex w-full max-w-page justify-center px-4 py-10 sm:px-8 sm:py-14">
          {/* Solid paper panel sits on the diamond lattice; tight padding
              and gaps keep the card dense. data-hero-panel lets the
              canvas find these bounds for its adaptive line opacity. */}
          <div
            data-hero-panel
            className="max-w-3xl border border-rule bg-paper p-6 sm:p-7"
          >
            <h1 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
              Sylva Systems is a team designing and deploying mechatronics
              solutions for unique conservation challenges.
            </h1>
            <p className="mt-4 max-w-measure text-lg leading-relaxed text-ink-soft">
              Closely working with an organization based in the Amazon
              Rainforest, we are building an autonomous, long-range, unmanned
              aerial vehicle (UAV) as our pilot project.
            </p>
            {/* The two CTAs. One label per destination, reused site-wide:
                "Reach out" always means /contact/, "Meet the team" always /about/ */}
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/contact/"
                className="bg-pine px-6 py-3 text-lg text-paper transition-colors hover:bg-pine-deep active:translate-y-px"
              >
                Reach out
              </Link>
              <Link
                href="/about/"
                className="border border-ink px-6 py-3 text-lg transition-colors hover:border-pine hover:text-pine active:translate-y-px"
              >
                Meet the team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/*
        2. CURRENT PROJECT. Single text column for now. When the editorial
        image lands (deforestation/illegal mining damage in the Amazon,
        16:9 crop; candidate: the Science article image, Guardian/Eyevine/
        Redux, NEEDS LICENSE), restore the split layout: wrap the heading +
        lede in <div className="grid items-center gap-12 md:grid-cols-2">
        <div>...</div> and put the <img className="aspect-video w-full
        object-cover" /> as the second grid child.
      */}
      <section className="mx-auto max-w-page px-4 pb-24 pt-12 sm:px-8">
        <h2 className="text-2xl font-bold md:text-3xl">Current Project</h2>
        <p className="mt-6 max-w-measure text-lg leading-relaxed">
          Rangers in the Amazon Rainforest face a daunting daily task:
          surveying the hundreds of thousands of acres under their
          protection. Illegal logging, mining, and slash-and-burn farming
          operations pose as constant threats.
        </p>
      </section>

      {/*
        3. THE EXISTING TOOLS AND THEIR LIMITS: two-column academic text
        with a vertical hairline between the columns (md:divide-x), like a
        two-column LaTeX paper.
      */}
      <section className="mx-auto max-w-page px-4 pb-24 sm:px-8">
        <div className="grid gap-10 md:grid-cols-2 md:gap-0 md:divide-x md:divide-rule">
          <p className="leading-relaxed text-ink-soft md:pr-10">
            Networks of trails allow operators to patrol their land, but when
            sections of their reserves are days away via boat or foot, they can
            be limiting. Technology already helps aid this. When the roar of
            chainsaws are heard, small off the shelf drones can be shot up and
            scout out the area. Satellite imagery can be used to create
            revealing before-and-after snapshots of the forest. Even small
            planes can be rented out from local communities to fly overhead,
            giving a much needed birds-eye view of any emergent developments.
          </p>
          <p className="leading-relaxed text-ink-soft md:pl-10">
            But these too have their limitations. Commercial drones have ranges
            of only a couple of miles, not the hundreds needed to fly a
            complete tour. They also usually can’t handle the insane
            humidity and environmental conditions of the Amazon. Drones are
            sometimes considered an annual expense with how often they need to
            be replaced. Satellite images can take months to update, are
            expensive to order, and can’t provide the detailed precision
            often needed. Renting flight time with planes can also be expensive
            between fuel and pilot labor costs. Scheduling challenges mean that
            it can sometimes be 1-2 months between flights.
          </p>
        </div>
        {/*
          Asymmetric photo row goes here once the two photos are licensed:
          drone-training photo (candidate: CNN image, Marizilda Cruppe/
          WWF-UK, NEEDS LICENSE) + rangers-on-patrol photo (candidate:
          Junglekeepers Instagram post Cz3179MAXcq, needs their OK).
          Restore as:

          <div className="mt-14 grid gap-6 md:grid-cols-5">
            <img className="aspect-[3/2] w-full object-cover md:col-span-3" ... />
            <img className="aspect-[3/2] w-full object-cover md:col-span-2 md:aspect-auto md:h-full" ... />
          </div>
        */}
      </section>

      {/* 4. STATEMENT BAND: the thesis sentence on a pine-tinted band.
          bg-pine/[0.06] = the accent at 6% opacity over paper */}
      <section className="bg-pine/[0.06]">
        <div className="mx-auto max-w-page px-4 py-16 sm:px-8">
          <p className="max-w-4xl text-2xl font-bold leading-snug md:text-3xl">
            We are bridging the gap between
            commercial drones and military-grade UAVs for remote, rainforest enviornments.
          </p>
        </div>
      </section>

      {/*
        5. PLATFORM REQUIREMENTS: a definition list (<dl> = term + detail
        pairs, the semantically correct HTML for this) looping over the
        requirements array at the top of this file. The regulatory
        paragraph closes the section.

        When the prototype workbench photo exists (UAV on the bench or wing
        assembly in progress, portrait 4:5 crop, our own shot), restore the
        3/5 + 2/5 split: wrap the <dl> in
        <div className="mt-12 grid gap-12 md:grid-cols-5"> with the dl at
        md:col-span-3 (and drop its mt-12), and add
        <img className="aspect-[4/5] w-full object-cover md:col-span-2" />
        as the second grid child.
      */}
      <section className="mx-auto max-w-page px-4 py-28 sm:px-8">
        <h2 className="text-2xl font-bold md:text-3xl">
          Above all else, our platform needs to be:
        </h2>
        <dl className="mt-12 grid gap-x-12 gap-y-14 sm:grid-cols-2">
          {/* .map() renders one <div> per requirement; key= helps React
              track list items */}
          {requirements.map(({ term, detail }) => (
            <div key={term}>
              <dt className="text-xl font-bold">
                <span className="text-pine">{term}</span>,
              </dt>
              <dd className="mt-2 max-w-[48ch] leading-relaxed text-ink-soft">
                {detail}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-14 max-w-measure leading-relaxed">
          All of these capabilities and constraints must also match existing
          regulatory frameworks in order to be able to fly. It’s why
          we’re prioritizing simple, safe, and cost-effective design
          choices.
        </p>
      </section>

      {/* 6. TIMELINE: big Q4 2026 display figure left (2/5), announcement
          text right (3/5). border-t draws the hairline above the section. */}
      <section className="border-t border-rule">
        <div className="mx-auto grid max-w-page gap-12 px-4 py-20 sm:px-8 md:grid-cols-5">
          <p className="text-5xl font-bold tracking-tight text-pine md:col-span-2 md:text-6xl">
            Q4 2026
          </p>
          <p className="leading-relaxed md:col-span-3">
            We are excited to announce that we are working hand in hand with a
            conservation organization for this project. We are currently in
            the design and prototyping stage, and hope to demo an initial
            product in the Amazon Basin by the end of Q4 2026.
          </p>
        </div>
      </section>
    </>
  );
}
