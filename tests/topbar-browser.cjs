/* Local Docker only. Supply PLAYWRIGHT_MODULE when Playwright lives outside this repo. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = process.env.ADMINLUME_WP_ROOT || path.resolve(__dirname, '../../../../..');
const wp = code => execFileSync('docker', ['compose', 'run', '--rm', 'wpcli', 'wp', 'eval', code], {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
const auth = JSON.parse(wp(`
  if (!in_array(wp_parse_url(home_url(), PHP_URL_HOST), array('localhost','127.0.0.1'), true)) WP_CLI::error('Local only.');
  $users = get_users(array('role'=>'administrator','number'=>1,'fields'=>'ID'));
  if (!$users) WP_CLI::error('No local administrator.');
  $id = (int) $users[0];
  $token = WP_Session_Tokens::get_instance($id)->create(time()+900);
  echo wp_json_encode(array('id'=>$id,'url'=>home_url(),'token'=>$token,'cookies'=>array(
    array('name'=>AUTH_COOKIE,'value'=>wp_generate_auth_cookie($id,time()+900,'auth',$token)),
    array('name'=>LOGGED_IN_COOKIE,'value'=>wp_generate_auth_cookie($id,time()+900,'logged_in',$token))
  )));
`));
let browser;
let checks = 0;
const check = (condition, message) => {
  if (!condition) throw new Error(message);
  checks++;
};
(async () => {
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addCookies(auth.cookies.map(cookie => ({ ...cookie, url: auth.url, httpOnly: true, sameSite: 'Lax' })));
    // No third-party assets needed to test native toolbar geometry.
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(auth.url).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(auth.url + '/wp-admin/', { waitUntil: 'domcontentloaded' });
      await page.locator('body.rounded-admin').waitFor();
      const metrics = await page.locator('#wpadminbar').evaluate(bar => {
        const rect = el => { const r = el.getBoundingClientRect(); return { top: r.top, height: r.height, center: r.top + r.height / 2 }; };
        return { bar: rect(bar), items: [...bar.querySelectorAll('#wp-toolbar .ab-top-menu > li > .ab-item')]
          .filter(el => el.getBoundingClientRect().width && getComputedStyle(el).visibility !== 'hidden')
          .map(el => ({ id: el.parentElement.id, ...rect(el), icons: [...el.querySelectorAll('.ab-icon, .ab-label, kbd, img.avatar')].map(rect) })) };
      });
      check(metrics.bar.height === 32, `Native toolbar height at ${width}px`);
      check(metrics.items.some(item => item.id === 'wp-admin-bar-woocommerce-site-visibility-badge'), 'WooCommerce Live badge is present');
      check(metrics.items.every(item => item.height === 26 && item.top === 3), `All controls share vertical insets at ${width}px`);
      check(metrics.items.every(item => item.icons.every(icon => Math.abs(icon.center - item.center) < 1)), `Icons, labels and shortcut centered at ${width}px`);
      await page.locator('#wp-admin-bar-command-palette > .ab-item').hover();
      check(await page.locator('#wp-admin-bar-command-palette > .ab-item').evaluate(el => {
        const r = el.getBoundingClientRect();
        return r.top === 3 && r.bottom === 29 && getComputedStyle(el).borderRadius === '8px';
      }), 'Search hover remains inset and rounded');
      await page.locator('#wp-admin-bar-new-content > .ab-item').hover();
      await page.locator('#wp-admin-bar-new-content > .ab-sub-wrapper').waitFor({ state: 'visible' });
      check(await page.locator('#wp-admin-bar-new-content > .ab-sub-wrapper').evaluate(el => el.getBoundingClientRect().top === 32), 'Dropdown remains below toolbar');
      await page.locator('#wp-admin-bar-new-content .ab-submenu a').first().hover();
      check(await page.locator('#wp-admin-bar-new-content > .ab-sub-wrapper').isVisible(), 'Dropdown usable across inset');
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(auth.url, { waitUntil: 'domcontentloaded' });
    check(await page.locator('body.nzm-frontend-toolbar').count() === 1, 'Frontend dock is active');
    check(await page.locator('#rounded-admin-toolbar-css, #rounded-admin-css').count() === 0, 'Frontend receives no competing backend skin');
      check(await page.locator('#rounded-admin-frontend-toolbar-css').getAttribute('href').then(url=>url.includes('/plugins/adminlume/')), 'Dock stylesheet is served from reusable plugin');
    check(await page.locator('#wp-admin-bar-site-name, #wp-admin-bar-wp-logo').count() === 2, 'Dock preserves native branding and navigation');
    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(auth.url, { waitUntil: 'domcontentloaded' });
    check(await guestPage.locator('#rounded-admin-toolbar-css, #rounded-admin-css, #rounded-admin-sidebar-js, #rounded-admin-frontend-toolbar-css, #rounded-admin-frontend-toolbar-js').count() === 0, 'Anonymous visitors receive no skin assets');
    check(await guestPage.locator('body.rounded-admin-toolbar, #wpadminbar').count() === 0, 'Anonymous visitors see unchanged public page');
    if (await guestPage.locator('.site-header').count()) check(await guestPage.locator('.site-header').evaluate(el=>getComputedStyle(el).top==='0px'), 'Anonymous header offset remains unchanged');
    await guest.close();
    if (process.env.ROUNDED_ADMIN_SCREENSHOT) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.locator('#wp-admin-bar-site-name > .ab-item').hover();
      await page.screenshot({ path: process.env.ROUNDED_ADMIN_SCREENSHOT });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(auth.url, { waitUntil: 'domcontentloaded' });
    check(await page.evaluate(()=>getComputedStyle(document.documentElement).marginTop==='0px'), 'Mobile frontend has no toolbar top offset');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Frontend has no mobile horizontal overflow');
    await page.goto(auth.url + '/wp-admin/', { waitUntil: 'domcontentloaded' });
    check(await page.locator('#wpadminbar').evaluate(el => el.getBoundingClientRect().height === 46), 'Mobile toolbar height unchanged');
    check(await page.locator('#wp-admin-bar-menu-toggle > .ab-item').evaluate(el => el.getBoundingClientRect().height === 46), 'Mobile menu toggle retains native size');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No mobile horizontal overflow');
    console.log(`Success: ${checks} toolbar browser checks passed.`);
  } finally {
    if (browser) await browser.close();
    wp(`WP_Session_Tokens::get_instance(${auth.id})->destroy('${auth.token}');`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
