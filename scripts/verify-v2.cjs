// 验证 orbs-v2.js：每个状态在 64/128 尺寸、多个时间点下无 NaN、无越界，并统计点数/半径
require('../demo/orbs-v2.js');
const O = globalThis.OrbsV2;
let fail = 0;
for (const name of Object.keys(O.modes)) {
  for (const S of [64, 128]) {
    let minN = 1e9, maxN = 0, minR = 1e9, maxR = 0, out = 0, nan = 0;
    for (let i = 0; i < 400; i++) {
      const t = i * 0.037 + 0.01;
      const dots = O.modes[name](S, t);
      minN = Math.min(minN, dots.length); maxN = Math.max(maxN, dots.length);
      for (const d of dots) {
        if (![d.x, d.y, d.z, d.r, d.w, d.a].every(Number.isFinite)) nan++;
        if (d.a >= 0.02 && (d.x - d.r < -1 || d.x + d.r > S + 1 || d.y - d.r < -1 || d.y + d.r > S + 1)) out++;
        minR = Math.min(minR, d.r); maxR = Math.max(maxR, d.r);
      }
    }
    const ok = nan === 0 && out === 0 && minN > 0;
    if (!ok) fail++;
    console.log(`${ok ? '✓' : '✗'} ${name}@${S} 点数[${minN},${maxN}] 半径[${minR.toFixed(2)},${maxR.toFixed(2)}] 越界=${out} NaN=${nan}`);
  }
}
// mock ctx 跑一遍 paint
const ctx = { beginPath() {}, arc() {}, fill() {}, set fillStyle(v) {} };
O.paint(ctx, O.modes.working(64, 1), true);
console.log(fail ? `\n失败 ${fail} 项` : '\n全部通过');
process.exit(fail ? 1 : 0);

