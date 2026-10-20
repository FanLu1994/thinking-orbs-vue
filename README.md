# thinking-orbs-vue

Vue 3 复刻的 [thinking-orbs](https://github.com/Jakubantalik/thinking-orbs)（MIT © Jakub Antalik）——一组纯黑白墨色、由大量细点驱动的"思考状态"点阵动画。

原项目是 React 组件，本仓库用 Vue 3 + TypeScript 复刻，并在保留原有视觉语言的前提下，重新设计了 working / searching / solving / listening / connecting 五个状态，追求"乱中有序、点小、动感、有纵深"。

## 参考项目

- 原仓库：[Jakubantalik/thinking-orbs](https://github.com/Jakubantalik/thinking-orbs)（MIT）
- 本仓库复刻其 9 个状态 × 2 种尺寸（64px / 128px）的动画逻辑与参数，代码为从零手写的 Vue 3 版本，不是简单翻译。
- 协议：MIT，见 [LICENSE](LICENSE)。

## 目录结构

```
thinking-orbs-vue/
├─ src/                 Vue 组件 + 原版 9 态引擎（TypeScript）
│  ├─ ThinkingOrb.vue   组件：主题解析、离屏暂停、降级
│  ├─ App.vue           用法示例
│  └─ thinking-orb-*.ts 核心原语 + 各状态 frame + 预设调参
├─ demo/                浏览器预览
│  ├─ demo.html         双击打开即可预览全部状态
│  ├─ orbs-v2.js        重新设计的 5 个状态
│  └─ dist/thinking-orbs.js  原版 9 态引擎打包产物
└─ scripts/             校验脚本
```

## 核心组件用法

```vue
<template>
  <ThinkingOrb state="working" :size="128" />
</template>

<script setup lang="ts">
import ThinkingOrb from './ThinkingOrb.vue'
</script>
```

props：

| prop | 说明 |
|------|------|
| `state` | `'working' \| 'searching' \| 'solving' \| 'listening' \| 'connecting'`（新设计）或原版 9 态名称 |
| `size` | 画布边长，默认 128 |
| `theme` | 黑白墨色基调，可通过主题三层解析自定义 |

组件内置 `IntersectionObserver` 离屏暂停、`visibilitychange` 页面隐藏暂停、`prefers-reduced-motion` 降级。

## 重新设计的 5 个状态

原版形态为几何拟合，本仓库对这 5 个状态做了全新设计，点更细、密度更高、节奏更有机：

- **working** — 环面纽结流：粒子沿 (2,3) 纽结奔流，各自速度不同互相超车，带拖尾
- **searching** — 探照巡航：一道光束在球面巡航，移动 → 停驻 → 再出发，照到处安静亮起
- **solving** — 混沌到秩序：波次归位成球 → 螺旋重组为立方 → 自上而下溃散，循环
- **listening** — 声场水面：中心随"语音包络"起伏，涟漪向外扩散
- **connecting** — 神经突触：点线弧自己长出，到节点时脉冲

## 预览

直接打开 `demo/demo.html` 即可（本地无需构建）。需要构建原版引擎打包产物时：

```bash
npx esbuild thinking-orb-presets.ts --bundle --format=iife \
  --global-name=ThinkingOrbs --outfile=dist/thinking-orbs.js
```

校验重新设计的 5 个状态（检查越界 / NaN / 半径范围）：

```bash
node scripts/verify-v2.cjs
```

## License

MIT。复刻内容保留原项目版权声明；商用前请确认与 [thinking-orbs](https://github.com/Jakubantalik/thinking-orbs) 的许可合规性。
