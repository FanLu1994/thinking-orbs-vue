<template>
  <canvas
    ref="canvasEl"
    role="img"
    :aria-label="ariaLabel"
    :style="{ width: size + 'px', height: size + 'px', display: 'block', ...style }"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { resolvePreset } from './thinking-orb-engine'
import type { OrbState, OrbTheme, OrbSize } from './thinking-orb-engine'

const props = withDefaults(
  defineProps<{
    state?: OrbState
    size?: OrbSize
    theme?: OrbTheme
    speed?: number
    paused?: boolean
    ariaLabel?: string
    style?: Record<string, string>
  }>(),
  { state: 'working', size: 64, theme: 'auto', speed: 1, paused: false }
)

const LABELS: Record<string, string> = {
  working: 'Working…',
  searching: 'Searching…',
  solving: 'Solving…',
  listening: 'Listening…',
  connecting: 'Connecting…',
  weaving: 'Weaving…',
  composing: 'Composing…',
  breathing: 'Thinking…',
  shaping: 'Shaping…'
}

const canvasEl = ref<HTMLCanvasElement | null>(null)
const dark = ref(true)
const ariaLabel = computed(() => props.ariaLabel ?? LABELS[props.state] ?? '')

let raf = 0
let running = false
let io: IntersectionObserver | null = null
let mo: MutationObserver | null = null
let mq: MediaQueryList | null = null
let onMq: (() => void) | null = null
let onVis: (() => void) | null = null
let reduced = false

// ---------- theme ----------
function ancestorTheme(el: Element | null): boolean | null {
  let node: Element | null = el
  while (node) {
    const attr = node.getAttribute('data-theme')
    if (attr === 'dark') return true
    if (attr === 'light') return false
    if (node.classList.contains('dark')) return true
    if (node.classList.contains('light')) return false
    node = node.parentElement
  }
  return null
}
function systemDark(): boolean {
  return typeof matchMedia === 'undefined' || matchMedia('(prefers-color-scheme: dark)').matches
}
function resolveDark(): boolean {
  if (props.theme === 'dark') return true
  if (props.theme === 'light') return false
  return ancestorTheme(canvasEl.value) ?? systemDark()
}
function setupTheme() {
  if (props.theme !== 'auto') { dark.value = props.theme === 'dark'; return }
  dark.value = resolveDark()
  if (typeof matchMedia !== 'undefined') {
    mq = matchMedia('(prefers-color-scheme: dark)')
    onMq = () => { dark.value = resolveDark() }
    mq.addEventListener('change', onMq)
  }
  if (typeof MutationObserver !== 'undefined' && canvasEl.value) {
    mo = new MutationObserver(() => { dark.value = resolveDark() })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'], subtree: true })
  }
}

// ---------- draw ----------
function currentResolved() {
  return resolvePreset(props.state, props.size)
}
function drawFrame(tSec: number) {
  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const size = props.size
  const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1)
  canvas.width = Math.round(size * dpr)
  canvas.height = Math.round(size * dpr)
  const { draw, speed, opts } = currentResolved()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size, size)
  draw(ctx, size, tSec * (speed * props.speed), dark.value, opts)
}
function loop() {
  drawFrame(performance.now() / 1000)
  if (running) raf = requestAnimationFrame(loop)
}
function start() {
  if (running || props.paused) return
  running = true
  raf = requestAnimationFrame(loop)
}
function stop() {
  running = false
  cancelAnimationFrame(raf)
}

// ---------- lifecycle ----------
onMounted(() => {
  setupTheme()
  if (typeof matchMedia !== 'undefined') reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  drawFrame(0.6)
  if (reduced) return
  drawFrame(performance.now() / 1000)

  let visible = true
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && document.visibilityState !== 'hidden') start()
      else stop()
    })
    if (canvasEl.value) io.observe(canvasEl.value)
  }
  onVis = () => {
    if (document.visibilityState === 'hidden') stop()
    else if (visible) start()
  }
  document.addEventListener('visibilitychange', onVis)
  if (!io) start()
})

onBeforeUnmount(() => {
  stop()
  io?.disconnect()
  if (onVis) document.removeEventListener('visibilitychange', onVis)
  if (onMq && mq) mq.removeEventListener('change', onMq)
  mo?.disconnect()
})

watch(
  () => [props.state, props.size, props.speed, props.paused, props.theme],
  () => {
    stop()
    setupTheme()
    if (props.paused) {
      drawFrame(performance.now() / 1000)
      return
    }
    start()
  }
)
</script>
