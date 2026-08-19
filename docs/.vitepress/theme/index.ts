import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import ArticleHeader from "./components/ArticleHeader.vue";
import LearningMap from "./components/LearningMap.vue";
import TitlePage from "./components/TitlePage.vue";
import "lxgw-wenkai-screen-webfont/style.css";
import "./fonts.css";
import "./tokens.css";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "doc-before": () => h(ArticleHeader),
    }),
  enhanceApp({ app }) {
    app.component("LearningMap", LearningMap);
    app.component("TitlePage", TitlePage);
  },
} satisfies Theme;
