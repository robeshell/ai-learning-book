<script setup lang="ts">
import { withBase } from "vitepress";
import {
  articleHref,
  seriesHref,
  seriesList,
  seriesProgress,
  type ArticleStatus,
  type Series,
} from "../../series";

const statusLabel: Record<ArticleStatus, string> = {
  stub: "占位",
  outline: "提纲",
  draft: "草稿",
  published: "已发布",
};

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
  <div class="map">
    <section v-for="series in visibleSeries" :key="series.id" class="season">
      <header v-if="!isSingleSeries" class="season-head">
        <p class="index">{{ pad(series.season) }}</p>
        <div>
          <p class="badge">
            {{ series.badge }} · {{ seriesProgress(series).ready }}/{{
              seriesProgress(series).total
            }}
          </p>
          <h2>
            <a :href="withBase(seriesHref(series.id))">{{ series.title }}</a>
          </h2>
          <p class="sub">{{ series.subtitle }}</p>
        </div>
      </header>

      <div v-for="chapter in series.chapters" :key="chapter.id" class="chapter">
        <h3>{{ chapter.title }}</h3>
        <ol>
          <li v-for="article in chapter.articles" :key="article.id">
            <span class="num">{{ pad(article.order) }}</span>
            <a :href="withBase(articleHref(series.id, article.id))">{{
              article.title
            }}</a>
            <span class="mark" :data-status="article.articleStatus">
              {{ statusLabel[article.articleStatus] }}
            </span>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>

<style scoped>
.map {
  display: flex;
  flex-direction: column;
  gap: 56px;
}

.season-head {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.index {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 400;
  font-synthesis: none;
  line-height: 1;
  color: var(--brand);
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: auto;
}

.badge {
  margin: 0;
  font-size: var(--text-label);
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--stone);
}

.season-head h2 {
  margin: 4px 0 6px;
  font-family: var(--font-serif);
  font-size: var(--text-h2);
  font-weight: 400;
  font-synthesis: none;
  line-height: 1.25;
  -webkit-font-smoothing: auto;
}

.season-head h2 a {
  color: var(--near-black);
  text-decoration: none;
}

.season-head h2 a:hover {
  color: var(--brand);
}

.sub {
  margin: 0;
  color: var(--olive);
  line-height: 1.55;
}

.chapter {
  margin-top: 24px;
}

.chapter h3 {
  margin: 0 0 10px;
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 400;
  font-synthesis: none;
  color: var(--near-black);
  -webkit-font-smoothing: auto;
}

ol {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-soft);
}

.num {
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  color: var(--stone);
}

li a {
  color: var(--near-black);
  text-decoration: none;
}

li a:hover {
  color: var(--brand);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.mark {
  font-size: var(--text-label);
  color: var(--stone);
}

.mark[data-status="outline"],
.mark[data-status="draft"],
.mark[data-status="published"] {
  color: var(--brand);
}

@media (max-width: 640px) {
  .season-head {
    grid-template-columns: 40px minmax(0, 1fr);
  }
}
</style>
