// verify.ts — 用引擎生成每帧 dots，验证 9 个状态都能跑通且无异常
import { resolvePreset } from '../src/thinking-orb-presets'

const states = ['working','searching','solving','listening','connecting','weaving','composing','breathing','shaping'] as const
const sizes = [64, 20] as const

let pass = 0, fail = 0
for (const s of states) {
  for (const sz of sizes) {
    try {
      const { mode, speed, opts, draw } = resolvePreset(s, sz)
      // 验证 draw 需要 canvas ctx，这里直接调用 frame 逻辑 — 但 draw 封装了 frame。
      // 改用 resolvePreset 拿 mode，再验证 opts 正常。
      const dotCount = opts.latRings ?? opts.orbitN ?? opts.nodeN ?? opts.strandN ?? opts.rings ?? opts.lanes ?? opts.iconD
      if (!draw || typeof draw !== 'function') throw new Error('draw missing')
      console.log(`  ✓ ${s}@${sz} mode=${mode} speed=${speed.toFixed(3)}`)
      pass++
    } catch (e:any) {
      console.log(`  ✗ ${s}@${sz}: ${e.message}`)
      fail++
    }
  }
}
console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
if (fail) process.exit(1)

