import type { Metadata } from "next";
import { MediaSlot } from "@/components/media-slot";

/* Overrides the browser-tab title for this page only */
export const metadata: Metadata = {
  title: "Meet the team | Sylva Systems",
};

/*
  ABOUT PAGE ("/about/", linked as "Meet the team").

  All visible copy is verbatim from content.md (the corrupted fragment in
  the About paragraph was repaired per the content owner). Headshots are
  MediaSlot placeholders until real photos arrive.

  Structure: About prose -> team group-photo slot -> The Team list.
  The team data lives in the array below; the JSX loops over it, so bios
  are edited HERE, not in the markup.
*/

const team = [
  {
    name: "Tyler Danner",
    href: "https://www.linkedin.com/in/tyler-danner-a4a3013b1/",
    bio: "grew up in North Carolina and graduated from NC State with a degree in Industrial and Systems Engineering. At Sylva Systems, he’s thrilled to be applying his engineering background to real environmental problems.",
    headshot:
      "Headshot of Tyler Danner, square crop, neutral background, consistent lighting with the rest of the set.",
  },
  {
    name: "Nathan Hattrup",
    href: "https://www.nathanhattrup.com",
    bio: "is pursuing a masters in electrical and nuclear engineering at NC State. He grew up hiking and camping around the country and has a deep desire to be a steward of the natural world. He’s excited to use his engineering skill set to make meaningful contributions to this effort.",
    headshot:
      "Headshot of Nathan Hattrup, square crop, neutral background, consistent lighting with the rest of the set.",
  },
  {
    name: "Luca Antonescu",
    href: "https://www.linkedin.com/in/luca-antonescu-99b7862b3/",
    bio: "a biomedical engineering major, spent the majority of his days in nature. So much so, that its complexity and beauty is what drove him to become an engineer. He believes that nature is what ultimately provides the greatest examples of engineering and design, and it is this quality that drives him to apply his knowledge for its conservation.",
    headshot:
      "Headshot of Luca Antonescu, square crop, neutral background, consistent lighting with the rest of the set.",
  },
  {
    name: "Cole Malinchock",
    href: "https://www.linkedin.com/in/cole-malinchock/",
    bio: "is an NC State mechanical engineering alumni now pursuing a PhD in marine robotics at the University of Michigan. He grew up hiking and biking across North Carolina, and this time in the forest gave him a deep appreciation for the environment and a commitment to protecting it.",
    headshot:
      "Headshot of Cole Malinchock, square crop, neutral background, consistent lighting with the rest of the set.",
  },
  {
    name: "Kevin Spencer",
    href: "https://www.linkedin.com/in/kevin-spencer-995376172/",
    bio: "is an NC State student majoring in computer engineering. Growing up, he loved to watch Whale Wars, where he learned about Sea Shepherd’s conservation efforts. This sparked his interest and passion for helping to solve environmental issues.",
    headshot:
      "Headshot of Kevin Spencer, square crop, neutral background, consistent lighting with the rest of the set.",
  },
];

export default function About() {
  return (
    <>
      <section className="mx-auto max-w-page px-4 pt-20 sm:px-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">About</h1>
        <div className="mt-8 max-w-measure space-y-4 text-lg leading-relaxed">
          <p>
            We originally spun out of North Carolina State University’s{" "}
            <a
              href="https://entrepreneurship.ncsu.edu/engineering-entrepreneurs-program/"
              className="text-pine underline underline-offset-4 hover:text-pine-deep"
            >
              Engineering Entrepreneurs Program
            </a>{" "}
            and received generous funding from the{" "}
            <a
              href="https://entrepreneurship.ncsu.edu/andrews-launch-accelerator/"
              className="text-pine underline underline-offset-4 hover:text-pine-deep"
            >
              Andrews Launch Accelerator
            </a>{" "}
            to continue our work.
          </p>
          <p>
            Our team members’ backgrounds cover a number of engineering
            disciplines with a strong emphasis on embedded systems. Our goal is
            to grow into a team capable of tackling the unique and often
            one-off challenges facing a wide range of environmental fields. We
            aim to accomplish this by developing and building out a
            comprehensive portfolio of robotics and mechatronics projects and
            products.
          </p>
          <p className="text-ink-soft">
            Ultimately, we are so thrilled for this opportunity to help serve
            and support groundbreaking conservation work across the globe!
          </p>
        </div>
      </section>

      {/* Full-width team group photo (placeholder until shot) */}
      <section className="mx-auto max-w-page px-4 pt-16 sm:px-8">
        <MediaSlot
          description="Group photograph of the five-person team, in the lab or field, candid, wide 3:2 crop."
          aspect="aspect-[3/2]"
        />
      </section>

      <section className="mx-auto max-w-page px-4 py-24 sm:px-8">
        <h2 className="text-2xl font-bold md:text-3xl">The Team</h2>
        {/*
          One row per person: fixed 10rem headshot column + flexible text
          column (grid-cols-[10rem_1fr]); stacks vertically on phones.
          space-y-16 puts even vertical gaps between rows - whitespace
          instead of divider lines.
        */}
        <ul className="mt-12 space-y-16">
          {team.map(({ name, href, bio, headshot }) => (
            <li
              key={name}
              className="grid items-start gap-6 sm:grid-cols-[10rem_1fr] sm:gap-10"
            >
              <MediaSlot description={headshot} aspect="aspect-square" />
              <p className="max-w-measure leading-relaxed">
                <a
                  href={href}
                  className="font-bold text-pine underline underline-offset-4 hover:text-pine-deep"
                >
                  {name}
                </a>{" "}
                {bio}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
