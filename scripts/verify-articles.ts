import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seriesList } from "../docs/.vitepress/series.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const docsDir = path.resolve(rootDir, "docs");
const publicDir = path.resolve(docsDir, "public");

interface CheckResult {
  file: string;
  title: string;
  status: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

const results: CheckResult[] = [];

console.log("\n🔍 开始执行《看懂人工智能》全书规范自动化自检...\n");

for (const series of seriesList) {
  for (const chapter of series.chapters) {
    for (const article of chapter.articles) {
      const relPath = path.join("series", series.id, `${article.id}.md`);
      const fullPath = path.join(docsDir, relPath);
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!fs.existsSync(fullPath)) {
        errors.push(`文件不存在: docs/${relPath}`);
        results.push({
          file: relPath,
          title: article.title,
          status: article.articleStatus,
          passed: false,
          errors,
          warnings,
        });
        continue;
      }

      const content = fs.readFileSync(fullPath, "utf-8");

      // 1. Frontmatter 检查
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!frontmatterMatch) {
        errors.push("缺失完整的 YAML Frontmatter");
      } else {
        const fm = frontmatterMatch[1];
        if (!fm.includes(`title: "${article.title}"`)) {
          errors.push(`Frontmatter title 与 series.ts 不一致，期望: "${article.title}"`);
        }
        if (!fm.includes(`series: ${series.id}`)) {
          errors.push(`Frontmatter series 错误，期望: ${series.id}`);
        }
        if (!fm.includes(`chapter: ${chapter.id}`)) {
          errors.push(`Frontmatter chapter 错误，期望: ${chapter.id}`);
        }
        if (!fm.includes(`order: ${article.order}`)) {
          errors.push(`Frontmatter order 错误，期望: ${article.order}`);
        }

        // 1.5 description 极简短语检查（<= 35 字，拒绝套话模板）
        const fmDescMatch = fm.match(/description:\s*"([^"]+)"/);
        if (fmDescMatch) {
          const desc = fmDescMatch[1].trim();
          if (desc.length > 35) {
            warnings.push(`Frontmatter description 过长 (${desc.length} 字): "${desc.slice(0, 20)}..."`);
          }
          const antiPatterns = ["带你看懂", "在进入", "究竟是怎么", "以及为什么", "深入浅出"];
          for (const pattern of antiPatterns) {
            if (desc.includes(pattern)) {
              warnings.push(`Frontmatter description 包含冗余套话: "${pattern}"`);
            }
          }
        }
      }

      // 1.6 series.ts description 极简短语检查
      if (article.description.length > 35) {
        warnings.push(`series.ts article.description 过长 (${article.description.length} 字): "${article.description.slice(0, 20)}..."`);
      }
      const antiPatterns = ["带你看懂", "在进入", "究竟是怎么", "以及为什么", "深入浅出"];
      for (const pattern of antiPatterns) {
        if (article.description.includes(pattern)) {
          warnings.push(`series.ts article.description 包含冗余套话: "${pattern}"`);
        }
      }

      // 2. 一级标题 H1 检查
      const h1Match = content.match(/^#\s+(.+)$/m);
      if (!h1Match) {
        errors.push("缺失一级标题 (# 标题)");
      } else if (h1Match[1].trim() !== article.title) {
        errors.push(`H1 标题与 series.ts 不一致: 当前 "${h1Match[1].trim()}"，期望 "${article.title}"`);
      }

      // 针对 draft / published 文章执行深度 7 步骨架检查
      if (article.articleStatus === "draft" || article.articleStatus === "published") {
        // 3. 必须包含全景配图 figure
        if (!content.includes("<figure>") || !content.includes("</figure>")) {
          errors.push("正文中缺失 <figure> 配图");
        }

        // 4. 检查图片文件存在性
        const imgMatches = content.matchAll(/<img[^>]+src="([^"]+)"/g);
        for (const match of imgMatches) {
          const imgSrc = match[1];
          if (imgSrc.startsWith("/")) {
            const imgPath = path.join(publicDir, imgSrc.slice(1));
            if (!fs.existsSync(imgPath)) {
              errors.push(`引用的图片文件不存在: docs/public${imgSrc}`);
            } else if (imgSrc.endsWith(".svg")) {
              // SVG 基础结构与溢出危险检查
              const svgContent = fs.readFileSync(imgPath, "utf-8");
              if (!svgContent.includes("<svg") || !svgContent.includes("viewBox=")) {
                warnings.push(`SVG 缺少标准 viewBox: ${imgSrc}`);
              }
            }
          }
        }

        // 4.5 检查 figcaption 精炼度（不超过 35 字符，杜绝叙述性长句）
        const figcaptions = content.matchAll(/<figcaption>([\s\S]*?)<\/figcaption>/g);
        for (const match of figcaptions) {
          const caption = match[1].trim();
          if (caption.length > 35) {
            warnings.push(`figcaption 过长 (${caption.length} 字): "${caption.slice(0, 20)}..."`);
          }
        }

        // 5. 检查标准总结模块: ## 核心概念辨析（严禁使用“读到这里该能分清”等说教用语）
        if (!content.includes("## 核心概念辨析")) {
          errors.push("缺失标准总结模块: `## 核心概念辨析`");
        }
        if (content.includes("## 读到这里该能分清")) {
          errors.push("包含已废弃的说教式小标题: `## 读到这里该能分清`，请替换为 `## 核心概念辨析`");
        }

        // 5.5 检查是否存在说教/居高临下词汇（初学者、新手、小白等）
        const condescendingWords = ["初学者", "小白", "低级错误"];
        for (const word of condescendingWords) {
          if (content.includes(word)) {
            warnings.push(`正文中包含可能有说教意味的词汇: "${word}"`);
          }
        }

        // 6. 检查标准参考文献模块: ## 参考文献
        if (!content.includes("## 参考文献")) {
          errors.push("缺失标准参考文献模块: `## 参考文献`");
        } else {
          const refSection = content.split("## 参考文献")[1] || "";
          if (!refSection.includes("http://") && !refSection.includes("https://")) {
            errors.push("参考文献模块中未包含有效的超链接");
          }
        }

        // 7. 检查代码块标记
        const codeBlocks = content.matchAll(/```(\w*)\r?\n([\s\S]*?)```/g);
        for (const block of codeBlocks) {
          const lang = block[1].trim();
          const code = block[2].trim();
          if (!lang) {
            warnings.push("发现未标注语言的代码块 (```)");
          }
          if (code.includes("待写") || code.includes("TODO")) {
            errors.push("代码块中包含占位符待写文本");
          }
        }

        // 8. 检查 MathJax LaTeX 公式闭合
        const inlineMathMatches = content.match(/(?<!\$)\$([^$\n]+)\$(?!\$)/g) || [];
        const blockMathMatches = content.match(/\$\$[\s\S]*?\$\$/g) || [];
        // 简单检测孤立的单个 $
        const singleDollarCount = (content.match(/(?<!\$)\$(?!\$)/g) || []).length;
        if (singleDollarCount % 2 !== 0) {
          warnings.push("可能存在未配对闭合的行内 LaTeX 公式 ($)");
        }
      }

      results.push({
        file: relPath,
        title: article.title,
        status: article.articleStatus,
        passed: errors.length === 0,
        errors,
        warnings,
      });
    }
  }

  // 检查专栏首页 docs/series/${series.id}/index.md
  const seriesIndexPath = path.join(docsDir, "series", series.id, "index.md");
  if (fs.existsSync(seriesIndexPath)) {
    const sIndexContent = fs.readFileSync(seriesIndexPath, "utf-8");
    const sFmMatch = sIndexContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (sFmMatch) {
      const fmDescMatch = sFmMatch[1].match(/description:\s*"([^"]+)"/);
      if (fmDescMatch) {
        const desc = fmDescMatch[1].trim();
        const sIndexErrors: string[] = [];
        const sIndexWarnings: string[] = [];
        if (desc.length > 35) {
          sIndexWarnings.push(`专栏 index.md description 过长 (${desc.length} 字): "${desc.slice(0, 20)}..."`);
        }
        const antiPatterns = ["带你看懂", "在进入", "究竟是怎么", "以及为什么", "深入浅出", "从……讲到", "拆解"];
        for (const pattern of antiPatterns) {
          if (desc.includes(pattern) || sIndexContent.includes(pattern)) {
            sIndexWarnings.push(`专栏 index.md 包含冗余套话: "${pattern}"`);
          }
        }
        if (sIndexWarnings.length > 0) {
          results.push({
            file: `series/${series.id}/index.md`,
            title: `${series.title} 概览页`,
            status: "overview",
            passed: sIndexErrors.length === 0,
            errors: sIndexErrors,
            warnings: sIndexWarnings,
          });
        }
      }
    }
  }
}

// 打印自检结果看板
let totalPassed = 0;
let totalFailed = 0;
let totalDrafts = 0;

for (const r of results) {
  const statusBadge = `[${r.status.toUpperCase()}]`.padEnd(12);
  if (r.status === "draft" || r.status === "published") {
    totalDrafts++;
  }

  if (r.passed) {
    totalPassed++;
    if (r.status === "draft" || r.status === "published") {
      console.log(`  ✅ ${statusBadge} ${r.title} (${r.file})`);
      if (r.warnings.length > 0) {
        for (const w of r.warnings) {
          console.log(`     ⚠️  警告: ${w}`);
        }
      }
    }
  } else {
    totalFailed++;
    console.log(`  ❌ ${statusBadge} ${r.title} (${r.file})`);
    for (const err of r.errors) {
      console.log(`     ⛔ 错误: ${err}`);
    }
    for (const w of r.warnings) {
      console.log(`     ⚠️  警告: ${w}`);
    }
  }
}

console.log("\n" + "=".repeat(60));
console.log(`📊 自检完成统计:`);
console.log(`   总篇目: ${results.length} 篇`);
console.log(`   已完成 Draft 篇目: ${totalDrafts} 篇`);
console.log(`   合规通过: ${totalPassed} 篇`);
console.log(`   未通过:   ${totalFailed} 篇`);
console.log("=".repeat(60) + "\n");

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log("🎉 所有已写文章与全书元数据 100% 符合 SPEC 规范！\n");
}
