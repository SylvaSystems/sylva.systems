"use client";

/*
  Spinning line-art turntable of the Sylva 1 airframe.

  Same behaviour as the globe on nathanhattrup.com - auto-spin, drag to turn,
  resume after a moment - but the subject is a CAD model, so the drawing is a
  real 3D render rather than a projection the browser can do on its own.

  How the "pen" look is produced, all at runtime:
  - A paper-coloured copy of the mesh is drawn first with a polygon offset,
    pushing it a hair away from the camera. It is invisible against the page
    but it fills the depth buffer, which is what removes hidden lines.
  - Crease and boundary edges are static: they never change as the camera
    orbits, so they are uploaded once.
  - Silhouette edges (where the surface turns away from the viewer) depend on
    the view, so they are recomputed every frame on the CPU. That is one dot
    product per face plus a sign comparison per candidate edge, which is well
    under a millisecond for this model.

  Geometry arrives as public/drone/sylva1.bin, a quantised position + index
  blob written by scripts/export-drone-geometry.py. Adjacency, normals, and
  the edge sets are all derived here at load, so nothing else ships.

  Progressive enhancement, in three tiers:
  - No JavaScript, or no WebGL: the server-rendered still frame stays on
    screen. It is framed identically to the live view, so the handover when
    WebGL does start is invisible.
  - Reduced motion: no auto-spin, but dragging still works (matches the globe).
  - Otherwise: auto-spin, pausing while dragged and while off-screen.
*/

import { useEffect, useRef } from "react";
import type * as THREE from "three";

// ------------------------------------------------------------------
// Tunables - fiddle with these
// ------------------------------------------------------------------
const SPIN_SPEED = 0.02; // auto-spin, degrees per millisecond (0.02 = 20 deg/s)
const RESUME_DELAY = 500; // ms after releasing a drag before auto-spin resumes
const DRAG_SWEEP = 180; // degrees of yaw per full-width drag
const ELEV_LIMIT = 80; // degrees of tilt allowed either side of level
// Detail controls. CREASE_DEG is the fold angle above which an edge is always
// drawn: lower keeps more feature lines (panel joints, propeller and tail
// detail) at the cost of more line work. FLAT_DEG is the opposite end - below
// it two faces are treated as coplanar, so their shared edge can never form a
// silhouette and is dropped from the per-frame candidate list.
const CREASE_DEG = 15;
const FLAT_DEG = 0.25;

type Still = {
  w: number;
  h: number;
  elev: number;
  az0: number;
  camWidth: number;
  camHeight: number;
};

/** Decode the SYLV blob into a three.js geometry. */
function readBlob(buf: ArrayBuffer) {
  const dv = new DataView(buf);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== "SYLV") throw new Error("bad model blob");
  const version = dv.getUint32(4, true);
  const nverts = dv.getUint32(8, true);
  const ntris = dv.getUint32(12, true);
  const bmin = new Float32Array(buf, 16, 3);
  const bscale = new Float32Array(buf, 28, 3);

  let off = 40;
  const q = new Uint16Array(buf, off, nverts * 3);
  off += nverts * 6;
  const index =
    version === 2
      ? new Uint32Array(buf, off, ntris * 3)
      : new Uint16Array(buf, off, ntris * 3);

  const pos = new Float32Array(nverts * 3);
  for (let i = 0; i < nverts; i++) {
    pos[i * 3] = bmin[0] + q[i * 3] * bscale[0];
    pos[i * 3 + 1] = bmin[1] + q[i * 3 + 1] * bscale[1];
    pos[i * 3 + 2] = bmin[2] + q[i * 3 + 2] * bscale[2];
  }
  return { pos, index, nverts, ntris };
}

/**
 * Walk the triangles once to find every unique edge and the (up to two) faces
 * that share it, then sort those edges into the two sets the renderer needs.
 */
function buildEdges(pos: Float32Array, index: Uint16Array | Uint32Array, nverts: number, ntris: number) {
  // Face normals, needed for both the fold angle and the silhouette test.
  const nrm = new Float32Array(ntris * 3);
  for (let t = 0; t < ntris; t++) {
    const a = index[t * 3] * 3;
    const b = index[t * 3 + 1] * 3;
    const c = index[t * 3 + 2] * 3;
    const ux = pos[b] - pos[a];
    const uy = pos[b + 1] - pos[a + 1];
    const uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a];
    const vy = pos[c + 1] - pos[a + 1];
    const vz = pos[c + 2] - pos[a + 2];
    let x = uy * vz - uz * vy;
    let y = uz * vx - ux * vz;
    let z = ux * vy - uy * vx;
    const L = Math.hypot(x, y, z) || 1;
    nrm[t * 3] = x / L;
    nrm[t * 3 + 1] = y / L;
    nrm[t * 3 + 2] = z / L;
  }

  // Edge table. Key packs the two vertex ids, smaller one first.
  const slot = new Map<number, number>();
  const eV0: number[] = [];
  const eV1: number[] = [];
  const eF0: number[] = [];
  const eF1: number[] = [];
  for (let t = 0; t < ntris; t++) {
    for (let k = 0; k < 3; k++) {
      const a = index[t * 3 + k];
      const b = index[t * 3 + ((k + 1) % 3)];
      const lo = a < b ? a : b;
      const hi = a < b ? b : a;
      const key = lo * nverts + hi;
      const at = slot.get(key);
      if (at === undefined) {
        slot.set(key, eV0.length);
        eV0.push(lo);
        eV1.push(hi);
        eF0.push(t);
        eF1.push(-1);
      } else if (eF1[at] < 0) {
        eF1[at] = t;
      }
    }
  }

  const creaseCos = Math.cos((CREASE_DEG * Math.PI) / 180);
  const flatCos = Math.cos((FLAT_DEG * Math.PI) / 180);
  const staticPts: number[] = [];
  const candV0: number[] = [];
  const candV1: number[] = [];
  const candF0: number[] = [];
  const candF1: number[] = [];

  for (let e = 0; e < eV0.length; e++) {
    const f0 = eF0[e];
    const f1 = eF1[e];
    const v0 = eV0[e] * 3;
    const v1 = eV1[e] * 3;
    if (f1 < 0) {
      // open mesh boundary: always drawn
      staticPts.push(pos[v0], pos[v0 + 1], pos[v0 + 2], pos[v1], pos[v1 + 1], pos[v1 + 2]);
      continue;
    }
    const d =
      nrm[f0 * 3] * nrm[f1 * 3] +
      nrm[f0 * 3 + 1] * nrm[f1 * 3 + 1] +
      nrm[f0 * 3 + 2] * nrm[f1 * 3 + 2];
    const ad = Math.abs(d);
    if (ad < creaseCos) {
      staticPts.push(pos[v0], pos[v0 + 1], pos[v0 + 2], pos[v1], pos[v1 + 1], pos[v1 + 2]);
    } else if (ad < flatCos) {
      // Not a fold, but the faces are not coplanar either, so this edge can
      // become a silhouette at some angle. Coplanar edges never can, and
      // dropping them is what keeps the per-frame loop small.
      candV0.push(eV0[e]);
      candV1.push(eV1[e]);
      candF0.push(f0);
      candF1.push(f1);
    }
  }

  return {
    nrm,
    staticPts: new Float32Array(staticPts),
    candV0: new Uint32Array(candV0),
    candV1: new Uint32Array(candV1),
    candF0: new Uint32Array(candF0),
    candF1: new Uint32Array(candF1),
  };
}

export function DroneTurntable({
  still,
  meta,
  label,
}: {
  still: string; // SVG path data, inlined so the drawing exists before JS runs
  meta: Still;
  label: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let az = meta.az0;
    let el = meta.elev;
    let dragging = false; // true while held, and briefly after release
    let visible = true;
    let idleTimer: number | undefined;
    let raf = 0;
    let last: number | null = null;
    let cancelled = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let ready = false;
    // three.js is ~135KB gzipped, so it is code-split and pulled in beside the
    // geometry rather than shipped with the page.
    let T: typeof THREE;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Colours come from the page, so the design tokens in globals.css stay
    // the single source of truth (same trick the globe uses for dark mode).
    const cs = getComputedStyle(document.body);
    const inkCss = cs.color;
    const paperCss = cs.backgroundColor;

    let scene: THREE.Scene;
    let camera: THREE.OrthographicCamera;
    let silGeo: THREE.BufferGeometry;
    let silPos: Float32Array;
    let edges: ReturnType<typeof buildEdges>;
    let ntris = 0;
    let facing: Float32Array;

    function place() {
      const a = (az * Math.PI) / 180;
      const e = (el * Math.PI) / 180;
      const d = new T.Vector3(
        Math.cos(e) * Math.sin(a),
        Math.sin(e),
        Math.cos(e) * Math.cos(a),
      );
      camera.position.copy(d.multiplyScalar(4));
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
      return camera.position.clone().normalize();
    }

    /** Rebuild the silhouette line set for the current view direction. */
    function updateSilhouette(view: THREE.Vector3) {
      const { nrm, candV0, candV1, candF0, candF1 } = edges;
      for (let t = 0; t < ntris; t++) {
        facing[t] =
          nrm[t * 3] * view.x + nrm[t * 3 + 1] * view.y + nrm[t * 3 + 2] * view.z;
      }
      const posAttr = silGeo.getAttribute("position") as THREE.BufferAttribute;
      const src = (silGeo.userData.src as Float32Array);
      let n = 0;
      for (let i = 0; i < candV0.length; i++) {
        if (facing[candF0[i]] > 0 !== facing[candF1[i]] > 0) {
          const a = candV0[i] * 3;
          const b = candV1[i] * 3;
          silPos[n++] = src[a];
          silPos[n++] = src[a + 1];
          silPos[n++] = src[a + 2];
          silPos[n++] = src[b];
          silPos[n++] = src[b + 1];
          silPos[n++] = src[b + 2];
        }
      }
      // Upload only the slice actually written, not the whole capacity buffer.
      posAttr.clearUpdateRanges();
      posAttr.addUpdateRange(0, n);
      posAttr.needsUpdate = true;
      silGeo.setDrawRange(0, n / 3);
    }

    function render() {
      const view = place();
      updateSilhouette(view);
      renderer!.render(scene, camera);
    }

    function frame(now: number) {
      if (cancelled) return;
      if (!dragging && visible) {
        // Advance by elapsed time, so speed does not follow the frame rate
        if (last !== null) {
          az += (now - last) * SPIN_SPEED;
          render();
        }
        last = now;
      } else {
        last = null; // don't bank up elapsed time while paused
      }
      raf = requestAnimationFrame(frame);
    }

    function resize() {
      if (!renderer) return;
      const w = host!.clientWidth;
      const h = Math.round((w * meta.h) / meta.w);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      render();
    }

    // ----------------------------------------------------------------
    // Load geometry, build the scene
    // ----------------------------------------------------------------
    // The blob is the page's largest asset, so it is not requested until the
    // section is nearly in view. Anyone who never scrolls this far pays
    // nothing, and the still frame is on screen the whole time.
    let started = false;

    function load() {
      if (started) return;
      started = true;
      Promise.all([
        import("three"),
        fetch("drone/sylva1.bin").then((r) =>
          r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))),
        ),
      ])
        .then(([three, buf]) => {
          if (cancelled) return;
          T = three;
          const ink = new T.Color(inkCss);
          const paper = new T.Color(paperCss);

          const canvas = document.createElement("canvas");
          renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
          renderer.setClearAlpha(0);

          const { pos, index, nverts, ntris: nt } = readBlob(buf);
          ntris = nt;
          facing = new Float32Array(ntris);
          edges = buildEdges(pos, index, nverts, ntris);

          const geo = new T.BufferGeometry();
          geo.setAttribute("position", new T.BufferAttribute(pos, 3));
          geo.setIndex(new T.BufferAttribute(index, 1));

          scene = new T.Scene();

          // Depth-only stand-in for the solid: invisible against the page,
          // but it is what hides the lines behind it.
          const occluder = new T.Mesh(
            geo,
            new T.MeshBasicMaterial({
              color: paper,
              // The CAD export does not wind every part consistently, so
              // back-face culling would punch holes in the depth buffer and
              // let hidden lines show through. Draw both sides.
              side: T.DoubleSide,
              polygonOffset: true,
              polygonOffsetFactor: 1,
              polygonOffsetUnits: 1,
            }),
          );
          scene.add(occluder);

          const lineMat = new T.LineBasicMaterial({ color: ink });

          const staticGeo = new T.BufferGeometry();
          staticGeo.setAttribute("position", new T.BufferAttribute(edges.staticPts, 3));
          scene.add(new T.LineSegments(staticGeo, lineMat));

          silPos = new Float32Array(edges.candV0.length * 6);
          silGeo = new T.BufferGeometry();
          silGeo.setAttribute(
            "position",
            new T.BufferAttribute(silPos, 3).setUsage(T.DynamicDrawUsage),
          );
          silGeo.userData.src = pos;
          scene.add(new T.LineSegments(silGeo, lineMat));

          camera = new T.OrthographicCamera(
            -meta.camWidth / 2,
            meta.camWidth / 2,
            meta.camHeight / 2,
            -meta.camHeight / 2,
            0.1,
            10,
          );

          canvas.className = "block h-auto w-full";
          host!.appendChild(canvas);
          ready = true;
          host!.dataset.ready = "true";
          svgRef.current?.style.setProperty("display", "none");
          resize();
          if (!reduced) raf = requestAnimationFrame(frame);
        })
        .catch(() => {
          /* no WebGL, or the fetch failed: keep the still frame */
        });
    }

    // ----------------------------------------------------------------
    // Drag to rotate (mouse, pen, touch via Pointer Events)
    // ----------------------------------------------------------------
    let lastX = 0;
    let lastY = 0;

    function onDown(e: PointerEvent) {
      if (!ready) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      window.clearTimeout(idleTimer);
      host!.setPointerCapture(e.pointerId);
    }

    function onMove(e: PointerEvent) {
      if (!dragging || !host!.hasPointerCapture(e.pointerId)) return;
      e.preventDefault(); // stop the page scrolling under a touch drag
      // Model follows the cursor: drag right and the near face travels right,
      // which means the camera orbits the other way.
      const k = DRAG_SWEEP / host!.clientWidth;
      az -= (e.clientX - lastX) * k;
      el = Math.max(-ELEV_LIMIT, Math.min(ELEV_LIMIT, el + (e.clientY - lastY) * k));
      lastX = e.clientX;
      lastY = e.clientY;
      render();
    }

    function onUp(e: PointerEvent) {
      if (!host!.hasPointerCapture(e.pointerId)) return;
      host!.releasePointerCapture(e.pointerId);
      // Resume auto-spin a moment after release
      idleTimer = window.setTimeout(() => {
        dragging = false;
      }, RESUME_DELAY);
    }

    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    window.addEventListener("resize", resize);

    // Fetch on first approach; afterwards, idle the loop while off-screen
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) load();
      },
      { rootMargin: "400px" },
    );
    io.observe(host);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(idleTimer);
      io.disconnect();
      window.removeEventListener("resize", resize);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [meta]);

  return (
    <div
      ref={hostRef}
      // touch-none keeps a drag from scrolling the page instead;
      // cursor-grab only promises interactivity once the model has landed.
      className="w-full touch-none select-none [&[data-ready]]:cursor-grab [&[data-ready]]:active:cursor-grabbing"
      role="img"
      aria-label={label}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${meta.w} ${meta.h}`}
        className="block h-auto w-full text-ink"
      >
        <path
          d={still}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
