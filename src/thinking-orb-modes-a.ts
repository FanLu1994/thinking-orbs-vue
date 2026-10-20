// modes-a.ts — orbits(working) + globe(searching) + rubik(solving)
import type { Dot, ModeFrame } from './thinking-orb-core'
import { angleDelta, finalizeFrame, hashD, makeProj, radiusScale } from './thinking-orb-core'

// orbits: particles on tilted orbits (working)
export const frameOrbits: ModeFrame = (size, t, o) => {
  const cx = size / 2, cy = size / 2
  const R = (size / 2) * 0.82
  const pt = makeProj(t * 0.12, 0.3, cx, cy, 1)
  const rs = radiusScale(size, o.rsPow ?? 0.6)
  const dots: Dot[] = []
  const orbitN = o.orbitN ?? 12, ghostN = o.ghostN ?? 40, particles = o.particles ?? 3
  for (let orb = 0; orb < orbitN; orb++) {
    const h1 = hashD(orb, 1.7), h2 = hashD(orb, 5.2), h3 = hashD(orb, 8.9)
    const ro = R * (0.45 + 0.52 * h1)
    const th = h1 * 2 * Math.PI, phi = Math.acos(2 * h2 - 1)
    const nx = Math.sin(phi) * Math.cos(th), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(th)
    let ux = -ny, uy = nx
    const uz = 0
    const ul = Math.max(1e-6, Math.sqrt(ux * ux + uy * uy))
    ux /= ul; uy /= ul
    const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux
    const speed = (0.25 + 0.55 * h3) * (h3 > 0.5 ? 1 : -1)
    for (let k = 0; k < ghostN; k++) {
      const a = (k / ghostN) * 2 * Math.PI
      const [px, py, z] = pt(
        (ux * Math.cos(a) + vx * Math.sin(a)) * ro,
        (uy * Math.cos(a) + vy * Math.sin(a)) * ro,
        (uz * Math.cos(a) + vz * Math.sin(a)) * ro)
      const depth = (z / ro + 1) / 2
      dots.push({ x: px, y: py, z, r: (o.ghostR ?? 0.9) * rs, white: 0.72, a: (o.ghostA ?? 0.5) * (0.4 + 0.6 * depth) })
    }
    for (let m = 0; m < particles; m++) {
      const a = t * speed + (m / particles) * 2 * Math.PI + h2 * 6
      const [px, py, z] = pt(
        (ux * Math.cos(a) + vx * Math.sin(a)) * ro,
        (uy * Math.cos(a) + vy * Math.sin(a)) * ro,
        (uz * Math.cos(a) + vz * Math.sin(a)) * ro)
      const depth = (z / ro + 1) / 2
      dots.push({ x: px, y: py, z, r: ((o.partR ?? 1.2) + (o.partRDepth ?? 1.6) * depth) * rs, white: 0.3 - 0.22 * depth })
    }
  }
  return finalizeFrame(dots, [], o.rMin)
}

// globe: scan meridian sweeps a dotted globe (searching)
export const frameGlobe: ModeFrame = (size, t, o) => {
  const spin = 0.5
  const cx = size / 2, cy = size / 2, radius = (size / 2) * 0.82
  const tilt = 0.4 + 0.06 * Math.sin(t * 0.35)
  const pt = makeProj(t * spin, tilt, cx, cy, radius)
  const scan = t * (spin + (1.7 - spin) * (o.scanMul ?? 1))
  const rs = radiusScale(size, o.rsPow ?? 0.6)
  const dimBase = o.dimBase ?? 1
  const dots: Dot[] = []
  const latRings = o.latRings ?? 17, lonDensity = o.lonDensity ?? 44
  for (let li = 0; li <= latRings; li++) {
    const lat = -Math.PI / 2 + (li / latRings) * Math.PI
    const cosLat = Math.cos(lat), sinLat = Math.sin(lat)
    const lonCount = Math.max(1, Math.round(Math.abs(cosLat) * lonDensity))
    for (let lj = 0; lj < lonCount; lj++) {
      const lon = (lj / lonCount) * 2 * Math.PI
      const [px, py, z] = pt(cosLat * Math.cos(lon), sinLat, cosLat * Math.sin(lon))
      const depth = (z + 1) / 2
      const d = angleDelta(lon + t * spin, scan)
      const boost = Math.exp(-(d * d) / 0.18) * Math.max(0, z)
      dots.push({
        x: px, y: py, z,
        r: ((o.rBase ?? 0.6) + (o.rDepth ?? 1.7) * depth + (o.rBoost ?? 1) * boost) * rs,
        white: (o.inkFar ?? 0.62) - (o.inkSpan ?? 0.54) * depth,
        a: dimBase + (1 - dimBase) * Math.min(1, boost)
      })
    }
  }
  return finalizeFrame(dots, [], o.rMin)
}
