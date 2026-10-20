// =========================================================================
// thinking-orb-engine.ts — 从 @thinking-orbs 移植的纯逻辑层
// 原项目 MIT © Jakub Antalik。仅做 TS/ESM 化，几何与调参保持一致。
// =========================================================================

// ---------- types ----------
export type OrbState =
  | 'working' | 'searching' | 'solving' | 'listening' | 'connecting'
  | 'weaving' | 'composing' | 'breathing' | 'shaping'
export type OrbSize = 64 | 20
export type OrbTheme = 'auto' | 'dark' | 'light'
export type ModeOpts = Record<string, number | undefined>

export interface Dot {
  x: number; y: number; z: number; r: number
  /** 0 = 最深墨色（近点），1 = 最浅 */
  white: number
  a?: number
}
export interface Line {
  x1: number; y1: number; x2: number; y2: number
  white: number; a?: number; w: number
}
export interface OrbFrame { dots: Dot[]; lines: Line[] }
export type ModeFrame = (size: number, t: number, opts: ModeOpts) => OrbFrame
export type ModeDraw = (
  ctx: CanvasRenderingContext2D, size: number, t: number,
  dark: boolean, opts: ModeOpts
) => void

// ---------- core primitives ----------
export function lerp(a: number, b: number, f: number): number { return a + (b - a) * f }
export function frac(x: number): number { return x - Math.floor(x) }
export function hashD(a: number, b: number): number {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return h - Math.floor(h)
}
export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x); const yi = Math.floor(y)
  let fx = x - xi; let fy = y - yi
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
  const a = hashD(xi, yi); const b = hashD(xi + 1, yi)
  const c = hashD(xi, yi + 1); const d = hashD(xi + 1, yi + 1)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}
export function fibDir(i: number, n: number): [number, number, number] {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const y = 1 - (2 * (i + 0.5)) / n
  const rad = Math.sqrt(1 - y * y)
  const a = i * golden
  return [rad * Math.cos(a), y, rad * Math.sin(a)]
}
export function angleDelta(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b))
}
export function makeProj(yaw: number, tilt: number, cx: number, cy: number, scale: number) {
  const st = Math.sin(tilt), ct = Math.cos(tilt)
  const sy = Math.sin(yaw), cyw = Math.cos(yaw)
  return (x: number, y: number, z: number): [number, number, number] => {
    const x1 = x * cyw + z * sy
    const z1 = -x * sy + z * cyw
    const y1 = y * ct - z1 * st
    const z2 = y * st + z1 * ct
    return [cx + x1 * scale, cy - y1 * scale, z2]
  }
}
export function radiusScale(size: number, pow: number): number {
  return (size / 300) ** pow
}

// ---------- frame finalize + paint ----------
export function finalizeFrame(dots: Dot[], lines: Line[], rMin = 0.3): OrbFrame {
  const visible: Dot[] = []
  for (const d of dots) {
    if ((d.a ?? 1) < 0.02) continue
    d.r = Math.max(rMin, d.r)
    visible.push(d)
  }
  visible.sort((a, b) => a.z - b.z)
  return { dots: visible, lines: lines.filter((l) => (l.a ?? 1) >= 0.02) }
}

export function paintFrame(ctx: CanvasRenderingContext2D, frame: OrbFrame, dark: boolean): void {
  for (const l of frame.lines) {
    const alpha = l.a ?? 1
    const w = Math.min(1, Math.max(0, l.white))
    const g = Math.round((dark ? 1 - w : w) * 255)
    ctx.strokeStyle = `rgba(${g},${g},${g},${alpha})`
    ctx.lineWidth = l.w
    ctx.beginPath()
    ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke()
  }
  for (const d of frame.dots) {
    const alpha = d.a ?? 1
    const w = Math.min(1, Math.max(0, d.white))
    const g = Math.round((dark ? 1 - w : w) * 255)
    ctx.fillStyle = `rgba(${g},${g},${g},${alpha})`
    ctx.beginPath()
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
    ctx.fill()
  }
}
