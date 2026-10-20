// modes-c.ts — web(connecting) + braid(weaving)
import type { Dot, Line, ModeFrame } from './thinking-orb-core'
import { fibDir, finalizeFrame, frac, hashD, lerp, makeProj, radiusScale, vnoise } from './thinking-orb-core'

// web: constellation wires itself (connecting)
export const frameWeb: ModeFrame = (size, t, o) => {
  const cx = size / 2, cy = size / 2
  const R = (size / 2) * 0.8 * (o.spread ?? 1)
  const pt = makeProj(t * 0.12, 0.32, cx, cy, R)
  const rs = radiusScale(size, o.rsPow ?? 0.6)
  const nodeN = o.nodeN ?? 30, thr = o.thr ?? 0.72
  const nodeR = o.nodeR ?? 1.4, nodeRDepth = o.nodeRDepth ?? 1.8

  const nodes: Array<[number, number, number]> = []
  for (let i = 0; i < nodeN; i++) {
    const d = fibDir(i, nodeN)
    const x = d[0] + 0.3 * (vnoise(i * 0.31 + 9, t * 0.24) - 0.5) * 2
    const y = d[1] + 0.3 * (vnoise(i * 0.53 + 27, t * 0.21) - 0.5) * 2
    const z = d[2] + 0.3 * (vnoise(i * 0.77 + 55, t * 0.27) - 0.5) * 2
    const l = Math.sqrt(x * x + y * y + z * z)
    nodes.push([x / l, y / l, z / l])
  }

  const lines: Line[] = []
  const dots: Dot[] = []

  for (let i = 0; i < nodeN; i++) {
    for (let j = i + 1; j < nodeN; j++) {
      const dx = nodes[i][0] - nodes[j][0], dy = nodes[i][1] - nodes[j][1], dz = nodes[i][2] - nodes[j][2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist >= thr) continue
      const [x1, y1, z1] = pt(nodes[i][0], nodes[i][1], nodes[i][2])
      const [x2, y2, z2] = pt(nodes[j][0], nodes[j][1], nodes[j][2])
      const depth = ((z1 + z2) / 2 + 1) / 2
      lines.push({
        x1, y1, x2, y2,
        white: 0.42,
        a: (1 - dist / thr) * (0.3 + 0.55 * depth),
        w: Math.max(0.6, (o.lineW ?? 0.8) * rs)
      })
    }
  }

  for (let i = 0; i < nodeN; i++) {
    const [px, py, z] = pt(nodes[i][0], nodes[i][1], nodes[i][2])
    const depth = (z + 1) / 2
    const pulse = 1 + 0.25 * Math.sin(t * 1.4 + i * 2.7)
    dots.push({ x: px, y: py, z, r: (nodeR + nodeRDepth * depth) * pulse * rs, white: 0.55 - 0.45 * depth })
  }

  const signals = o.signals ?? 5
  for (let s = 0; s < signals; s++) {
    const seg = Math.floor(t * 0.55 + s * 7.31)
    const a = Math.floor(hashD(seg, s * 3.1 + 1.7) * nodeN)
    const b = Math.floor(hashD(seg, s * 5.7 + 4.2) * nodeN)
    if (a === b) continue
    const f = frac(t * 0.55 + s * 7.31)
    const x = lerp(nodes[a][0], nodes[b][0], f)
    const y = lerp(nodes[a][1], nodes[b][1], f)
    const z = lerp(nodes[a][2], nodes[b][2], f)
    const l = Math.max(1e-6, Math.sqrt(x * x + y * y + z * z))
    const [px, py, zr] = pt(x / l, y / l, z / l)
    const depth = (zr + 1) / 2
    dots.push({ x: px, y: py, z: zr, r: (nodeR * 1.5 + nodeRDepth * depth) * rs, white: 0.05, a: 0.5 + 0.5 * depth })
  }

  return finalizeFrame(dots, lines, o.rMin)
}

// braid: three strands plait around the sphere (weaving)
export const frameBraid: ModeFrame = (size, t, o) => {
  const cx = size / 2, cy = size / 2, R = (size / 2) * 0.76
  const pt = makeProj(t * 0.4, 0.3, cx, cy, 1)
  const rs = radiusScale(size, o.rsPow ?? 0.6)
  const dots: Dot[] = []
  const ghostN = o.ghostN ?? 150
  for (let i = 0; i < ghostN; i++) {
    const d = fibDir(i, ghostN)
    const [px, py, z] = pt(d[0] * R, d[1] * R, d[2] * R)
    const depth = (z / R + 1) / 2
    dots.push({ x: px, y: py, z, r: 0.8 * rs, white: 0.78, a: 0.1 + 0.22 * depth })
  }
  const strandN = o.strandN ?? 52, turns = o.turns ?? 3
  for (let s = 0; s < 3; s++) {
    const phase = (s / 3) * 2 * Math.PI
    for (let i = 0; i < strandN; i++) {
      const u = (frac(i / strandN + t * 0.045) * 2 - 1) * 0.96
      const surf = Math.sqrt(Math.max(0, 1 - u * u))
      const endFade = Math.min(1, (1 - Math.abs(u)) / 0.1)
      const a = u * Math.PI * turns + phase
      const weave = 1 + 0.075 * Math.sin(u * Math.PI * turns * 2 + phase * 2 + t * 0.8)
      const rr = surf * R * weave
      const [px, py, zr] = pt(Math.cos(a) * rr, u * R * weave, Math.sin(a) * rr)
      const depth = (zr / R + 1) / 2
      dots.push({
        x: px, y: py, z: zr,
        r: ((o.rBase ?? 1.2) + (o.rDepth ?? 1.8) * depth) * rs,
        white: 0.55 - 0.45 * depth,
        a: endFade * (0.45 + 0.55 * depth)
      })
    }
  }
  return finalizeFrame(dots, [], o.rMin)
}
