import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const assetsDir = path.join(distDir, 'assets');

const indexHtmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf-8');

const assetFiles = fs.readdirSync(assetsDir);
const cssFiles = assetFiles.filter((f) => f.endsWith('.css'));
const jsFiles = assetFiles.filter((f) => f.endsWith('.js'));

const combinedCss = cssFiles
  .map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf-8'))
  .join('\n');

const combinedJs = jsFiles
  .map((f) => fs.readFileSync(path.join(assetsDir, f), 'utf-8'))
  .join('\n');

// Remove external stylesheet link tags pointing to /assets/
html = html.replace(
  /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']\/assets\/[^"']+\.css["'][^>]*>/gi,
  () => `<style>\n${combinedCss}\n</style>`
);

// Remove external module script tags pointing to /assets/ and inline at end of body
html = html.replace(
  /<script\s+[^>]*src=["']\/assets\/[^"']+\.js["'][^>]*><\/script>/gi,
  () => ''
);

html = html.replace(
  /<\/body>/i,
  () => `<script type="module">\n${combinedJs}\n</script>\n</body>`
);

const outPath = path.join(distDir, 'kandira_standalone.html');
fs.writeFileSync(outPath, html, 'utf-8');

const stats = fs.statSync(outPath);
console.log(`Built standalone HTML: ${outPath} (${(stats.size / 1024).toFixed(1)} KB)`);
