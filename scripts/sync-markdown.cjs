const fs = require("fs");
const path = require("path");

// Read series.ts
const seriesTsPath = path.resolve(__dirname, "../docs/.vitepress/series.ts");
const seriesContent = fs.readFileSync(seriesTsPath, "utf8");

// Since series.ts has clean object literal export, let us parse seriesList
// Or extract via tsx/bundle
console.log("Ready to sync");
