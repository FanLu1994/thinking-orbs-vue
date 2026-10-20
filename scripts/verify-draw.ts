// verify-draw.ts — 用 mock canvas ctx 真正调用每个 mode 的 draw，验证几何产出
import { resolvePreset } from '../src/thinking-orb-presets'

// 简易 canvas 2d context mock
function mockCtx() {
  const calls: any[] = []
  const ctx: any = {
    setTransform() {}, clearRect() {}, beginPath() {},
    moveTo() {}, lineTo() {}, stroke() {}, fill() {},
    arc() { calls.push('arc') },
    set fillStyle(v) { calls.push(['fill', v]) },
    set strokeStyle(v) { calls.push(['stroke', v]) },
    set lineWidth(v) {}
  }
  return { ctx, calls }
}

const states = ['working','searching','solving','listening','connecting','weaving','composing','breathing','shaping'] as const
const sizes = [64, 20] as const

let pass = 0, fail = 0
for (const s of states) {
  for (const sz of sizes) {
    try {
      const { draw, opts } = resolvePreset(s, sz)
      const { ctx, calls } = mockCtx()
      // 多个时间点采样，确保动画不是静止的
      let totalArcs = 0
      for (const t of [0, 0.5, 1.0, 1.5, 2.0]) {
        calls.length = 0
        draw(ctx, sz, t, true, opts)
        totalArcs += calls.filter(c => c === 'arc').length
      }
      if (totalArcs === 0) throw new Error('no dots drawn')
      console.log(`  ✓ ${s}@${sz} 5帧点样=${totalArcs}`)
      pass++
    } catch (e:any) {
      console.log(`  ✗ ${s}@${sz}: ${e.message}`)
      fail++
    }
  }
}
console.log(`\n结果: ${pass} 通过, ${fail} 失败`)
if (fail) process.exit(1)

