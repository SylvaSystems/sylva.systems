"use client";

/*
  HeroLattice: the animated diamond grid behind the hero panel.

  STATUS: PARKED. Built and working, but not currently rendered anywhere;
  the hero shows the static .bg-diamond CSS pattern instead. To re-enable,
  see the "PARKED" comment in the hero section of app/page.tsx.

  This is the site's ONE client component ("use client" above): the
  animation needs randomness and time, which static HTML/CSS cannot do.
  Everything else on the site remains server-rendered static HTML.

  What it does:
  - Paints the same 45-degree diamond lattice as the .bg-diamond CSS
    pattern onto a <canvas> covering the hero section.
  - "Signal" lines light up and crawl along the lattice. Each spawns ON
    the perimeter, never mid-grid: either the entry wall itself, or one
    of the two flanking edges within the entry side's outer 25% (e.g. a
    left-to-right line may start anywhere on the left wall, or on the
    top/bottom edge within the leftmost 25%). It zigzags along grid
    segments (randomly turning at intersections while always trending
    forward) and terminates only by exiting through the opposite
    perimeter: the far wall, or a flanking edge within the far 25%.
    Flanking edges in the first 75% of the crossing bounce the line back
    inward instead.
  - The moving head is slightly thicker than the grid and leaves a trail
    that fades over ~3s.
  - Adaptive intensity: segments near/over the text panel (found via
    [data-hero-panel]) render faint so the pitch stays readable; lines in
    the open margins run at full strength.

  Fallbacks: if JavaScript is off or the visitor prefers reduced motion,
  the canvas stays blank/transparent and the static .bg-diamond CSS
  pattern on the section shows through instead. The animation also stops
  while the hero is scrolled out of view.

  Colors come from the CSS variables in globals.css (teal / pine /
  fuchsia / orange), so a retheme there recolors the lines too.
*/

import { useEffect, useRef } from "react";

/* Perpendicular gap between lattice lines; keep equal to the px value in
   the .bg-diamond pattern so the fallback and the canvas look identical. */
const SPACING = 25;
/* Vertical/horizontal pitch between parallel diagonals (the lattice's
   node grid is a square grid rotated 45 degrees with this diagonal). */
const PITCH = SPACING * Math.SQRT2;
const HALF = PITCH / 2; /* one node step moves (+-HALF, +-HALF) */

const SPEED = 260; /* head speed, px/s along the path (~5s per crossing) */
const FADE_MS = 3000; /* trail after-image fade time */
const MAX_WALKERS = 3; /* 2-3 lines alive at once */
const SPAWN_MIN_MS = 1200; /* random pause between spawns... */
const SPAWN_MAX_MS = 3200; /* ...keeps the population around 2-3 */
const STRAIGHT_BIAS = 0.7; /* chance to keep the current heading at a node */
const GRID_WIDTH = 1.5; /* keep equal to the .bg-diamond line width */
const TRAIL_WIDTH = 2.5; /* "slightly thicker than the grid" */
const HEAD_WIDTH = 3;
const FAINT = 0.35; /* opacity over/near the panel... */
const RAMP_PX = 180; /* ...ramping to 1.0 this far from it */

/* The four signal colors, as globals.css variable names */
const COLOR_VARS = [
  "--token-teal",
  "--pine",
  "--token-fuchsia",
  "--token-orange",
];

type Side = "right" | "left" | "down" | "up";

/* The two lattice steps that make forward progress for each travel
   direction (canvas y grows downward). A walker only ever picks between
   its two forward steps, so it always trends toward the far side. */
const FORWARD_STEPS: Record<Side, [number, number][]> = {
  right: [
    [HALF, -HALF],
    [HALF, HALF],
  ],
  left: [
    [-HALF, HALF],
    [-HALF, -HALF],
  ],
  down: [
    [HALF, HALF],
    [-HALF, HALF],
  ],
  up: [
    [HALF, -HALF],
    [-HALF, -HALF],
  ],
};

type Segment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  doneAt: number; /* when the head finished this segment (for the fade) */
  alpha: number; /* adaptive base opacity, from distance to the panel */
};

type Walker = {
  side: Side;
  exiting: boolean; /* head is on its final segment, leaving the canvas */
  color: string; /* "R G B" channels from the CSS variable */
  x: number; /* head position */
  y: number;
  fromX: number; /* start node of the in-progress segment */
  fromY: number;
  toX: number; /* end node of the in-progress segment */
  toY: number;
  stepIndex: number; /* which of the two forward steps we're on */
  finished: boolean;
  trail: Segment[];
};

export function HeroLattice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const section = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    if (!section || !ctx) return;

    /* Resolve the palette once; values are raw "R G B" channel strings */
    const rootStyle = getComputedStyle(document.documentElement);
    const paper = rootStyle.getPropertyValue("--paper").trim();
    const rule = rootStyle.getPropertyValue("--rule").trim();
    const colors = COLOR_VARS.map((v) => rootStyle.getPropertyValue(v).trim());

    let w = 0;
    let h = 0;
    /* Panel bounds in canvas coordinates, for the adaptive fade */
    let panel = { left: 0, top: 0, right: 0, bottom: 0 };
    let walkers: Walker[] = [];
    let nextSpawnAt = 0;
    let rafId = 0;
    let running = false;
    let inView = true;
    let lastT = 0;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = section.clientWidth;
      h = section.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const p = section
        .querySelector("[data-hero-panel]")
        ?.getBoundingClientRect();
      const s = section.getBoundingClientRect();
      panel = p
        ? {
            left: p.left - s.left,
            top: p.top - s.top,
            right: p.right - s.left,
            bottom: p.bottom - s.top,
          }
        : { left: 0, top: 0, right: 0, bottom: 0 };
    };

    /* Opacity for a point: FAINT within 24px of the panel, ramping up to
       full strength RAMP_PX away from it */
    const alphaAt = (x: number, y: number) => {
      const dx = Math.max(panel.left - 24 - x, 0, x - (panel.right + 24));
      const dy = Math.max(panel.top - 24 - y, 0, y - (panel.bottom + 24));
      const d = Math.hypot(dx, dy);
      return FAINT + (1 - FAINT) * Math.min(d / RAMP_PX, 1);
    };

    /* Nearest lattice node to a point (nodes satisfy y-x and y+x being
       multiples of PITCH) */
    const snap = (x: number, y: number) => {
      const a = Math.round((y - x) / PITCH);
      const b = Math.round((y + x) / PITCH);
      return { x: ((b - a) * PITCH) / 2, y: ((b + a) * PITCH) / 2 };
    };

    const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

    const spawn = (now: number) => {
      const side: Side = (["right", "left", "down", "up"] as Side[])[
        Math.floor(Math.random() * 4)
      ];
      /* Spawn ON the perimeter only, never mid-grid: 50% the entry wall
         itself (anywhere along it), 25% each flanking edge within the
         entry side's outer 25%. snap() then pulls the point onto the
         nearest lattice node (at most ~15px inward - invisible). */
      const r = Math.random();
      let x0 = 0;
      let y0 = 0;
      if (side === "right") {
        if (r < 0.5) [x0, y0] = [0, rand(0, h)];
        else [x0, y0] = [rand(0, 0.25 * w), r < 0.75 ? 0 : h];
      } else if (side === "left") {
        if (r < 0.5) [x0, y0] = [w, rand(0, h)];
        else [x0, y0] = [rand(0.75 * w, w), r < 0.75 ? 0 : h];
      } else if (side === "down") {
        if (r < 0.5) [x0, y0] = [rand(0, w), 0];
        else [x0, y0] = [r < 0.75 ? 0 : w, rand(0, 0.25 * h)];
      } else {
        if (r < 0.5) [x0, y0] = [rand(0, w), h];
        else [x0, y0] = [r < 0.75 ? 0 : w, rand(0.75 * h, h)];
      }
      const start = snap(x0, y0);
      const stepIndex = Math.random() < 0.5 ? 0 : 1;
      const [sx, sy] = FORWARD_STEPS[side][stepIndex];
      walkers.push({
        side,
        exiting: false,
        color: colors[Math.floor(Math.random() * colors.length)],
        x: start.x,
        y: start.y,
        fromX: start.x,
        fromY: start.y,
        toX: start.x + sx,
        toY: start.y + sy,
        stepIndex,
        finished: false,
        trail: [],
      });
      nextSpawnAt = now + rand(SPAWN_MIN_MS, SPAWN_MAX_MS);
    };

    /* Advance a walker's head along the lattice by dist px, committing
       finished segments to its trail and turning at nodes. Termination
       is perimeter-only: crossing the far wall always ends the run;
       crossing a flanking edge ends it only within the far 25% of the
       crossing (the "exit zone"); earlier flank contact bounces the
       line back inward. */
    const advance = (wk: Walker, dist: number, now: number) => {
      while (dist > 0 && !wk.finished) {
        const remaining = Math.hypot(wk.toX - wk.x, wk.toY - wk.y);
        if (dist < remaining) {
          /* Segment length is HALF*sqrt(2), so this is the unit vector */
          wk.x += ((wk.toX - wk.fromX) / (HALF * Math.SQRT2)) * dist;
          wk.y += ((wk.toY - wk.fromY) / (HALF * Math.SQRT2)) * dist;
          return;
        }
        /* Head reaches the node: commit the segment, pick the next step */
        dist -= remaining;
        wk.x = wk.toX;
        wk.y = wk.toY;
        wk.trail.push({
          x1: wk.fromX,
          y1: wk.fromY,
          x2: wk.toX,
          y2: wk.toY,
          doneAt: now,
          alpha: alphaAt((wk.fromX + wk.toX) / 2, (wk.fromY + wk.toY) / 2),
        });
        if (wk.exiting) {
          /* That was the final segment out through the perimeter */
          wk.finished = true;
          return;
        }
        if (Math.random() > STRAIGHT_BIAS) wk.stepIndex = 1 - wk.stepIndex;
        let [sx, sy] = FORWARD_STEPS[wk.side][wk.stepIndex];
        let nx = wk.x + sx;
        let ny = wk.y + sy;
        const horizontal = wk.side === "right" || wk.side === "left";
        const inExitZone =
          wk.side === "right"
            ? wk.x >= 0.75 * w
            : wk.side === "left"
              ? wk.x <= 0.25 * w
              : wk.side === "down"
                ? wk.y >= 0.75 * h
                : wk.y <= 0.25 * h;
        const exitsFar =
          wk.side === "right"
            ? nx >= w
            : wk.side === "left"
              ? nx <= 0
              : wk.side === "down"
                ? ny >= h
                : ny <= 0;
        const exitsFlank = horizontal ? ny < 0 || ny > h : nx < 0 || nx > w;
        if (exitsFar || (exitsFlank && inExitZone)) {
          wk.exiting = true;
        } else if (exitsFlank) {
          /* Flank contact before the exit zone: bounce back inward */
          wk.stepIndex = 1 - wk.stepIndex;
          [sx, sy] = FORWARD_STEPS[wk.side][wk.stepIndex];
          nx = wk.x + sx;
          ny = wk.y + sy;
        }
        wk.fromX = wk.x;
        wk.fromY = wk.y;
        wk.toX = nx;
        wk.toY = ny;
      }
    };

    const drawLattice = () => {
      ctx.fillStyle = `rgb(${paper})`;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = `rgb(${rule} / 0.4)`;
      ctx.lineWidth = GRID_WIDTH;
      ctx.beginPath();
      /* Slope +1 family: y = x + i*PITCH; slope -1: y = -x + j*PITCH */
      for (let b = -Math.ceil(w / PITCH) * PITCH; b <= h + PITCH; b += PITCH) {
        ctx.moveTo(-PITCH, -PITCH + b);
        ctx.lineTo(w + PITCH, w + PITCH + b);
      }
      for (let c = -PITCH; c <= w + h + PITCH; c += PITCH) {
        ctx.moveTo(-PITCH, PITCH + c);
        ctx.lineTo(w + PITCH, -(w + PITCH) + c);
      }
      ctx.stroke();
    };

    const frame = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.1); /* clamp tab-switch gaps */
      lastT = t;

      /* Count only lines still crawling - finished ones fading out
         shouldn't block replacements, or the screen goes empty for
         seconds at a time */
      const active = walkers.reduce((n, wk) => n + (wk.finished ? 0 : 1), 0);
      if (active < MAX_WALKERS && t >= nextSpawnAt) spawn(t);
      for (const wk of walkers) if (!wk.finished) advance(wk, SPEED * dt, t);

      drawLattice();
      ctx.lineCap = "round";
      for (const wk of walkers) {
        /* Fading trail (the after-image) */
        wk.trail = wk.trail.filter((s) => t - s.doneAt < FADE_MS);
        ctx.lineWidth = TRAIL_WIDTH;
        for (const s of wk.trail) {
          const fade = 1 - (t - s.doneAt) / FADE_MS;
          ctx.strokeStyle = `rgb(${wk.color} / ${s.alpha * fade})`;
          ctx.beginPath();
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
          ctx.stroke();
        }
        /* The crawling head, slightly thicker, no fade */
        if (!wk.finished) {
          ctx.lineWidth = HEAD_WIDTH;
          ctx.strokeStyle = `rgb(${wk.color} / ${alphaAt(wk.x, wk.y)})`;
          ctx.beginPath();
          ctx.moveTo(wk.fromX, wk.fromY);
          ctx.lineTo(wk.x, wk.y);
          ctx.stroke();
        }
      }
      walkers = walkers.filter((wk) => !wk.finished || wk.trail.length > 0);

      if (running) rafId = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reducedMotion.matches || !inView) return;
      running = true;
      lastT = performance.now();
      nextSpawnAt = lastT + 800; /* first line shortly after load */
      rafId = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    /* Reduced motion: stop and wipe to transparent so the static CSS
       .bg-diamond pattern underneath takes over */
    const onMotionChange = () => {
      if (reducedMotion.matches) {
        stop();
        walkers = [];
        ctx.clearRect(0, 0, w, h);
      } else {
        start();
      }
    };

    /* Don't burn CPU while the hero is scrolled out of view */
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start();
      else stop();
    });

    const ro = new ResizeObserver(() => {
      resize();
      if (reducedMotion.matches) ctx.clearRect(0, 0, w, h);
      else drawLattice();
    });

    resize();
    if (!reducedMotion.matches) drawLattice();
    reducedMotion.addEventListener("change", onMotionChange);
    io.observe(section);
    ro.observe(section);
    start();

    return () => {
      stop();
      reducedMotion.removeEventListener("change", onMotionChange);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  /* aria-hidden + pointer-events-none: pure decoration, invisible to
     assistive tech, never intercepts clicks */
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
