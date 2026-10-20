<!-- App.vue — ThinkingOrb 组件使用示例 -->
<script setup lang="ts">
import { ref } from 'vue'
import ThinkingOrb from './ThinkingOrb.vue'
import type { OrbState } from './thinking-orb-engine'

// 遍历所有状态
const allStates: OrbState[] = [
  'working', 'searching', 'solving', 'listening', 'connecting',
  'weaving', 'composing', 'breathing', 'shaping'
]

const current = ref<OrbState>('searching')
const speed = ref(1)
const paused = ref(false)
const theme = ref<'auto' | 'dark' | 'light'>('auto')
</script>

<template>
  <div style="padding: 32px; font-family: sans-serif;">
    <h3>单实例，动态切换状态</h3>
    <ThinkingOrb
      :state="current"
      :size="64"
      :theme="theme"
      :speed="speed"
      :paused="paused"
      style="margin-bottom: 12px"
    />
    <select v-model="current">
      <option v-for="s in allStates" :key="s" :value="s">{{ s }}</option>
    </select>

    <h3 style="margin-top: 32px">全部 9 种状态 × 2 尺寸</h3>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 520px">
      <div v-for="s in allStates" :key="s" style="display:flex; gap:10px; align-items:center">
        <ThinkingOrb :state="s" :size="64" :theme="theme" />
        <ThinkingOrb :state="s" :size="20" :theme="theme" />
        <span style="font-size:12px; color:#888">{{ s }}</span>
      </div>
    </div>

    <h3 style="margin-top: 32px">常用场景：聊天头像旁的搜索状态</h3>
    <ThinkingOrb state="searching" :size="20" :theme="theme" />
  </div>
</template>
