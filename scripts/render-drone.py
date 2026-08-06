"""Offline hidden-line renderer: GLB -> one SVG per turntable frame.

Mirrors a CAD "pen" view: silhouette + crease edges, hidden lines removed by a
z-buffer. Output is line art only, so the frames stay tiny and stay crisp at
any display size.
"""
import argparse, math, os, sys
import numpy as np
from glb import triangles, weld

# ----------------------------------------------------------------------
# Geometry prep
# ----------------------------------------------------------------------


def all_edges(F):
    """Every unique edge with its (up to two) adjacent faces."""
    tri_e = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]], axis=0)
    fidx = np.tile(np.arange(len(F)), 3)
    key = np.sort(tri_e, axis=1)
    order = np.lexsort((key[:, 1], key[:, 0]))
    ks, fs = key[order], fidx[order]
    same = np.all(ks[1:] == ks[:-1], axis=1)
    starts = np.flatnonzero(np.r_[True, ~same])
    counts = np.diff(np.r_[starts, len(ks)])
    E = ks[starts]
    A = np.full((len(E), 2), -1, dtype=np.int64)
    A[:, 0] = fs[starts]
    two = counts >= 2
    A[two, 1] = fs[starts[two] + 1]
    return E, A, counts


def face_normals(V, F):
    v0, v1, v2 = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    n = np.cross(v1 - v0, v2 - v0)
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    return n / np.where(ln == 0, 1, ln)


# ----------------------------------------------------------------------
# Camera
# ----------------------------------------------------------------------


def view_basis(az_deg, el_deg, up_axis=1):
    """Right/up/forward for a turntable camera orbiting the model's up axis."""
    az, el = math.radians(az_deg), math.radians(el_deg)
    # direction from model to camera
    d = np.array([math.cos(el) * math.sin(az), math.sin(el), math.cos(el) * math.cos(az)])
    if up_axis == 2:  # Z-up model
        d = np.array([math.cos(el) * math.sin(az), math.cos(el) * math.cos(az), math.sin(el)])
    world_up = np.zeros(3)
    world_up[up_axis] = 1.0
    right = np.cross(world_up, d)
    right /= np.linalg.norm(right)
    up = np.cross(d, right)
    return np.stack([right, up, d])  # rows: x, y, depth(+ = toward camera)


# ----------------------------------------------------------------------
# Z-buffer
# ----------------------------------------------------------------------


def zbuffer(P, F, res):
    """Rasterise triangles into a depth buffer. P is (n,3) screen x,y,depth.

    Depth is "toward camera", so a LARGER value is nearer; buffer keeps the max.
    """
    Z = np.full((res, res), -np.inf, dtype=np.float64)
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    fx, fy, fz = x[F], y[F], z[F]
    x0 = np.floor(fx.min(1)).astype(np.int64)
    x1 = np.ceil(fx.max(1)).astype(np.int64)
    y0 = np.floor(fy.min(1)).astype(np.int64)
    y1 = np.ceil(fy.max(1)).astype(np.int64)
    np.clip(x0, 0, res - 1, out=x0); np.clip(x1, 0, res - 1, out=x1)
    np.clip(y0, 0, res - 1, out=y0); np.clip(y1, 0, res - 1, out=y1)

    ax, ay = fx[:, 0], fy[:, 0]
    e1x, e1y = fx[:, 1] - ax, fy[:, 1] - ay
    e2x, e2y = fx[:, 2] - ax, fy[:, 2] - ay
    den = e1x * e2y - e1y * e2x

    for t in range(len(F)):
        d = den[t]
        if d == 0.0:
            continue
        gx0, gx1, gy0, gy1 = x0[t], x1[t], y0[t], y1[t]
        if gx1 < gx0 or gy1 < gy0:
            continue
        px = np.arange(gx0, gx1 + 1) + 0.5
        py = np.arange(gy0, gy1 + 1) + 0.5
        rx = px[None, :] - ax[t]
        ry = py[:, None] - ay[t]
        u = (rx * e2y[t] - ry * e2x[t]) / d
        v = (ry * e1x[t] - rx * e1y[t]) / d
        m = (u >= -1e-9) & (v >= -1e-9) & (u + v <= 1 + 1e-9)
        if not m.any():
            continue
        zt = fz[t]
        zz = zt[0] + u * (zt[1] - zt[0]) + v * (zt[2] - zt[0])
        sub = Z[gy0:gy1 + 1, gx0:gx1 + 1]
        np.copyto(sub, zz, where=m & (zz > sub))
    return Z


# ----------------------------------------------------------------------
# Edge visibility + polyline assembly
# ----------------------------------------------------------------------


def visible_runs(P, E, Z, res, bias, max_samples=48):
    """Split each edge into the screen-space runs that survive the depth test."""
    a, b = P[E[:, 0]], P[E[:, 1]]
    seg = b[:, :2] - a[:, :2]
    length = np.hypot(seg[:, 0], seg[:, 1])
    runs = []
    for i in range(len(E)):
        L = length[i]
        n = 2 if L < 2 else min(max_samples, int(L / 1.5) + 2)
        t = np.linspace(0.0, 1.0, n)
        pts = a[i][None, :] + t[:, None] * (b[i] - a[i])[None, :]
        xi = np.clip(pts[:, 0].astype(np.int64), 0, res - 1)
        yi = np.clip(pts[:, 1].astype(np.int64), 0, res - 1)
        vis = pts[:, 2] > Z[yi, xi] - bias
        if not vis.any():
            continue
        if vis.all():
            runs.append((a[i][:2], b[i][:2]))
            continue
        # walk contiguous visible spans, snapping to sample midpoints
        k = 0
        while k < n:
            if not vis[k]:
                k += 1
                continue
            j = k
            while j + 1 < n and vis[j + 1]:
                j += 1
            lo = t[k] - (0.5 / (n - 1) if k > 0 else 0.0)
            hi = t[j] + (0.5 / (n - 1) if j < n - 1 else 0.0)
            if hi - lo > 1e-6:
                p0 = a[i][:2] + lo * (b[i][:2] - a[i][:2])
                p1 = a[i][:2] + hi * (b[i][:2] - a[i][:2])
                if np.hypot(*(p1 - p0)) >= 1.0:
                    runs.append((p0, p1))
            k = j + 1
    return runs


def chain(runs, tol=1.6, collinear_deg=6.0, min_len=0.0):
    """Join runs sharing an endpoint into polylines, then drop redundant points."""
    if not runs:
        return []

    def key(p):
        return (round(p[0] / tol), round(p[1] / tol))

    # endpoint bucket -> list of (run index, end 0|1)
    ends = {}
    for i, (p0, p1) in enumerate(runs):
        ends.setdefault(key(p0), []).append((i, 0))
        ends.setdefault(key(p1), []).append((i, 1))

    used = [False] * len(runs)

    def step(pt, avoid):
        """Find an unused run starting at `pt`; return (index, far endpoint)."""
        for j, e in ends.get(key(pt), ()):
            if used[j] or j == avoid:
                continue
            return j, runs[j][1 - e]
        return None, None

    polys = []
    for i in range(len(runs)):
        if used[i]:
            continue
        used[i] = True
        poly = [runs[i][0], runs[i][1]]
        for direction in (1, 0):           # extend the tail, then the head
            while True:
                j, far = step(poly[-1] if direction else poly[0], -1)
                if j is None:
                    break
                used[j] = True
                if direction:
                    poly.append(far)
                else:
                    poly.insert(0, far)
        polys.append(poly)

    out = []
    for poly in polys:
        keep = rdp(np.array(poly), collinear_deg)   # collinear_deg carries the px tolerance
        # drop whole polylines too short to read at display size
        total = sum(float(np.linalg.norm(keep[i + 1] - keep[i])) for i in range(len(keep) - 1))
        if total >= min_len:
            out.append(keep)
    return out


def rdp(pts, tol):
    """Ramer-Douglas-Peucker: thin a polyline to the points that carry shape.

    Tessellated arcs arrive with dozens of near-collinear points; this drops
    the ones no further than `tol` pixels from the chord, which is where most
    of the frame's byte count lives.
    """
    if len(pts) < 3:
        return list(pts)
    keep = np.zeros(len(pts), dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        a, b = pts[i], pts[j]
        ab = b - a
        L = float(np.hypot(*ab))
        seg = pts[i + 1:j] - a
        if L < 1e-9:
            dist = np.hypot(seg[:, 0], seg[:, 1])
        else:
            dist = np.abs(seg[:, 0] * ab[1] - seg[:, 1] * ab[0]) / L
        k = int(np.argmax(dist))
        if dist[k] > tol:
            k += i + 1
            keep[k] = True
            stack.append((i, k))
            stack.append((k, j))
    return [pts[i] for i in np.flatnonzero(keep)]


# ----------------------------------------------------------------------
# Frame
# ----------------------------------------------------------------------


def render_frame(V, F, N, E, A, creases, az, el, res, out_res, margin, cfg):
    B = view_basis(az, el, cfg['up'])
    S = V @ B.T                       # x, y, depth
    scale = cfg['scale']
    P = np.empty_like(S)
    P[:, 0] = S[:, 0] * scale + res / 2
    P[:, 1] = res / 2 - S[:, 1] * scale            # flip: SVG y grows down
    P[:, 2] = S[:, 2] * scale

    view = B[2]
    facing = N @ view                              # >0 = front facing
    f0, f1 = A[:, 0], A[:, 1]
    sil = (f1 >= 0) & ((facing[f0] > 0) != (facing[np.maximum(f1, 0)] > 0))
    boundary = f1 < 0
    want = creases | sil | boundary
    # an edge is only drawn if it touches at least one front face
    touches_front = (facing[f0] > 0) | ((f1 >= 0) & (facing[np.maximum(f1, 0)] > 0))
    want &= touches_front

    Z = zbuffer(P, F, res)
    bias = cfg['bias'] * scale * cfg['diag']
    runs = visible_runs(P, E[want], Z, res, bias)
    runs = [r for r in runs if np.hypot(*(r[1] - r[0])) >= cfg['min_px']]
    polys = chain(runs, collinear_deg=cfg['collinear'], min_len=cfg['min_poly'])

    # One path per frame: swapping a single `d` attribute is far cheaper at
    # animation time than rebuilding a few hundred <polyline> elements.
    k = out_res / res
    oy = cfg['origin_y'] * k
    d = []
    for poly in polys:
        d.append('M' + ' L'.join(f'{p[0]*k:.0f} {p[1]*k-oy:.0f}' for p in poly))
    return ''.join(d), len(polys)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('glb')
    ap.add_argument('outdir')
    ap.add_argument('--frames', type=int, default=72)
    ap.add_argument('--res', type=int, default=1000)
    ap.add_argument('--out-res', type=int, default=1000)
    ap.add_argument('--elev', type=float, default=25.0)
    ap.add_argument('--az0', type=float, default=0.0)
    ap.add_argument('--crease', type=float, default=22.0)
    ap.add_argument('--min-px', type=float, default=2.5)
    ap.add_argument('--collinear', type=float, default=6.0)
    ap.add_argument('--min-poly', type=float, default=0.0)
    ap.add_argument('--stroke', type=float, default=1.4)
    ap.add_argument('--bias', type=float, default=0.004)
    ap.add_argument('--margin', type=int, default=30)
    ap.add_argument('--up', type=int, default=1)
    ap.add_argument('--only', type=int, default=None, help='render a single frame index')
    args = ap.parse_args()

    V, F = triangles(args.glb)
    V, F = weld(V, F)
    V = V - (V.max(0) + V.min(0)) / 2
    V = V / float(np.max(V.max(0) - V.min(0)))     # normalise to ~unit
    N = face_normals(V, F)
    E, A, counts = all_edges(F)

    # static crease set: dihedral angle above threshold
    cos_t = math.cos(math.radians(args.crease))
    f0, f1 = A[:, 0], A[:, 1]
    dot = np.einsum('ij,ij->i', N[f0], N[np.maximum(f1, 0)])
    creases = (f1 >= 0) & (np.abs(dot) < cos_t)
    creases |= counts > 2
    print(f'{len(E)} edges, {int(creases.sum())} creases, {int((f1<0).sum())} boundary')

    # One framing shared by every frame, so the model turns without swimming
    # or breathing: fit the widest azimuth, then crop to the tallest.
    ext_x = ext_y = 0.0
    for i in range(args.frames):
        B = view_basis(args.az0 + 360.0 * i / args.frames, args.elev, args.up)
        S = V @ B.T
        ext_x = max(ext_x, np.abs(S[:, 0]).max() * 2)
        ext_y = max(ext_y, np.abs(S[:, 1]).max() * 2)
    scale = (args.res - 2 * args.margin) / ext_x
    half_h = ext_y / 2 * scale + args.margin
    origin_y = args.res / 2 - half_h                 # top of the cropped band
    box_h = round(2 * half_h * args.out_res / args.res)
    cfg = dict(up=args.up, bias=args.bias, min_px=args.min_px, stroke=args.stroke,
               diag=1.0, scale=scale, origin_y=origin_y,
               collinear=args.collinear, min_poly=args.min_poly)
    print(f'viewBox 0 0 {args.out_res} {box_h}')

    os.makedirs(args.outdir, exist_ok=True)
    idxs = [args.only] if args.only is not None else list(range(args.frames))
    frames, total = [], 0
    for i in idxs:
        az = args.az0 + 360.0 * i / args.frames
        d, npoly = render_frame(V, F, N, E, A, creases, az, args.elev,
                                args.res, args.out_res, args.margin, cfg)
        frames.append(d)
        total += len(d)
        print(f'  f{i:03d} az={az:6.1f} polylines={npoly:5d} {len(d)/1024:6.1f}KB', flush=True)

    import json as _json
    # camWidth/camHeight are the orthographic frustum in model units. The
    # three.js turntable uses them verbatim so the WebGL view and this still
    # frame it replaces are framed identically, with no jump on handover.
    bundle = {'w': args.out_res, 'h': box_h, 'stroke': args.stroke,
              'elev': args.elev, 'az0': args.az0,
              'camWidth': args.res / scale,
              'camHeight': 2 * half_h / scale,
              'frames': frames}
    out = os.path.join(args.outdir, 'frames.json')
    open(out, 'w').write(_json.dumps(bundle, separators=(',', ':')))
    print(f'{out}: {os.path.getsize(out)/1024:.1f}KB raw')


if __name__ == '__main__':
    main()
