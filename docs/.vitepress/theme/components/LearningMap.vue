<script setup lang="ts">
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

const visibleSeries: Series[] = props.seriesId
  ? seriesList.filter((item) => item.id === props.seriesId)
  : seriesList;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
</script>

<template>
  <div class="learning-map">
    <section
      v-for="series in visibleSeries"
      :key="series.id"
      class="season-block"
    >
      <!-- Season Header (Home View) -->
      <header v-if="!isSingleSeries" class="season-header">
        <div class="season-meta">
          <span class="season-tag">第{{ seasonLabel(series.season) }}季</span>
          <span class="season-badge">{{ series.badge }}</span>
        </div>
        <h2 class="season-title">
          <a :href="withBase(seriesHref(series.id))">{{ series.title }}</a>
        </h2>
        <p class="season-subtitle">{{ series.subtitle }}</p>
      </header>

      <!-- Chapters List -->
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
  </div>
</template>

<style scoped>
.learning-map {
  display: flex;
  flex-direction: column;
  gap: 56px;
}

.season-block {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Season Header */
.season-header {
  padding-bottom: 16px;
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
  gap: 28px;
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
  font-size: 18px;
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

@media (max-width: 640px) {
  .learning-map {
    gap: 44px;
  }
  .season-title {
    font-size: 20px;
  }
  .article-item {
    padding: 6px 4px;
  }
}
</style>
