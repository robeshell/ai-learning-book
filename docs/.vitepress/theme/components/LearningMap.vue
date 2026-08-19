<script setup lang="ts">
import { computed } from "vue";
import { withBase } from "vitepress";
import {
  articleHref,
  seasonLabel,
  seriesHref,
  seriesList,
  type Series,
} from "../../series";

const props = defineProps<{
  seriesId?: string;
}>();

const isSingleSeries = Boolean(props.seriesId);

const singleSeriesList = computed(() =>
  props.seriesId
    ? seriesList.filter((item) => item.id === props.seriesId)
    : []
);

const topicSeries = computed(() =>
  seriesList.filter((item) => item.season > 0)
);

const basicSeries = computed(() =>
  seriesList.filter((item) => item.season === 0)
);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
</script>

<template>
  <div class="learning-map">
    <!-- 1. 单专栏展示视图（专栏内页） -->
    <template v-if="isSingleSeries">
      <section
        v-for="series in singleSeriesList"
        :key="series.id"
        class="season-block"
      >
        <div class="chapters-wrapper">
          <div
            v-for="chapter in series.chapters"
            :key="chapter.id"
            class="chapter-card"
          >
            <div class="chapter-head">
              <h3 class="chapter-title">{{ chapter.title }}</h3>
            </div>

            <ul class="article-list">
              <li
                v-for="article in chapter.articles"
                :key="article.id"
                class="article-item"
              >
                <span class="article-index">{{ pad(article.order) }}</span>
                <a
                  :href="withBase(articleHref(series.id, article.id))"
                  class="article-link"
                >
                  {{ article.title }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </template>

    <!-- 2. 首页全景视图：拆分为【专题】与【基础知识】两大区块 -->
    <template v-else>
      <!-- 区块一：专题（第 1~5 季） -->
      <div class="map-section">
        <div class="map-group-header">
          <span class="group-badge">主线脉络</span>
          <h2 class="group-title">专题</h2>
          <p class="group-desc">
            底层结构、模型训练、工具协议、智能体系统与物理边界主线脉络。
          </p>
        </div>

        <div class="series-stack">
          <section
            v-for="series in topicSeries"
            :key="series.id"
            class="season-block"
          >
            <header class="season-header">
              <div class="season-meta">
                <span class="season-tag">第{{ seasonLabel(series.season) }}季</span>
                <span class="season-badge">{{ series.badge }}</span>
              </div>
              <h3 class="season-title">
                <a :href="withBase(seriesHref(series.id))">{{ series.title }}</a>
              </h3>
              <p class="season-subtitle">{{ series.subtitle }}</p>
            </header>

            <div class="chapters-wrapper">
              <div
                v-for="chapter in series.chapters"
                :key="chapter.id"
                class="chapter-card"
              >
                <div class="chapter-head">
                  <h4 class="chapter-title">{{ chapter.title }}</h4>
                </div>

                <ul class="article-list">
                  <li
                    v-for="article in chapter.articles"
                    :key="article.id"
                    class="article-item"
                  >
                    <span class="article-index">{{ pad(article.order) }}</span>
                    <a
                      :href="withBase(articleHref(series.id, article.id))"
                      class="article-link"
                    >
                      {{ article.title }}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- 分隔装饰 -->
      <div class="section-divider"></div>

      <!-- 区块二：基础知识（随时按需查阅） -->
      <div class="map-section basics-section">
        <div class="map-group-header">
          <span class="group-badge badge-basics">选读工具箱</span>
          <h2 class="group-title">基础知识</h2>
          <p class="group-desc">
            显存算力、高维向量、矩阵投影、梯度下降与缓存机制底层工具箱。
          </p>
        </div>

        <div class="series-stack">
          <section
            v-for="series in basicSeries"
            :key="series.id"
            class="season-block basics-block"
          >
            <div class="chapters-wrapper">
              <div
                v-for="chapter in series.chapters"
                :key="chapter.id"
                class="chapter-card"
              >
                <ul class="article-list basics-grid">
                  <li
                    v-for="article in chapter.articles"
                    :key="article.id"
                    class="article-item basics-item"
                  >
                    <span class="article-index">{{ pad(article.order) }}</span>
                    <div class="basics-info">
                      <a
                        :href="withBase(articleHref(series.id, article.id))"
                        class="article-link"
                      >
                        {{ article.title }}
                      </a>
                      <p class="basics-desc">{{ article.description }}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.learning-map {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.map-section {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

/* 分组大标题 */
.map-group-header {
  padding-bottom: 12px;
  border-bottom: 2px solid var(--border);
}

.group-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  color: var(--brand);
  padding: 2px 8px;
  background: var(--warm-sand);
  border-radius: 4px;
  margin-bottom: 8px;
  letter-spacing: 0.04em;
}

.group-badge.badge-basics {
  color: var(--olive);
  background: var(--warm-sand);
}

.group-title {
  margin: 0 0 6px;
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 500;
  color: var(--near-black);
  letter-spacing: 0.02em;
}

.group-desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--stone);
}

/* 分隔线 */
.section-divider {
  height: 1px;
  background: var(--border);
  margin: 12px 0;
}

/* 列表容器 */
.series-stack {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.season-block {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Season Header */
.season-header {
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.season-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.season-tag {
  font-family: var(--font-serif);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--brand);
  letter-spacing: 0.04em;
}

.season-badge {
  font-size: var(--text-label);
  font-weight: 500;
  color: var(--stone);
  padding: 1px 6px;
  background: var(--warm-sand);
  border-radius: 3px;
}

.season-title {
  margin: 0 0 6px;
  font-family: var(--font-serif);
  font-size: var(--text-h2);
  font-weight: 400;
  line-height: 1.3;
}

.season-title a {
  color: var(--near-black);
  text-decoration: none;
  transition: color 0.15s ease;
}

.season-title a:hover {
  color: var(--brand);
}

.season-subtitle {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--olive);
}

/* Chapters Grid / List */
.chapters-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.chapter-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chapter-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.chapter-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 400;
  color: var(--near-black);
  letter-spacing: 0.02em;
}

/* Articles */
.article-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.article-item {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background 0.15s ease;
}

.article-item:hover {
  background: var(--warm-sand);
}

.article-index {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  color: var(--stone);
  flex-shrink: 0;
  width: 22px;
}

.article-link {
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--near-black);
  text-decoration: none;
  transition: color 0.15s ease;
}

.article-item:hover .article-link {
  color: var(--brand);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* 基础知识网格增强 */
.basics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.basics-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--card-bg, #fcfbf9);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.basics-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.basics-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--stone);
}

@media (max-width: 640px) {
  .learning-map {
    gap: 36px;
  }
  .group-title {
    font-size: 22px;
  }
  .season-title {
    font-size: 20px;
  }
  .article-item {
    padding: 6px 4px;
  }
  .basics-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
