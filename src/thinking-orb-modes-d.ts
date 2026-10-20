// modes-d.ts — ribbon(composing) / ring(breathing) + morph(shaping)
import type { Dot, ModeFrame } from './thinking-orb-core'
import { fibDir, finalizeFrame, makeProj, radiusScale } from './thinking-orb-core'

// ribbon: undulating sash of parallel strands (composing)
// ring 复用同一 painter，靠 faceOn 标志切到环状变形 (breathing)
export const frameRibbon: ModeFrame = (size, t, o) => {
  const cx = size / 2, cy = size / 2, R = (size / 2) * 0.78
  const spin = o.spin ?? 1
  const camTilt = 0.3
  const pt = makeProj(t * 0.1 * spin, camTilt, cx, cy, 1)
  const rs = radiusScale(size, o.rsPow ?? 0.6)
  const dots: Dot[] = []
  const ghostN = o.ghostN ?? 150
  for (let i = 0; i < ghostN; i++) {
    const d = fibDir(i, ghostN)
    const [px, py, z] = pt(d[0] * R, d[1] * R, d[2] * R)
    const depth = (z / R + 1) / 2
    dots.push({ x: px, y: py, z, r: 0.8 * rs, white: 0.78, a: 0.1 + 0.22 * depth })
  }
  const ya = t * 0.24 * spin
  const ta = o.faceOn ? -camTilt : 0.55 + 0.3 * Math.sin(t * 0.18) * spin
  const ux = Math.cos(ya), uy = 0, uz = Math.sin(ya)
  const vx = -uz * Math.sin(ta), vy = Math.cos(ta), vz = ux * Math.sin(ta)
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
  const wobAmp = 0.23 * (o.wobMul ?? 1)
  const baseR = o.faceOn ? R / (1 + 0.85 * wobAmp) : R
  const baseLanes = o.lanes ?? 5, segs = o.segs ?? 88
  const lanes = Math.max(1, Math.round(baseLanes * (o.bandMul ?? 1)))
  for (let w = 0; w < lanes; w++) {
    const laneOff = (w - (lanes - 1) / 2) * 0.075
    const edge = Math.abs(w - (lanes - 1) / 2) / Math.max(1, (lanes - 1) / 2)
    for (let k = 0; k < segs; k++) {
      const a = (k / segs) * 2 * Math.PI
      const wob = (0.16 * Math.sin(a * 3 - t * 1.7 + w * 0.22) + 0.07 * Math.sin(a * 5 + t * 1.1)) * (o.wobMul ?? 1)
      const radial = o.faceOn ? 1 + wob : 1
      const off = o.faceOn ? laneOff : laneOff + wob
      const x = ux * Math.cos(a) + vx * Math.sin(a) + nx * off
      const y = uy * Math.cos(a) + vy * Math.sin(a) + ny * off
      const z = uz * Math.cos(a) + vz * Math.sin(a) + nz * off
      const l = Math.sqrt(x * x + y * y + z * z)
      const rr = baseR * radial
      const [px, py, zr] = pt((x / l) * rr, (y / l) * rr, (z / l) * rr)
      const depth = (zr / R + 1) / 2
      dots.push({
        x: px, y: py, z: zr,
        r: ((o.rBase ?? 1.1) + (o.rDepth ?? 1.7) * depth) * (1 - 0.25 * edge) * rs,
        white: 0.52 - 0.44 * depth + 0.18 * edge,
        a: 0.4 + 0.6 * depth
      })
    }
  }
  return finalizeFrame(dots, [], o.rMin)
}

// morph: dotted outline cycles circle → triangle → square → circle (shaping)
type Path = (f: number) => [number, number]

function smoothE(x: number): number { return x * x * (3 - 2 * x) }

function polyPath(verts: ReadonlyArray<readonly [number, number]>): Path {
  const V = verts.length
  const L: number[] = []
  let total = 0
  for (let i = 0; i < V; i++) {
    const a = verts[i], b = verts[(i + 1) % V]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    L.push(l); total += l
  }
  return (f) => {
    let target = f * total
    let i = 0
    while (target > L[i] && i < V - 1) { target -= L[i]; i++ }
    const a = verts[i], b = verts[(i + 1) % V]
    const ff = L[i] ? Math.min(1, target / L[i]) : 0
    return [a[0] + (b[0] - a[0]) * ff, a[1] + (b[1] - a[1]) * ff]
  }
}

const CIRCLE: Path = (f) => {
  const a = -Math.PI / 2 + f * 2 * Math.PI
  return [Math.cos(a) * 0.24, Math.sin(a) * 0.24]
}
const TRIANGLE = polyPath([[0.0, -0.26], [0.24, 0.16], [-0.24, 0.16]])
const SQUARE = polyPath([[0, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2], [-0.2, -0.2]])
const CYCLE: Path[] = [CIRCLE, TRIANGLE, SQUARE]

function morphN(d: number): number { return Math.max(6, Math.round(34 * d)) }

const HOLD = 1.4, MORPH = 0.9, SEG = HOLD + MORPH

export const frameMorph: ModeFrame = (size, t, o) => {
  const K = CYCLE.length
  const tc = t % (SEG * K)
  const k = Math.floor(tc / SEG)
  const local = tc - k * SEG
  const m = local > HOLD ? smoothE((local - HOLD) / MORPH) : 0
  const sprd = o.spread ?? 1
  const pA = CYCLE[k], pB = CYCLE[(k + 1) % K]
  const M = 160
  const pts: Array<[number, number]> = []
  for (let i = 0; i < M; i++) {
    const f = i / M
    const a = pA(f), b = pB(f)
    pts.push([(a[0] + (b[0] - a[0]) * m) * sprd, (a[1] + (b[1] - a[1]) * m) * sprd])
  }
  const L: number[] = []
  let total = 0
  for (let i = 0; i < M; i++) {
    const a = pts[i], b = pts[(i + 1) % M]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    L.push(l); total += l
  }
  const n = morphN(o.iconD ?? 1)
  const re = (o.rDot ?? 0.021) * 1.35 * sprd
  const pulse = 1 + 0.02 * Math.sin(local * 3.1)
  const dots: Dot[] = []
  const c2 = size / 2
  let seg = 0, acc = 0
  for (let k2 = 0; k2 < n; k2++) {
    const target = (k2 / n) * total
    while (acc + L[seg] < target && seg < M - 1) { acc += L[seg]; seg++ }
    const a = pts[seg], b = pts[(seg + 1) % M]
    const f = L[seg] ? Math.min(1, (target - acc) / L[seg]) : 0
    const x = (a[0] + (b[0] - a[0]) * f) * pulse
    const y = (a[1] + (b[1] - a[1]) * f) * pulse
    dots.push({
      x: c2 + x * size, y: c2 + y * size, z: 0,
      r: Math.max(0.35, re * size),
      white: 0.1
    })
  }
  return finalizeFrame(dots, [], o.rMin)
}
