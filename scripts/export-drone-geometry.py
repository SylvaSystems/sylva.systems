"""GLB -> compact geometry blob for the browser turntable.

The full glTF is ~1.9MB and most of it is material and normal data the pen
drawing never uses. This strips it to the two things three.js needs - welded
positions and triangle indices - and quantises the positions to 16 bits.
Vertex normals and the crease-edge set are both derived in the browser at
load time, so they cost nothing here.

Layout (little-endian), all sections 4-byte aligned:

    magic   'SYLV'                     4 bytes
    version u32 = 1
    nverts  u32
    ntris   u32
    bmin    f32 x3        bounding box minimum, for dequantising
    bscale  f32 x3        (bmax - bmin) / 65535
    pos     u16 x3 x nverts
    idx     u16 x3 x ntris   (or u32 when nverts > 65535)
"""
import argparse, struct
import numpy as np
from glb import triangles, weld


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('glb')
    ap.add_argument('out')
    args = ap.parse_args()

    V, F = triangles(args.glb)
    V, F = weld(V, F)

    # Centre on the bounding box and normalise the longest axis to 1, so the
    # browser side never has to know the model's authored units.
    V = V - (V.max(0) + V.min(0)) / 2
    V = V / float(np.max(V.max(0) - V.min(0)))

    bmin = V.min(0)
    bmax = V.max(0)
    span = np.where(bmax - bmin == 0, 1.0, bmax - bmin)
    q = np.round((V - bmin) / span * 65535).astype(np.uint16)

    nv, nt = len(V), len(F)
    wide = nv > 65535
    idx = F.astype(np.uint32 if wide else np.uint16)

    parts = [
        b'SYLV',
        struct.pack('<III', 2 if wide else 1, nv, nt),
        np.asarray(bmin, dtype='<f4').tobytes(),
        np.asarray(span / 65535.0, dtype='<f4').tobytes(),
        q.astype('<u2').tobytes(),
        idx.astype('<u4' if wide else '<u2').tobytes(),
    ]
    blob = b''.join(parts)
    if len(blob) % 4:
        blob += b'\0' * (4 - len(blob) % 4)
    open(args.out, 'wb').write(blob)

    err = np.abs((q.astype(np.float64) / 65535.0 * span + bmin) - V).max()
    print(f'{nv} verts, {nt} tris, {"u32" if wide else "u16"} indices')
    print(f'quantisation error: {err:.2e} of a unit model')
    print(f'{args.out}: {len(blob)/1024:.1f}KB raw')


if __name__ == '__main__':
    main()
