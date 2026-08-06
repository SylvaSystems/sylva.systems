"""Minimal glTF-binary reader -> world-space triangle soup."""
import json, struct
import numpy as np

CTYPE = {5120: 'i1', 5121: 'u1', 5122: 'i2', 5123: 'u2', 5125: 'u4', 5126: 'f4'}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load(path):
    buf = open(path, 'rb').read()
    assert buf[:4] == b'glTF'
    off, jsn, bin_ = 12, None, None
    while off < len(buf):
        ln, kind = struct.unpack_from('<II', buf, off)
        chunk = buf[off + 8: off + 8 + ln]
        if kind == 0x4E4F534A:
            jsn = json.loads(chunk)
        elif kind == 0x004E4942:
            bin_ = chunk
        off += 8 + ln + ((-ln) % 4)
    return jsn, bin_


def accessor(g, bin_, idx):
    """Read accessor `idx` as an (count, ncomp) float/int array, honouring stride."""
    a = g['accessors'][idx]
    n, dt = NCOMP[a['type']], np.dtype('<' + CTYPE[a['componentType']])
    count = a['count']
    if 'bufferView' not in a:
        return np.zeros((count, n), dt)
    bv = g['bufferViews'][a['bufferView']]
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or n * dt.itemsize
    raw = np.frombuffer(bin_, dtype=np.uint8, count=stride * (count - 1) + n * dt.itemsize, offset=base)
    # gather each element's bytes, then reinterpret
    picks = (np.arange(count)[:, None] * stride + np.arange(n * dt.itemsize)[None, :])
    return raw[picks].copy().view(dt).reshape(count, n)


def trs(node):
    if 'matrix' in node:
        return np.array(node['matrix'], dtype=np.float64).reshape(4, 4).T
    m = np.eye(4)
    if 'scale' in node:
        m = np.diag(list(node['scale']) + [1.0]) @ m
    if 'rotation' in node:
        x, y, z, w = node['rotation']
        r = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
            [0, 0, 0, 1]])
        m = r @ m
    if 'translation' in node:
        t = np.eye(4)
        t[:3, 3] = node['translation']
        m = t @ m
    return m


def triangles(path):
    """Return (V, F): world-space vertices (n,3) float64 and triangle indices (m,3)."""
    g, bin_ = load(path)
    verts, faces, base = [], [], 0
    roots = g['scenes'][g.get('scene', 0)]['nodes']

    def walk(ni, parent):
        nonlocal base
        node = g['nodes'][ni]
        world = parent @ trs(node)
        if 'mesh' in node:
            for prim in g['meshes'][node['mesh']]['primitives']:
                if prim.get('mode', 4) != 4:
                    continue
                p = accessor(g, bin_, prim['attributes']['POSITION']).astype(np.float64)
                p = (world[:3, :3] @ p.T).T + world[:3, 3]
                if 'indices' in prim:
                    f = accessor(g, bin_, prim['indices']).astype(np.int64).reshape(-1, 3)
                else:
                    f = np.arange(len(p), dtype=np.int64).reshape(-1, 3)
                verts.append(p)
                faces.append(f + base)
                base += len(p)
        for c in node.get('children', []):
            walk(c, world)

    for r in roots:
        walk(r, np.eye(4))
    return np.vstack(verts), np.vstack(faces)


def weld(V, F, tol=1e-7):
    """Merge coincident vertices so face adjacency can be computed.

    Exporters split vertices per face for flat shading, which makes every edge
    look like a boundary edge. Quantise to `tol` (relative to bbox) and remap.
    """
    scale = float(np.max(V.max(0) - V.min(0)))
    q = np.round((V - V.min(0)) / (scale * tol)).astype(np.int64)
    _, first, inv = np.unique(q, axis=0, return_index=True, return_inverse=True)
    W = V[first]
    G = inv[F]
    G = G[(G[:, 0] != G[:, 1]) & (G[:, 1] != G[:, 2]) & (G[:, 2] != G[:, 0])]
    return W, G


def feature_edges(V, F, angle_deg=20.0):
    """Silhouette-independent edges: boundary edges + creases above `angle_deg`.

    Returns (E, adj) where E is (k,2) vertex-index pairs and adj is (k,2) face
    indices per edge (-1 when the edge is only used once).
    """
    tri_e = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]], axis=0)
    fidx = np.tile(np.arange(len(F)), 3)
    key = np.sort(tri_e, axis=1)
    # unique rows via void view
    order = np.lexsort((key[:, 1], key[:, 0]))
    ks, fs = key[order], fidx[order]
    same = np.all(ks[1:] == ks[:-1], axis=1)
    starts = np.flatnonzero(np.r_[True, ~same])
    counts = np.diff(np.r_[starts, len(ks)])

    n = F[:, 1] - F[:, 0]  # placeholder, replaced below
    v0, v1, v2 = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    nrm = np.cross(v1 - v0, v2 - v0)
    ln = np.linalg.norm(nrm, axis=1, keepdims=True)
    nrm = nrm / np.where(ln == 0, 1, ln)

    E, ADJ = [], []
    cos_t = np.cos(np.radians(angle_deg))
    for s, c in zip(starts, counts):
        e = ks[s]
        if c == 1:
            E.append(e); ADJ.append((fs[s], -1))
        else:
            fa, fb = fs[s], fs[s + 1]
            if abs(float(nrm[fa] @ nrm[fb])) < cos_t:
                E.append(e); ADJ.append((fa, fb))
            elif c > 2:
                E.append(e); ADJ.append((fa, fb))
    return np.array(E, dtype=np.int64), np.array(ADJ, dtype=np.int64)


if __name__ == '__main__':
    import sys
    V, F = triangles(sys.argv[1])
    print('raw   verts', V.shape, 'tris', F.shape)
    V, F = weld(V, F)
    print('welded verts', V.shape, 'tris', F.shape)
    sz = V.max(0) - V.min(0)
    print('size', sz, 'aspect', (sz / sz.max()).round(3))
    for a in (10, 15, 20, 30, 45):
        E, ADJ = feature_edges(V, F, a)
        nb = int((ADJ[:, 1] < 0).sum()) if len(E) else 0
        print(f'  crease {a:>2}deg -> {len(E):>6} edges ({nb} boundary)')
