<template>
  <div v-if="visible && current" class="article-header">
    <p class="running">
      第{{ seasonLabel(current.series.season) }}季 · {{ current.series.title }}
    </p>
    <p class="place">
      {{ current.chapter.title }} · 第 {{ current.article.order }} 篇 ·
      {{ statusLabel[current.article.articleStatus] }}
    </p>
    <p v-if="prerequisiteLinks.length" class="prereq">
      先读
      <a
        v-for="item in prerequisiteLinks"
        :key="item.article.id"
        :href="withBase(articleHref(item.series.id, item.article.id))"
      >
        {{ item.article.title }}
      </a>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useData, withBase } from "vitepress";
import {
  articleHref,
  findArticle,
  seasonLabel,
  type ArticleStatus,
} from "../../series";

const { frontmatter, page } = useData();

const current = computed(() => {
  const relative = page.value.relativePath.replaceAll("\\", "/");
  const match = relative.match(/^series\/([^/]+)\/([^/]+)\.md$/);
  if (!match || match[2] === "index") {
    return undefined;
  }
  const found = findArticle(match[2]);
  if (!found || found.series.id !== match[1]) {
    return undefined;
  }
  return found;
});

const visible = computed(
  () => frontmatter.value.type === "concept" && current.value != null,
);

const statusLabel: Record<ArticleStatus, string> = {
  stub: "占位",
  outline: "提纲",
  draft: "草稿",
  published: "已发布",
};

const prerequisiteLinks = computed(() => {
  const ref = current.value;
  if (!ref) {
    return [];
  }
  return ref.article.prerequisites
    .map((id) => findArticle(id))
    .filter((item) => item != null);
});
</script>

<style scoped>
.article-header {
  margin: 0 0 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.running,
.place,
.prereq {
  margin: 0 0 4px;
  font-size: var(--text-caption);
  line-height: 1.5;
  color: var(--olive);
}

.running {
  font-family: var(--font-serif);
  font-weight: 400;
  font-synthesis: none;
  color: var(--brand);
  letter-spacing: 0;
  -webkit-font-smoothing: auto;
}

.prereq a {
  color: var(--brand);
  margin-left: 10px;
  text-decoration: none;
}

.prereq a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
