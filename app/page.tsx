import Link from "next/link";
import { MediaSlot } from "@/components/media-slot";

/*
  LANDING PAGE ("/").

  All visible copy is verbatim from content.md - no generated site text.
  Six sections, each a different layout family (a tasteskill rule: no two
  sections on the page share the same shape):
    1. Hero: pitch panel over a pinned fullscreen video
    2. Current Project: text + image split
    3. Two-column academic text + asymmetric photo row
    4. Statement band (tinted)
    5. Definition grid + side visual, closed by the regulatory paragraph
    6. Display-figure split (Q4 2026)

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
        1. HERO. The scroll trick, all pure CSS:
        - The <section> is 200dvh tall: a two-viewport "runway" of scroll.
        - The video wrapper is sticky top-0 at 100dvh: it scrolls until it
          hits the top of the screen, then stays pinned, filling the
          viewport, while the rest of the runway scrolls by.
        - The pitch panel lives in an absolute layer over the FIRST
          viewport only, so it scrolls away normally, revealing the video.
        - When the runway ends, the video unpins and scrolls away too.
        To tune how long the video holds the screen alone, change h-[200dvh].
        When the real video arrives, swap MediaSlot for:
        <video autoPlay muted loop playsInline poster=...>.
      */}
      <section className="relative h-[200dvh]">
        <div className="sticky top-0 h-[100dvh]">
          <MediaSlot
            description="Video: the team flying and field-testing a UAV prototype. Muted autoplay loop, fills the viewport behind this panel. Fallback poster: still frame from the same flight."
            aspect=""
            className="absolute inset-0 border-x-0"
          />
        </div>

        {/* The pitch panel layer: centered both ways over the first viewport.
            z-10 stacks it above the video. */}
        <div className="absolute inset-x-0 top-0 z-10 mx-auto flex h-[100dvh] w-full max-w-page items-center justify-center px-4 sm:px-8">
          {/* Solid paper panel guarantees text contrast over any footage */}
          <div className="max-w-4xl border border-rule bg-paper/95 p-8 sm:p-10">
            <h1 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
              Sylva Systems is a team designing and deploying mechatronics
              solutions for unique conservation challenges.
            </h1>
            <p className="mt-6 max-w-measure text-lg leading-relaxed text-ink-soft">
              Closely working with an organization based in the Amazon
              Rainforest, we are building an autonomous, long-range, unmanned
              aerial vehicle (UAV) as our pilot project.
            </p>
            {/* The two CTAs. One label per destination, reused site-wide:
                "Reach out" always means /contact/, "Meet the team" always /about/ */}
            <div className="mt-10 flex flex-wrap gap-4">
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

      {/* 2. CURRENT PROJECT: heading + lede on the left, editorial image
          placeholder on the right; stacks to one column on phones */}
      <section className="mx-auto max-w-page px-4 py-24 sm:px-8">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Current Project</h2>
            <p className="mt-6 max-w-measure text-lg leading-relaxed">
              Rangers in the Amazon Rainforest face a daunting daily task:
              surveying the hundreds of thousands of acres under their
              protection. Illegal logging, mining, and slash-and-burn farming
              operations pose as constant threats.
            </p>
          </div>
          <MediaSlot
            description="Photograph: deforestation or illegal mining damage in the Amazon, editorial 16:9 crop. Candidate: the Science article image (Guardian/Eyevine/Redux), pending license."
            aspect="aspect-video"
          />
        </div>
      </section>

      {/*
        3. THE EXISTING TOOLS AND THEIR LIMITS: two-column academic text
        with a vertical hairline between the columns (md:divide-x), like a
        two-column LaTeX paper. Below it, an asymmetric photo row: the two
        slots split the width 3/5 + 2/5 (col-span-3 / col-span-2).
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
        <div className="mt-14 grid gap-6 md:grid-cols-5">
          <MediaSlot
            description="Photograph: drone training or field tech in use, 3:2 crop. Candidate: the CNN drone-training image (Marizilda Cruppe/WWF-UK), pending license."
            aspect="aspect-[3/2]"
            className="md:col-span-3"
          />
          <MediaSlot
            description="Photograph: rangers on patrol, square crop. Candidate: the Junglekeepers Instagram ranger photo, pending their permission."
            aspect="aspect-[3/2] md:aspect-auto"
            className="md:col-span-2"
          />
        </div>
      </section>

      {/* 4. STATEMENT BAND: the thesis sentence on a pine-tinted band.
          bg-pine/[0.06] = the accent at 6% opacity over paper */}
      <section className="bg-pine/[0.06]">
        <div className="mx-auto max-w-page px-4 py-16 sm:px-8">
          <p className="max-w-4xl text-2xl font-bold leading-snug md:text-3xl">
            That’s where our team comes in: bridging the gap between
            commercial drones and military-grade UAVs, bringing the
            capabilities of the latter at the price point of the former.
          </p>
        </div>
      </section>

      {/*
        5. PLATFORM REQUIREMENTS: a definition list (<dl> = term + detail
        pairs, the semantically correct HTML for this) looping over the
        requirements array at the top of this file. The grid splits 3/5
        for the list, 2/5 for a tall prototype photo slot. The regulatory
        paragraph closes the section.
      */}
      <section className="mx-auto max-w-page px-4 py-28 sm:px-8">
        <h2 className="text-2xl font-bold md:text-3xl">
          Above all else, our platform needs to be:
        </h2>
        <div className="mt-12 grid gap-12 md:grid-cols-5">
          <dl className="grid gap-x-12 gap-y-14 sm:grid-cols-2 md:col-span-3">
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
          <MediaSlot
            description="Photograph: UAV prototype on the workbench or wing assembly in progress, portrait 4:5 crop."
            aspect="aspect-[4/5]"
            className="md:col-span-2"
          />
        </div>
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
