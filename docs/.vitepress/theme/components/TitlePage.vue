<script setup lang="ts">
import LearningMap from "./LearningMap.vue";
</script>

<template>
  <div class="title-page">
    <h1>看懂人工智能</h1>
    <p class="lede">
      按因果链写下的学习笔记。先把概念讲清楚；论文精读和术语表等有了存量再进导航。
    </p>
    <p class="colophon">五季 · 三十六篇 · 不是资讯站</p>
    <LearningMap />
  </div>
</template>

<style scoped>
.title-page {
  max-width: 760px;
  margin: 0 auto;
}

h1 {
  margin: 0 0 16px;
  font-size: var(--text-display);
  line-height: 1.15;
  color: var(--near-black);
  text-wrap: balance;
}

.lede {
  margin: 0 0 12px;
  max-width: 36em;
  font-size: 15px;
  line-height: 1.7;
  color: var(--olive);
}

.colophon {
  margin: 0 0 48px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border);
  font-size: var(--text-label);
  font-weight: 500;
  letter-spacing: 0.12em;
  color: var(--stone);
}
</style>
