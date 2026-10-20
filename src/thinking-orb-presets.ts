// thinking-orb-presets.ts — 9 状态 × 2 尺寸的调参 + resolvePreset
// 原项目 MIT © Jakub Antalik
import type { ModeDraw, ModeOpts, OrbSize, OrbState } from './thinking-orb-core'
import { paintFrame } from './thinking-orb-core'
import { frameOrbits, frameGlobe } from './thinking-orb-modes-a'
import { frameRubik, frameWave } from './thinking-orb-modes-b'
import { frameWeb, frameBraid } from './thinking-orb-modes-c'
import { frameRibbon, frameMorph } from './thinking-orb-modes-d'

type ModeKey = 'orbits' | 'globe' | 'rubik' | 'wave' | 'web' | 'braid' | 'ribbon' | 'ring' | 'morph'

const MODE_FRAMES: Record<ModeKey, (size: number, t: number, opts: ModeOpts) => any> = {
  orbits: frameOrbits,
  globe: frameGlobe,
  rubik: frameRubik,
  wave: frameWave,
  web: frameWeb,
  braid: frameBraid,
  ribbon: frameRibbon,
  ring: frameRibbon, // faceOn 标志切换
  morph: frameMorph
}

const STATE_TO_MODE: Record<OrbState, ModeKey> = {
  working: 'orbits',
  searching: 'globe',
  solving: 'rubik',
  listening: 'wave',
  connecting: 'web',
  weaving: 'braid',
  composing: 'ribbon',
  breathing: 'ring',
  shaping: 'morph'
}

interface Preset { speed: number; count: number; size: number; extra?: ModeOpts }

const PRESETS: Record<ModeKey, Record<OrbSize, Preset>> = {
  orbits: {
    64: { speed: 1.885, count: 1, size: 1 },
    20: { speed: 3.9, count: 0.238, size: 2.4 }
  },
  globe: {
    64: { speed: 2.015, count: 0.42, size: 1.15, extra: { scanMul: 4.08, dimBase: 0.45 } },
    20: { speed: 2.665, count: 0.105, size: 1.75, extra: { scanMul: 4.335, dimBase: 0.45 } }
  },
  rubik: {
    64: { speed: 1.82, count: 0.35, size: 1.05 },
    20: { speed: 1.95, count: 0.088, size: 1.9 }
  },
  wave: {
    64: { speed: 4.388, count: 0.341, size: 1 },
    20: { speed: 3.998, count: 0.105, size: 1.6 }
  },
  web: {
    64: { speed: 3.315, count: 1.35, size: 0.95 },
    20: { speed: 6.63, count: 0.25, size: 1.52 }
  },
  braid: {
    64: { speed: 1.625, count: 0.5, size: 1 },
    20: { speed: 2.75, count: 0.1125, size: 1.36 }
  },
  ribbon: {
    64: { speed: 2.34, count: 0.25, size: 0.85, extra: { spin: 0, bandMul: 3.9, wobMul: 1 } },
    20: { speed: 3.12, count: 0.051, size: 1.073, extra: { spin: 0, bandMul: 4.94, wobMul: 1 } }
  },
  ring: {
    64: { speed: 3.24, count: 0.25, size: 0.956, extra: { spin: 0, bandMul: 3.627, wobMul: 0.368 } },
    20: { speed: 3.78, count: 0.028, size: 1.622, extra: { spin: 0, bandMul: 3.968, wobMul: 0.565 } }
  },
  morph: {
    64: { speed: 2.405, count: 0.702, size: 0.395, extra: { spread: 1.45 } },
    20: { speed: 2.08, count: 0.53, size: 1.011, extra: { spread: 1.45 } }
  }
}

// 密度缩放
const COUNT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['latRings', 'lonDensity'],
  ['rings', 'lonDensity'],
  ['lanes', 'segs']
]
const COUNT_KEYS = ['orbitN', 'ghostN', 'nodeN', 'strandN', 'signals'] as const
const ICON_DENSITY_KEYS = ['iconD'] as const
const RADIUS_KEYS = ['rBase', 'rDepth', 'rActive', 'rDot', 'ghostR', 'partR', 'partRDepth', 'nodeR', 'nodeRDepth'] as const

function scaleCounts(opts: ModeOpts, scale: number): ModeOpts {
  const out: ModeOpts = { ...opts }
  const done = new Set<string>()
  const rt = Math.sqrt(scale)
  for (const [a, b] of COUNT_PAIRS) {
    const va = out[a], vb = out[b]
    if (va != null && vb != null && !done.has(a) && !done.has(b)) {
      out[a] = Math.max(2, Math.round(va * rt))
      out[b] = Math.max(2, Math.round(vb * rt))
      done.add(a); done.add(b)
    }
  }
  for (const k of COUNT_KEYS) {
    const v = out[k]
    if (v != null && v !== 0 && !done.has(k)) out[k] = Math.max(1, Math.round(v * scale))
  }
  for (const k of ICON_DENSITY_KEYS) {
    const v = out[k]
    if (v != null) out[k] = Math.max(0.02, v * scale)
  }
  return out
}

function scaleRadii(opts: ModeOpts, scale: number): ModeOpts {
  const out: ModeOpts = { ...opts }
  for (const k of RADIUS_KEYS) {
    const v = out[k]
    if (v != null) out[k] = v * scale
  }
  out.rSizeMul = (out.rSizeMul ?? 1) * scale
  return out
}

const BASE_PROFILES: Record<string, ModeOpts> = {
  globe: {
    latRings: 17, lonDensity: 44, rBase: 0.6, rDepth: 1.7, rBoost: 1.0,
    inkFar: 0.62, inkSpan: 0.54, rsPow: 0.6, rMin: 0.3
  },
  orbits: {
    orbitN: 12, ghostN: 40, ghostR: 0.9, ghostA: 0.5, particles: 3,
    partR: 1.2, partRDepth: 1.6, rsPow: 0.6, rMin: 0.3
  },
  rubik: {
    latRings: 15, lonDensity: 40, moveCount: 14, rBase: 0.6, rDepth: 1.7,
    rActive: 0.3, inkFar: 0.62, inkSpan: 0.54, rsPow: 0.6, rMin: 0.3
  },
  wave: { rings: 15, lonDensity: 40, rBase: 0.6, rDepth: 1.7, rsPow: 0.6, rMin: 0.3 },
  web: {
    nodeN: 30, thr: 0.72, signals: 5, nodeR: 1.4, nodeRDepth: 1.8,
    lineW: 0.8, rsPow: 0.6, rMin: 0.3
  },
  braid: { strandN: 52, turns: 3.0, ghostN: 150, rBase: 1.2, rDepth: 1.8, rsPow: 0.6, rMin: 0.3 },
  ribbon: { lanes: 5, segs: 88, ghostN: 150, rBase: 1.1, rDepth: 1.7, rsPow: 0.6, rMin: 0.3 },
  ring: { lanes: 5, segs: 88, ghostN: 0, faceOn: 1, rBase: 1.1, rDepth: 1.7, rsPow: 0.6, rMin: 0.3 },
  morph: { rDot: 0.021, iconD: 1, rMin: 0.25 }
}

export interface Resolved {
  mode: ModeKey
  speed: number
  opts: ModeOpts
  draw: ModeDraw
}

const cache = new Map<string, Resolved>()

export function resolvePreset(state: OrbState, size: OrbSize): Resolved {
  const key = `${state}-${size}`
  const hit = cache.get(key)
  if (hit) return hit
  const mode = STATE_TO_MODE[state]
  const preset = PRESETS[mode][size]
  let opts: ModeOpts = { ...BASE_PROFILES[mode] }
  if (preset.count !== 1) opts = scaleCounts(opts, preset.count)
  if (preset.size !== 1) opts = scaleRadii(opts, preset.size)
  if (preset.extra) opts = { ...opts, ...preset.extra }
  const frame = MODE_FRAMES[mode]
  const resolved: Resolved = {
    mode,
    speed: preset.speed,
    opts,
    draw: ((ctx, s, t, dark, o) => paintFrame(ctx, frame(s, t, o), dark)) as ModeDraw
  }
  cache.set(key, resolved)
  return resolved
}
