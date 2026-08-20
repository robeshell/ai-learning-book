import { h, onMounted, watch, nextTick } from "vue";
import type { Theme } from "vitepress";
import { useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import mediumZoom from "medium-zoom";
import LearningMap from "./components/LearningMap.vue";
import TitlePage from "./components/TitlePage.vue";
import AIChatAssistant from "./components/AIChatAssistant.vue";
import "lxgw-wenkai-screen-webfont/style.css";
import "./fonts.css";
import "./tokens.css";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      "layout-bottom": () => h(AIChatAssistant),
    });
  },
  setup() {
    const route = useRoute();
    const initZoom = () => {
      mediumZoom(".vp-doc img:not(.no-zoom), figure img:not(.no-zoom)", {
        background: "rgba(15, 23, 42, 0.88)",
        margin: 32,
      });
    };
    onMounted(() => {
      initZoom();
    });
    watch(
      () => route.path,
      () => nextTick(() => initZoom())
    );
  },
  enhanceApp({ app }) {
    app.component("LearningMap", LearningMap);
    app.component("TitlePage", TitlePage);
    app.component("AIChatAssistant", AIChatAssistant);
  },
} satisfies Theme;
