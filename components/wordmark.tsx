/*
  The placeholder wordmark lockup (owner spec, brandkit round):

    Line 1  SYLVA    Latin Modern bold, ink,  letter-spacing 0.24em
    Line 2  SYSTEMS  Latin Modern regular, pine, letter-spacing 0.52em,
                     0.46x the size of line 1, small gap below line 1

  Everything inside is sized in em, so the whole lockup scales from ONE
  font-size set by the parent (e.g. text-[30px] on the wrapping element).
  The ratios (0.467x size, 0.29em gap = 4px at 30px) then hold at any size.

  The negative margin-right trick: CSS letter-spacing adds a trailing gap
  after the LAST letter too, which pushes the text optically off-center by
  half a tracking unit. -mr-[same value] cancels that phantom space so
  both lines center on the same true axis.
*/
export function Wordmark() {
  return (
    <span className="inline-block text-center leading-none">
      <span className="block font-bold tracking-[0.24em] -mr-[0.24em] text-ink">
        SYLVA
      </span>
      {/* 0.4667em = 14px when line 1 is 30px; mt-[0.29em] = 4px at that size */}
      <span className="mt-[0.29em] block text-[0.4667em] font-normal tracking-[0.52em] -mr-[0.52em] text-pine">
        SYSTEMS
      </span>
    </span>
  );
}
