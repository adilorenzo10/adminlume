/* Development-only SVG export. Uses the same external Playwright setup as tests. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const directory = path.resolve(__dirname, '../assets/images');
  const svg = fs.readFileSync(path.join(directory, 'icon.svg'), 'utf8');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    // The artwork contains only local vector primitives; exporting needs no HTTP.
    await page.route('**/*', route => route.abort());
    for (const size of [128, 256]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style>${svg}`);
      const file = path.join(directory, `icon-${size}x${size}.png`);
      await page.screenshot({ path: file, omitBackground: true });
      console.log(`Exported ${file}`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
