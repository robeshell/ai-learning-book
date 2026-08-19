import { defineConfig } from "vitepress";
import { buildNav, buildSidebar, site } from "./series";

export default defineConfig({
  lang: "zh-CN",
  title: site.title,
  description: site.description,
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    [
      "link",
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    ],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+SC:wght@400;500;600&display=swap",
      },
    ],
  ],
  markdown: {
    math: true,
    lineNumbers: false,
    theme: {
      light: "min-light",
      dark: "min-dark",
    },
  },
  themeConfig: {
    logo: "/logo.svg",
    siteTitle: site.title,
    nav: buildNav(),
    sidebar: buildSidebar(),
    outline: {
      label: "本页目录",
      level: [2, 3],
    },
    search: {
      provider: "local",
      options: {
        translations: {
          button: {
            buttonText: "搜索",
            buttonAriaLabel: "搜索",
          },
          modal: {
            displayDetails: "显示详情",
            resetButtonTitle: "清除",
            backButtonTitle: "关闭",
            noResultsText: "没有找到",
            footer: {
              selectText: "选择",
              navigateText: "切换",
              closeText: "关闭",
            },
          },
        },
      },
    },
    docFooter: {
      prev: "上一篇",
      next: "下一篇",
    },
    lastUpdated: {
      text: "更新于",
    },
    sidebarMenuLabel: "目录",
    returnToTopLabel: "回到顶部",
    darkModeSwitchLabel: "外观",
    lightModeSwitchTitle: "切换到浅色",
    darkModeSwitchTitle: "切换到深色",
  },
});
