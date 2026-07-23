/*
  MediaSlot: a labeled placeholder box for images/video we don't have yet.

  Instead of shipping fake stock photos, every missing asset renders as a
  dashed box that states exactly what belongs there (and, where relevant,
  the licensing status of the candidate image). Swap each one for a real
  <img> or <video> as assets arrive - see CLAUDE.md "Placeholders".

  How to read the props (the function's inputs, listed in the curly braces):
  - description: the text shown inside the box, and read to screen readers.
  - aspect: a Tailwind aspect-ratio class controlling the box's shape,
    e.g. "aspect-video" (16:9) or "aspect-square". Defaults to 16:9.
    Pass "" when a parent element controls the size instead (the hero).
  - className: extra Tailwind classes merged in by whoever uses the slot
    (grid column spans, absolute positioning, etc.).
*/
export function MediaSlot({
  description,
  aspect = "aspect-video",
  className = "",
}: {
  description: string;
  aspect?: string;
  className?: string;
}) {
  return (
    /*
      role="img" + aria-label: assistive tech announces this as an image
      with the description, matching how the real asset will behave.
      The backtick string merges the fixed classes with the two props.
    */
    <figure
      role="img"
      aria-label={`Placeholder: ${description}`}
      className={`flex items-center justify-center border border-dashed border-rule bg-ink/[0.03] ${aspect} ${className}`}
    >
      {/* The visible description, centered, capped at a readable width */}
      <figcaption className="max-w-[36ch] px-4 text-center text-sm italic text-ink-soft">
        {description}
      </figcaption>
    </figure>
  );
}
