/* Isolated local WordPress only. Creates and removes a temporary administrator. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { execFileSync } = require('node:child_process');
const root = process.env.ADMINLUME_WP_ROOT;
if (!root) throw new Error('Set ADMINLUME_WP_ROOT to an isolated local Compose directory.');
const wp = code => execFileSync('docker', ['compose', 'run', '--rm', 'wpcli', 'wp', 'eval', code], {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
const auth = JSON.parse(wp(`
  if ('local' !== wp_get_environment_type() || !in_array(wp_parse_url(home_url(), PHP_URL_HOST), array('localhost', '127.0.0.1'), true)) WP_CLI::error('Local only.');
  $id = wp_insert_user(array('user_login' => 'adminlume-browser-' . wp_generate_uuid4(), 'user_pass' => wp_generate_password(40), 'role' => 'administrator'));
  if (is_wp_error($id)) WP_CLI::error('Cannot create test administrator.');
  $token = WP_Session_Tokens::get_instance($id)->create(time()+900);
  echo wp_json_encode(array('id'=>$id, 'url'=>home_url(), 'cookies'=>array(
    array('name'=>AUTH_COOKIE, 'value'=>wp_generate_auth_cookie($id,time()+900,'auth',$token)),
    array('name'=>LOGGED_IN_COOKIE, 'value'=>wp_generate_auth_cookie($id,time()+900,'logged_in',$token))
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
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addCookies(auth.cookies.map(cookie => ({ ...cookie, url: auth.url, httpOnly: true, sameSite: 'Lax' })));
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(auth.url).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(120000);
    await page.goto(auth.url + '/wp-admin/users.php?page=adminlume', { waitUntil: 'domcontentloaded' });
    const enabled = page.getByRole('checkbox', { name: 'Enable Adminlume for me' });
    check(!await enabled.isChecked(), 'New accounts default to native appearance');
    for (const label of ['Sidebar and top bar background', 'Accent color', 'Panel corner radius']) {
      check(await page.getByLabel(label, { exact: true }).count() === 1, 'Accessible settings label: ' + label);
    }
    await enabled.focus();
    await page.keyboard.press('Space');
    check(await enabled.isChecked(), 'Keyboard can toggle opt-in');
    await page.getByLabel('Panel corner radius', { exact: true }).selectOption('12');
    await page.getByRole('button', { name: 'Save preferences' }).focus();
    await Promise.all([page.waitForURL('**/*saved=1'), page.keyboard.press('Enter')]);
    check(await page.locator('body.rounded-admin').count() === 1, 'Valid POST enables personal skin');
    check(await page.getByText('Preferences saved.', { exact: true }).isVisible(), 'Successful save feedback visible');
    check(await page.getByLabel('Panel corner radius', { exact: true }).inputValue() === '12', 'Radius survives reload');
    await enabled.focus();
    check(await enabled.evaluate(el => document.activeElement === el && (getComputedStyle(el).boxShadow !== 'none' || getComputedStyle(el).outlineStyle !== 'none')), 'Focused checkbox has visible focus styling');
    if (process.env.ADMINLUME_SETTINGS_SCREENSHOT) await page.screenshot({ path: process.env.ADMINLUME_SETTINGS_SCREENSHOT, fullPage: true });
    if (process.env.AXE_MODULE) {
      await page.addScriptTag({ content: require(process.env.AXE_MODULE).source });
      const result = await page.evaluate(async () => {
        const result = await axe.run('.ra-preferences', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
        return {
          violations: result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })),
          incomplete: result.incomplete.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })),
        };
      });
      console.log('Settings axe results:', JSON.stringify(result));
      check(result.violations.length === 0, 'Settings have no scoped automated WCAG A/AA violations');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Settings have no mobile horizontal overflow');
    check(await page.getByRole('button', { name: 'Save preferences' }).isVisible(), 'Mobile save remains available');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(auth.url + '/wp-admin/users.php?page=adminlume', { waitUntil: 'domcontentloaded' });
    await enabled.uncheck();
    await Promise.all([page.waitForURL('**/*saved=1'), page.getByRole('button', { name: 'Save preferences' }).click()]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    check(await page.locator('body.rounded-admin').count() === 0, 'Opt-out restores native appearance');
    console.log(`Success: ${checks} settings browser checks passed.`);
  } finally {
    if (browser) await browser.close();
    wp(`require_once ABSPATH . 'wp-admin/includes/user.php'; wp_delete_user(${auth.id});`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
