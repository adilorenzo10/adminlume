/*
 * Local Docker only. Supply PLAYWRIGHT_MODULE when Playwright lives outside this
 * repo and PLAYWRIGHT_CHANNEL (for example "chrome") to reuse an installed browser.
 */
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
const near = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance;

(async () => {
  try {
    browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addCookies(auth.cookies.map(cookie => ({ ...cookie, url: auth.url, httpOnly: true, sameSite: 'Lax' })));
    // No third-party assets are needed to test toolbar geometry.
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(auth.url).origin ? route.continue() : route.abort());
    const page = await context.newPage();

    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(auth.url + '/wp-admin/', { waitUntil: 'domcontentloaded' });
      await page.locator('body.rounded-admin.ra-topbar-ready').waitFor();
      const metrics = await page.locator('#wpadminbar').evaluate(bar => {
        const rect = el => { const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, height: r.height, center: r.top + r.height / 2 }; };
        return {
          bar: rect(bar),
          offset: getComputedStyle(document.documentElement).paddingTop,
          items: [...bar.querySelectorAll('#wp-toolbar .ab-top-menu > li > .ab-item')]
            .filter(el => el.getBoundingClientRect().width && getComputedStyle(el).visibility !== 'hidden')
            .map(el => ({ id: el.parentElement.id, ...rect(el), icons: [...el.querySelectorAll('.ab-icon, .ra-bell-icon, .ra-search-icon, kbd, img.avatar')].map(rect) })),
        };
      });
      const ids = metrics.items.map(item => item.id);
      check(metrics.bar.height === 48, `Workspace bar is 48px at ${width}px`);
      check(metrics.offset === '48px', `Document offset follows the bar at ${width}px`);
      check(ids.includes('wp-admin-bar-woocommerce-site-visibility-badge'), 'WooCommerce Live badge is preserved');
      check(ids.includes('wp-admin-bar-adminlume-search') && !ids.includes('wp-admin-bar-command-palette'), 'Adminlume search replaces the core palette node');
      check(!ids.includes('wp-admin-bar-comments') && !ids.includes('wp-admin-bar-updates'), 'Updates and comments are grouped under notifications');
      check(metrics.items.every(item => near(item.center, 24)), `Controls share the bar's vertical center at ${width}px`);
      check(metrics.items.every(item => item.icons.every(icon => near(icon.center, item.center))), `Icons and shortcut are centered at ${width}px`);
      check(metrics.items.every(item => item.right <= width), `No control crosses the viewport at ${width}px`);

      await page.locator('#wp-admin-bar-new-content > .ab-item').hover();
      await page.locator('#wp-admin-bar-new-content > .ab-sub-wrapper').waitFor({ state: 'visible' });
      check(await page.locator('#wp-admin-bar-new-content > .ab-sub-wrapper').evaluate(el => Math.round(el.getBoundingClientRect().top) === 48), 'Dropdown opens below the bar');
      await page.locator('#wp-admin-bar-new-content .ab-submenu a').first().hover();
      check(await page.locator('#wp-admin-bar-new-content > .ab-sub-wrapper').isVisible(), 'Dropdown stays usable across the inset');

      await page.locator('#wp-admin-bar-adminlume-notifications > .ab-item').hover();
      await page.locator('#wp-admin-bar-adminlume-notifications > .ab-sub-wrapper').waitFor({ state: 'visible' });
      check(await page.locator('#wp-admin-bar-adminlume-notifications > .ab-sub-wrapper').evaluate(el => el.getBoundingClientRect().right <= innerWidth), 'Notifications menu stays inside the viewport');
      check(await page.locator('#wp-admin-bar-adminlume-notifications-footer a').count() === 1, 'Notifications menu ends with a footer link');
    }

    // Command palette: pointer, keyboard shortcut, list navigation and focus return.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(auth.url + '/wp-admin/', { waitUntil: 'domcontentloaded' });
    await page.locator('body.ra-topbar-ready').waitFor();
    const trigger = page.locator('.ra-search-trigger');
    const input = page.locator('.ra-palette-input');
    await trigger.click();
    await input.waitFor({ state: 'visible' });
    check(await input.evaluate(el => el === document.activeElement), 'Palette focuses its input');
    check(await page.locator('.ra-palette-dialog[role="dialog"][aria-modal="true"]').count() === 1, 'Palette is a modal dialog');
    await input.fill('prod');
    check(await page.locator('.ra-palette-option:visible').count() > 1, 'Palette finds matching entries');
    const first = await input.getAttribute('aria-activedescendant');
    check(Boolean(first) && await page.locator('#' + first).getAttribute('aria-selected') === 'true', 'First result is active');
    await page.keyboard.press('ArrowDown');
    const second = await input.getAttribute('aria-activedescendant');
    check(second && second !== first, 'Arrow keys move the active result');
    await input.fill('zzzz-no-match');
    check(await page.locator('.ra-palette-empty').isVisible(), 'Empty state is announced visually');
    await page.keyboard.press('Escape');
    await input.waitFor({ state: 'hidden' });
    check(await trigger.evaluate(el => el === document.activeElement), 'Focus returns to the trigger');
    await page.locator('#wpbody-content').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Control+k');
    await input.waitFor({ state: 'visible' });
    check(true, 'Ctrl+K opens the palette');
    await page.keyboard.press('Escape');

    // The block editor keeps WordPress's own toolbar and command palette.
    await page.goto(auth.url + '/wp-admin/post-new.php', { waitUntil: 'domcontentloaded' });
    await page.locator('body.block-editor-page').waitFor();
    check(await page.locator('#wp-admin-bar-adminlume-search, #rounded-admin-topbar-js').count() === 0, 'Block editor receives no workspace bar');

    await page.goto(auth.url, { waitUntil: 'domcontentloaded' });
    check(await page.locator('body.nzm-frontend-toolbar').count() === 1, 'Frontend dock is active');
    check(await page.locator('#rounded-admin-toolbar-css, #rounded-admin-css').count() === 0, 'Frontend receives no competing backend skin');
    check(await page.locator('#rounded-admin-frontend-toolbar-css').getAttribute('href').then(url => url.includes('/plugins/adminlume/')), 'Dock stylesheet is served from the plugin');
    check(await page.locator('#wp-admin-bar-site-name, #wp-admin-bar-wp-logo').count() === 2, 'Dock preserves native branding and navigation');
    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(auth.url, { waitUntil: 'domcontentloaded' });
    check(await guestPage.locator('#rounded-admin-toolbar-css, #rounded-admin-css, #rounded-admin-sidebar-js, #rounded-admin-topbar-js, #rounded-admin-frontend-toolbar-css, #rounded-admin-frontend-toolbar-js').count() === 0, 'Anonymous visitors receive no skin assets');
    check(await guestPage.locator('body.rounded-admin-toolbar, #wpadminbar').count() === 0, 'Anonymous visitors see the unchanged public page');
    if (await guestPage.locator('.site-header').count()) check(await guestPage.locator('.site-header').evaluate(el => getComputedStyle(el).top === '0px'), 'Anonymous header offset remains unchanged');
    await guest.close();

    if (process.env.ROUNDED_ADMIN_SCREENSHOT) {
      await page.goto(auth.url + '/wp-admin/', { waitUntil: 'domcontentloaded' });
      await page.locator('body.ra-topbar-ready').waitFor();
      await page.screenshot({ path: process.env.ROUNDED_ADMIN_SCREENSHOT });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(auth.url, { waitUntil: 'domcontentloaded' });
    check(await page.evaluate(() => getComputedStyle(document.documentElement).marginTop === '0px'), 'Mobile frontend has no toolbar top offset');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Frontend has no mobile horizontal overflow');
    await page.goto(auth.url + '/wp-admin/', { waitUntil: 'domcontentloaded' });
    await page.locator('body.ra-topbar-ready').waitFor();
    check(await page.locator('#wpadminbar').evaluate(el => el.getBoundingClientRect().height === 46), 'Mobile toolbar height unchanged');
    check(await page.locator('#wp-admin-bar-menu-toggle > .ab-item').evaluate(el => el.getBoundingClientRect().height === 46), 'Mobile menu toggle retains native size');
    check(await page.locator('#wp-admin-bar-comments').evaluate(el => el.parentElement.id === 'wp-admin-bar-root-default'), 'Native nodes return to the mobile toolbar');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No mobile horizontal overflow');
    console.log(`Success: ${checks} toolbar browser checks passed.`);
  } finally {
    if (browser) await browser.close();
    wp(`WP_Session_Tokens::get_instance(${auth.id})->destroy('${auth.token}');`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
