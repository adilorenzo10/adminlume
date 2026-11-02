/* Local WordPress only. No content or preference writes; temporary session cleanup. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.ADMINLUME_WP_ROOT || path.resolve(__dirname, '../../../../..');
const wp = code => execFileSync('docker', ['compose', 'run', '--rm', 'wpcli', 'wp', 'eval', code], {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
const auth = JSON.parse(wp(`
  if (!in_array(wp_parse_url(home_url(), PHP_URL_HOST), array('localhost', '127.0.0.1'), true)) WP_CLI::error('Local only.');
  $ids = get_users(array('role' => 'administrator', 'number' => 1, 'fields' => 'ID'));
  if (!$ids) WP_CLI::error('No local administrator.');
  $id = (int) $ids[0]; $token = WP_Session_Tokens::get_instance($id)->create(time() + 900);
  echo wp_json_encode(array('id' => $id, 'url' => home_url(), 'token' => $token, 'cookies' => array(
    array('name' => AUTH_COOKIE, 'value' => wp_generate_auth_cookie($id, time()+900, 'auth', $token)),
    array('name' => LOGGED_IN_COOKIE, 'value' => wp_generate_auth_cookie($id, time()+900, 'logged_in', $token))
  )));
`));
let browser;
let checks = 0;
const check = (value, message) => { if (!value) throw new Error(message); checks++; };
const screenshot = async (page, name) => {
  if (process.env.TOOLBAR_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.TOOLBAR_SCREENSHOT_DIR, name + '.png') });
};
const routes = async context => context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.origin !== new URL(auth.url).origin) return route.abort();
  // Explicit opt-in: test checkout CSS/JS without modifying an installed plugin.
  if (process.env.ADMINLUME_ASSET_OVERRIDE === '1') {
    const asset = url.pathname.match(/\/plugins\/adminlume\/(assets\/(?:css|js)\/frontend-toolbar\.(?:css|js))$/);
    if (asset) return route.fulfill({
      body: fs.readFileSync(path.resolve(__dirname, '..', asset[1])),
      contentType: asset[1].endsWith('.css') ? 'text/css' : 'application/javascript',
    });
  }
  return route.continue();
});
const cookies = auth.cookies.map(cookie => ({ ...cookie, url: auth.url, httpOnly: true, sameSite: 'Lax' }));
const nativeLinks = page => page.locator('#wpadminbar [id^="wp-admin-bar-"] > a.ab-item[href]').evaluateAll(elements =>
  Object.fromEntries(elements.map(element => [element.parentElement.id, element.getAttribute('href')])));
const waitAnimation = page => page.waitForFunction(() => !document.querySelector('#wpadminbar').getAnimations().length);
(async () => {
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    await context.addCookies(cookies);
    await routes(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(auth.url + '/wp-admin/', { waitUntil: 'domcontentloaded' });
    const adminMetrics = () => page.locator('#wpadminbar').evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, height: rect.height, position: getComputedStyle(element).position };
    });
    const before = await adminMetrics();
    check(await page.locator('#rounded-admin-frontend-toolbar-css, #rounded-admin-frontend-toolbar-js').count() === 0, 'No dock assets in backend');
    await page.goto(auth.url, { waitUntil: 'domcontentloaded' });
    await page.locator('#wpadminbar.nzm-dock-ready').waitFor();
    const links = await nativeLinks(page);
    check(await page.locator('#wpadminbar').count() === 1, 'Only one native toolbar');
    check(await page.locator('#rounded-admin-css, #rounded-admin-toolbar-css, #rounded-admin-sidebar-js').count() === 0, 'No admin layout assets on frontend');
    check(await page.locator('#wpadminbar').evaluate(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.height >= 56 && Math.abs((rect.left + rect.right) / 2 - innerWidth / 2) < 1 && Math.abs(innerHeight - rect.bottom - 20) < 1 && style.borderRadius === '22px' && getComputedStyle(element, '::before').backgroundImage.includes('linear-gradient');
    }), 'Previous rounded, translucent dark dock is restored');
    check(await page.locator('#wp-admin-bar-root-default > #wp-admin-bar-site-name, #wp-admin-bar-root-default > #wp-admin-bar-wp-logo, #wp-admin-bar-root-default > #wp-admin-bar-nzm-toolbar-dashboard').count() === 3, 'WordPress, site name, and Dashboard are separate desktop actions');
    check(await page.locator('#wp-admin-bar-nzm-toolbar-site').count() === 0, 'The redesigned combined site menu is absent');
    check(await page.locator('#ra-dock-hide .ra-dock-hide-label').isVisible(), 'Desktop hide control has its previous text label');
    if (await page.locator('#wp-admin-bar-woocommerce-site-visibility-badge').count()) {
      check(await page.locator('#wp-admin-bar-root-default > #wp-admin-bar-woocommerce-site-visibility-badge').count() === 1, 'Live status remains a separate desktop action');
    }
    await page.locator('#wp-admin-bar-site-name > .ab-item').focus();
    await page.keyboard.press('ArrowUp');
    check(await page.locator('#wp-admin-bar-site-name > .ab-sub-wrapper').evaluate(element => element.contains(document.activeElement)), 'Arrow key enters the native site menu');
    await page.keyboard.press('Escape');
    check(await page.locator('#wp-admin-bar-site-name > .ab-item').evaluate(element => element === document.activeElement && element.getAttribute('aria-expanded') === 'false'), 'Escape closes site menu and restores focus');
    await page.locator('#wp-admin-bar-my-account > .ab-item').hover();
    check(await page.locator('#wp-admin-bar-logout > a').isVisible(), 'Native account menu still exposes logout');
    check(await page.locator('#wp-admin-bar-my-account > .ab-item .display-name').isVisible(), 'Desktop account name is visible again');
    await page.keyboard.press('Escape');
    await screenshot(page, 'dock-desktop');

    // Exercise a late third-party action, its nested submenu, and its original handler.
    await page.evaluate(() => {
      const item = document.createElement('li');
      item.id = 'wp-admin-bar-adminlume-test-plugin';
      item.className = 'menupop';
      item.innerHTML = '<a class="ab-item" href="#plugin">Plugin action</a><div class="ab-sub-wrapper"><ul class="ab-submenu"><li id="wp-admin-bar-adminlume-test-child"><a class="ab-item" href="#child">Nested action</a></li></ul></div>';
      item.querySelector('#wp-admin-bar-adminlume-test-child a').addEventListener('click', event => {
        event.preventDefault(); window.adminlumePluginClicks = (window.adminlumePluginClicks || 0) + 1;
      });
      window.adminlumePluginNode = item;
      document.querySelector('#wp-admin-bar-root-default').append(item);
    });
    await page.locator('#nzm-toolbar-overflow #wp-admin-bar-adminlume-test-plugin').waitFor({ state: 'attached' });
    await page.locator('#wp-admin-bar-nzm-toolbar-more > .ab-item').click();
    await page.locator('#wp-admin-bar-adminlume-test-plugin > a').focus();
    await page.keyboard.press('ArrowRight');
    await page.locator('#wp-admin-bar-adminlume-test-child > a').click();
    check(await page.evaluate(() => window.adminlumePluginClicks === 1 && window.adminlumePluginNode === document.querySelector('#wp-admin-bar-adminlume-test-plugin')), 'Late plugin node and event handler preserved');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.locator('#ra-dock-hide').focus();
    await page.keyboard.press('Enter');
    await page.locator('#wpadminbar').waitFor({ state: 'hidden' });
    check(await page.locator('#ra-dock-show').evaluate(element => element === document.activeElement && element.getBoundingClientRect().width === 44), 'Hide leaves the previous focused 44px reopen control');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#ra-dock-show').waitFor({ state: 'visible' });
    check(await page.locator('#wpadminbar').isHidden(), 'Collapsed preference survives navigation');
    await page.locator('#ra-dock-show').hover();
    check(await page.locator('#ra-dock-show').evaluate(element => {
      const style = getComputedStyle(element);
      const background = style.backgroundColor.match(/[\d.]+/g).map(Number);
      const svg = element.querySelector('svg');
      return background.slice(0, 3).every(channel => channel < 80) && (background[3] ?? 1) >= .9 &&
        style.color === 'rgb(255, 255, 255)' && getComputedStyle(svg).stroke === style.color;
    }), 'Collapsed reopen control stays dark on hover with a visible white icon');
    await page.mouse.move(0, 0);
    await page.locator('#ra-dock-show').focus();
    check(await page.locator('#ra-dock-show').evaluate(element => {
      const style = getComputedStyle(element);
      return element === document.activeElement && style.backgroundColor === 'rgb(41, 41, 41)' && style.outlineStyle !== 'none';
    }), 'Collapsed reopen control keeps a dark keyboard-focus state and visible outline');
    await page.locator('#ra-dock-show').click();
    await waitAnimation(page);
    check(await page.locator('#ra-dock-hide').evaluate(element => element === document.activeElement), 'Expand restores toolbar focus');
    for (const width of [1024, 600, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForFunction(() => document.querySelector('#wpadminbar').getBoundingClientRect().right <= innerWidth);
      check(await page.locator('#wpadminbar').evaluate(element => {
        const rect = element.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth && element.scrollWidth <= element.clientWidth + 1;
      }), `Toolbar fits at ${width}px`);
    }
    check(await page.locator('#nzm-toolbar-overflow #wp-admin-bar-new-content').count() === 1, 'New action grouped on mobile');
    await page.locator('#wp-admin-bar-nzm-toolbar-more > .ab-item').click();
    check(await page.locator('#wp-admin-bar-nzm-toolbar-more > .ab-sub-wrapper').evaluate(element => {
      const rect = element.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom < document.querySelector('#wpadminbar').getBoundingClientRect().top;
    }), 'Mobile dropdown opens above dock within viewport');
    const afterLinks = await nativeLinks(page);
    check(Object.entries(links).every(([id, href]) => afterLinks[id] === href), 'All native action IDs and URLs survive regrouping');
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.locator('#wp-admin-bar-root-default > #wp-admin-bar-new-content').waitFor({ state: 'attached' });
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    check(await page.locator('#wpadminbar').evaluate(element => element.getBoundingClientRect().left >= 0 && element.getBoundingClientRect().right <= innerWidth), 'RTL shell fits');
    await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
    await page.locator('#ra-dock-hide').click();
    await page.locator('#ra-dock-show').click();
    await waitAnimation(page);
    check(await page.locator('#wpadminbar').evaluate(element => !element.hidden && !element.inert), 'Quick reopen cancels outgoing animation');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#ra-dock-hide').click();
    check(await page.locator('#wpadminbar').evaluate(element => element.hidden && !element.getAnimations().length), 'Reduced motion skips collapse animation');
    await page.locator('#ra-dock-show').click();
    const product = wp('$ids = get_posts(array("post_type" => "product", "post_status" => "publish", "numberposts" => 1, "fields" => "ids")); echo $ids ? get_permalink($ids[0]) : "";');
    if (product) {
      await page.goto(product, { waitUntil: 'domcontentloaded' });
      await page.locator('#wp-admin-bar-root-default > #wp-admin-bar-edit > a').waitFor();
      check(await page.locator('#wp-admin-bar-edit > a').evaluate(element => !!element.getAttribute('href') && !!element.textContent.trim() && getComputedStyle(element).backgroundColor === 'rgb(255, 75, 11)'), 'Product edit retains its native link and previous accent');
      await screenshot(page, 'dock-product');
      await page.setViewportSize({ width: 320, height: 640 });
      await page.waitForFunction(() => document.querySelector('#wpadminbar').classList.contains('nzm-dock-compact'));
      check(await page.locator('#wp-admin-bar-edit > a').evaluate(element => element.getBoundingClientRect().width === 36 && !!element.textContent.trim()), 'Narrow mobile restores the previous edit control');
      check(await page.locator('#wpadminbar').evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'Product dock fits a small phone');
      await screenshot(page, 'dock-product-mobile');
      await page.setViewportSize({ width: 1440, height: 960 });
    }
    await page.goto(auth.url + '/wp-admin/', { waitUntil: 'domcontentloaded' });
    check(JSON.stringify(before) === JSON.stringify(await adminMetrics()), 'Backend toolbar unchanged');
    check(errors.length === 0, 'No uncaught frontend errors: ' + errors.join(', '));

    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await touch.addCookies(cookies); await routes(touch);
    const touchPage = await touch.newPage();
    await touchPage.goto(auth.url, { waitUntil: 'domcontentloaded' });
    await touchPage.locator('#wp-admin-bar-nzm-toolbar-more > .ab-item').tap();
    check(await touchPage.locator('#wp-admin-bar-nzm-toolbar-more > .ab-item').getAttribute('aria-expanded') === 'true', 'Touch opens secondary actions');
    await touchPage.locator('#wp-admin-bar-nzm-toolbar-more > .ab-item').tap();
    check(await touchPage.locator('#wp-admin-bar-nzm-toolbar-more > .ab-item').getAttribute('aria-expanded') === 'false', 'Second tap closes secondary actions');
    await touchPage.locator('#ra-dock-hide').tap();
    await touchPage.locator('#wpadminbar').waitFor({ state: 'hidden' });
    await touchPage.locator('#ra-dock-show').tap();
    await waitAnimation(touchPage);
    await screenshot(touchPage, 'dock-mobile');
    await touch.close();
    const guest = await browser.newContext(); await routes(guest);
    const guestPage = await guest.newPage();
    await guestPage.goto(auth.url, { waitUntil: 'domcontentloaded' });
    check(await guestPage.locator('#wpadminbar, #rounded-admin-frontend-toolbar-css, #rounded-admin-frontend-toolbar-js').count() === 0, 'Guests receive no dock or dock assets');
    await guest.close();
    const blockedStorage = await browser.newContext(); await blockedStorage.addCookies(cookies); await routes(blockedStorage);
    await blockedStorage.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } }));
    const blockedPage = await blockedStorage.newPage();
    await blockedPage.goto(auth.url, { waitUntil: 'domcontentloaded' });
    await blockedPage.locator('#ra-dock-hide').click();
    await blockedPage.locator('#wpadminbar').waitFor({ state: 'hidden' });
    await blockedPage.locator('#ra-dock-show').click();
    check(await blockedPage.locator('#wpadminbar').isVisible(), 'Controls work when local storage is blocked');
    await blockedStorage.close();
    const noScript = await browser.newContext({ javaScriptEnabled: false }); await noScript.addCookies(cookies); await routes(noScript);
    const noScriptPage = await noScript.newPage();
    await noScriptPage.goto(auth.url, { waitUntil: 'domcontentloaded' });
    await noScriptPage.locator('#wp-admin-bar-site-name > .ab-item').hover();
    check(await noScriptPage.locator('#wp-admin-bar-site-name > .ab-sub-wrapper').isVisible(), 'Native site menu remains available without JavaScript');
    await noScript.close();
    console.log(`Success: ${checks} frontend toolbar browser checks passed.${process.env.ADMINLUME_ASSET_OVERRIDE === '1' ? ' Checkout CSS/JS override enabled; installed PHP is not replaced.' : ''}`);
  } finally {
    if (browser) await browser.close();
    wp(`WP_Session_Tokens::get_instance(${auth.id})->destroy('${auth.token}');`);
  }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
