# thinking-orbs-vue

点阵球体状态动画（dotted thought-orb loading indicators）的 Vue 3 复刻与再设计。

基于 [Jakubantalik/thinking-orbs](https://github.com/Jakubantalik/thinking-orbs)（MIT © Jakub Antalik），在其纯 2D canvas 点阵球的基础上，复刻了原版 9 种动画状态，并新设计了 5 种更高动感、非对称的有机动画。

纯 2D canvas、黑白墨色、细点 + 3D 纵深 + 拖尾 + 错峰缓动，无 WebGL、无滤镜，Chrome / Safari / Firefox 表现一致。

## 参考项目

- 原版：[Jakubantalik/thinking-orbs](https://github.com/Jakubantalik/thinking-orbs) — MIT © Jakub Antalik
- 复刻自其点阵球几何：3D 投影、深度明暗、z-sort、Fibonacci 球面点阵
- 协议沿用 MIT，见 [LICENSE](./LICENSE)

## 目录

```
thinking-orbs-vue/
├─ src/          Vue 组件 + 原版 9 态引擎
│  ├─ ThinkingOrb.vue         Vue 3 组件（SFC）
│  ├─ App.vue                 用法示例
│  └─ thinking-orb-*.ts       原版 9 态几何引擎（core / modes / presets）
├─ demo/        预览
│  ├─ demo.html               双击即可打开
│  ├─ orbs-v2.js              新设计的 5 个状态
│  └─ dist/thinking-orbs.js   原版引擎 bundle
├─ scripts/      校验脚本（node scripts/verify-v2.cjs）
└─ LICENSE / README.md
```

## 实现内容

### 一、原版 9 种状态（Vue 复刻，`src/`）

`ThinkingOrb.vue` 是 Vue 3 组件，通过 `state` prop 切换动画，复刻了原版的 9 个状态：

| state | 动画 |
|---|---|
| `working` | 粒子在倾斜轨道上运动 |
| `searching` | 扫描子午线扫过点阵球 |
| `solving` | 色带四分之一转乱序再复原 |
| `listening` | 波形滚过纬度环 |
| `connecting` | 星座自动连线，数据包沿边运行 |
| `weaving` | 三股螺旋缠绕球面 |
| `composing` | 起伏的多股绶带 |
| `breathing` | 正面环缓慢形变 |
| `shaping` | 点阵轮廓在圆形→三角→方形间变形 |

组件保留原版特性：

- 两个调参尺寸：`64`（头像级）和 `20`（行内级）
- 主题：`auto` 自动跟随祖先 `data-theme` / `.dark` / 系统主题实时翻转墨色；`dark` / `light` 可固定
- `speed` 速度倍率、`paused` 暂停
- `prefers-reduced-motion` 时降级为静态帧
- IntersectionObserver 离屏暂停 + 页面隐藏暂停
- devicePixelRatio 封顶 2

```vue
<script setup>
import ThinkingOrb from './ThinkingOrb.vue'
</script>

<template>
  <ThinkingOrb state="searching" :size="64" :theme="'auto'" />
</template>
```

### 二、新设计的 5 种状态（`demo/orbs-v2.js`）

针对原版观感偏机械、动感不足，重新设计了同名的 5 个状态，强调动感、非对称、纵深感与"乱中有序"：

| state | 设计 |
|---|---|
| `working` | 环面纽结流：粒子沿 (2,3) 纽结奔流，各自速度不同互相超车，带拖尾 |
| `searching` | 探照巡航：光束在球面巡航，移动→停驻→再出发，被照处只变亮不变形，无探针 |
| `solving` | 混沌→秩序：散乱粒子按波次归位成球 → 螺旋重组成立方点阵 → 自上而下溃散，循环 |
| `listening` | 声场水面：中心随语音包络起伏，涟漪向外扩散 |
| `connecting` | 神经突触：点线弧自己长出，抵达节点时亮起一次脉冲 |

各状态均支持 64px 与 128px 渲染，校验无越界、无数值错误（见 `scripts/verify-v2.cjs`）。

## 运行与校验

```bash
# 校验新 5 态 + 原版引擎（node 环境）
node scripts/verify-v2.cjs

# 预览（浏览器）
# 直接打开 demo/demo.html，页面同时展示新 5 态与原版 9 态
```

## 协议

本仓库沿用 [MIT](./LICENSE)，原版动画逻辑遵循原项目 MIT © Jakub Antalik，新增动画为本仓库自创。
