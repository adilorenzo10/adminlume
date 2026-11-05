# Development and testing

## Architecture

| File | Responsibility |
| --- | --- |
| `adminlume.php` | Plugin metadata, text domain loading, and hook registration. |
| `src/class-settings.php` | Personal preferences, sanitization, settings page, and authenticated POST-only save handler. |
| `src/class-assets.php` | Conditional admin assets, appearance variables, and luminance-based foreground selection. |
| `src/class-chrome.php` | Admin toolbar adjustments and the sidebar site link for opted-in users. |
| `src/class-frontendtoolbar.php` | Native toolbar integration on authenticated public-site requests. |
| `assets/css/admin.css` | Scoped admin layout and native controls. |
| `assets/css/toolbar.css` | Backend toolbar only. |
| `assets/css/media.css` | Native media surfaces, loaded when WordPress enqueues media. |
| `assets/css/woocommerce.css` | Relevant classic WooCommerce surfaces. |
| `assets/js/sidebar.js` | Independent sidebar scrolling, flyout positioning, and menu-label filtering. |
| `assets/css/frontend-toolbar.css`, `assets/js/frontend-toolbar.js` | Standalone public-site dock; no theme build dependency. |
| `languages/` | Gettext POT template and bundled Italian PO/MO catalogs; English source fallback. |

The plugin has no compilation step. PHP uses WordPress hooks and user metadata; JavaScript uses browser APIs without a framework. Network admin and user admin are excluded from the admin skin.

The desktop sidebar header is outside the `#ra-sidebar-navigation` scroll container. Scripts move the original nodes and restore native structure on mobile. Flyouts remain in the WordPress menu and are positioned within the viewport without scrolling the document. Do not replace native state management or duplicate WordPress event handlers.

Keep public-site assets isolated: do not enqueue the admin layout or sidebar script on the front end. Preserve native toolbar links, capabilities, IDs, and notifications when grouping or positioning nodes.

## Stored data and compatibility

- `adminlume_preferences`: current user metadata containing `enabled`, `accent`, `chrome_background`, and `radius`.
- `rounded_admin_preferences`: legacy fallback, read only if the current key is absent. Saving writes the current key without deleting legacy data.
- Browser local storage: dock visibility state when storage is available; controls must still work if storage is blocked.
- No custom update cache is read by the directory edition. An old `adminlume_release_manifest_v1` transient can expire naturally. No custom cron job is added.

Internal `rounded-admin`, `ra-*`, and `nzm-*` identifiers and asset handles are compatibility details. Do not rename them as part of cosmetic or documentation work. Neither deactivation nor an uninstall routine currently deletes metadata; there is no uninstall cleanup implementation.

## Local test environment

The repository does not bundle WordPress, a Docker Compose configuration, Node.js dependencies, or a Playwright installation. Provide these separately:

1. An isolated Docker Compose WordPress installation with a `wpcli` service and WP-CLI available as `wp`.
2. The same plugin revision installed and activated at `/var/www/html/wp-content/plugins/adminlume` inside WordPress.
3. A site URL with hostname `localhost` or `127.0.0.1`, reachable from the host browser runner.
4. `WP_ENVIRONMENT_TYPE` set to `local` for the PHP integration test.
5. Node.js, Playwright, and its Chromium browser installed in your development environment for browser tests.

Do not use a production database. The integration test creates a temporary subscriber, writes test preferences, and deletes that user in its cleanup block. Browser tests create a temporary administrator session and attempt to destroy it during cleanup; they do not change content or saved preferences. Interrupted processes may require manual cleanup on the local test site.

### PHP integration test

Run from the directory containing the local site's Compose file, not from this standalone plugin repository:

```bash
docker compose run --rm wpcli wp eval-file /var/www/html/wp-content/plugins/adminlume/tests/integration.php
```

Coverage includes opt-in defaults, sanitization, contrast selection, metadata isolation, legacy fallback, authenticated form markup, conditional admin/front-end asset loading, and preservation of native action labels, destinations, and metadata. Edit-action checks reuse existing page, post, and product fixtures when available; missing fixtures are skipped. These checks are not a complete security audit or a substitute for request-level authorization testing.

The main integration suite also verifies that no external update URI, updater class, or Adminlume hooks override WordPress's update/details/download APIs. It checks that GET cannot save settings and an invalid POST nonce cannot write preferences. The retired GitHub updater integration suite has been removed.

For English/Italian runtime checks, run `tests/i18n-integration.php` through the same local WP-CLI setup. It requires the Italian core language pack and creates/deletes a temporary user. See [translations.md](translations.md) for catalog generation, locale behavior, and the standalone translation tests included in release CI.

### Browser regression tests

Before running, enable Adminlume for the first administrator returned by WordPress. The tests expect specific fixtures beyond the plugin's minimum runtime requirements:

- `tests/topbar-browser.cjs` expects the WooCommerce site-visibility badge and a command-palette toolbar node.
- `tests/frontend-toolbar-browser.cjs` expects the native site, account, logout, and New actions. It optionally checks an existing published product. It does not require a theme-specific header selector or a fixed accent color. It also injects a temporary in-browser plugin menu to verify preservation of nested actions and event handlers; no site content is saved.

These are fixture-dependent regression tests, not a general-purpose compatibility suite for arbitrary WordPress installations. Match the fixtures or adjust tests deliberately when testing other themes or configurations; do not change plugin behavior merely to satisfy site-specific assumptions.

From the root of this repository, point `ADMINLUME_WP_ROOT` at the local directory containing the Compose file:

```bash
ADMINLUME_WP_ROOT=/path/to/local-site node tests/topbar-browser.cjs
ADMINLUME_WP_ROOT=/path/to/local-site node tests/frontend-toolbar-browser.cjs
ADMINLUME_WP_ROOT=/path/to/local-site node tests/settings-browser.cjs
```

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `PLAYWRIGHT_MODULE` | Module name or absolute path used to load an external Playwright installation. |
| `PLAYWRIGHT_BROWSERS_PATH` | Browser installation location recognized by Playwright. |
| `ROUNDED_ADMIN_SCREENSHOT` | Screenshot output file for the top-bar test. |
| `TOOLBAR_SCREENSHOT_DIR` | Existing screenshot output directory for the front-end test. |
| `ADMINLUME_ASSET_OVERRIDE` | Set to `1` to serve this checkout's front-end CSS/JS through Playwright routes without modifying the local site's installed plugin. This does not replace or test the installed PHP implementation. |
| `AXE_MODULE` | Optional module name/path for development-only `axe-core`; scans the settings panel for WCAG A/AA findings. |
| `ADMINLUME_SETTINGS_SCREENSHOT` | Optional screenshot output path for the settings test. |

Set `ADMINLUME_WP_ROOT` explicitly for a standalone checkout; the scripts' default path assumes a nested WordPress layout. Node.js and Playwright are development tools only and are not plugin runtime dependencies.

The settings test requires the explicit Compose root and a local environment. It creates a temporary administrator, verifies opt-in, labels, keyboard save, preference persistence, focus styling, mobile layout, and opt-out, then removes that test account in cleanup. It does not modify existing users. Optional axe coverage is limited to `.ra-preferences`, not a complete accessibility audit. Set `COMPOSE_PROJECT_NAME` if the fixture uses a named Compose project.

For PHP checks without replacing the local site's installed plugin files, use a read-only mount for the one-off CLI container (replace the host path):

```bash
docker compose run --rm --volume /absolute/path/to/adminlume:/var/www/html/wp-content/plugins/adminlume:ro wpcli wp eval-file /var/www/html/wp-content/plugins/adminlume/tests/integration.php
```

Run that command from the site's Compose directory. The HTTP server remains unchanged; combine this with the explicit browser asset override when you need to test checkout PHP and browser assets separately. Full end-to-end validation still requires the same revision installed in the HTTP test environment.

### Syntax and standards checks

With PHP and Node.js installed, run from the repository root:

```bash
find . -path './.git' -prune -o -name '*.php' -exec php -l {} \;
node --check assets/js/sidebar.js
node --check assets/js/frontend-toolbar.js
node --check tests/topbar-browser.cjs
node --check tests/frontend-toolbar-browser.cjs
git diff --check
```

Syntax checks do not execute WordPress or establish WordPress Coding Standards compliance. See [CONTRIBUTING.md](../CONTRIBUTING.md) for standards and review expectations.

Run the full runtime PHP standard with:

```bash
composer install
composer lint
```

Composer tools are development-only and are never packaged. Run official Plugin Check against the **installed ZIP**, not the repository (which includes tests and development files). Include runtime checks with its bootstrap:

```bash
wp plugin check adminlume --require=./wp-content/plugins/plugin-check/cli.php --format=json
```

The Plugin Check plugin must be installed in that isolated test site. Record the tool and WordPress/PHP versions, results, and any remaining findings. See the [directory submission guide](wordpress-org.md).

## Manual regression checklist

- Confirm that new users and opted-out users retain the native interface and receive no skin assets.
- Verify preference isolation between accounts, invalid input handling, and legacy preference fallback.
- Test the dashboard, classic editor, block editor, media library and dialogs, and any supported custom plugin screens.
- With WooCommerce installed, test products, categories, orders including HPOS, and other relevant WooCommerce screens.
- Check expanded/collapsed navigation, sidebar scrolling, flyouts near viewport edges, menu search, and clearing with keyboard input.
- Check keyboard focus, `Cmd+K` / `Ctrl+K`, Escape, toolbar menus, hide/reopen focus restoration, touch input, and reduced motion.
- Check desktop, tablet, narrow mobile, RTL, light/dark personal backgrounds, and blocked JavaScript or browser storage.
- Verify front-end dock placement, guest pages, a hidden native toolbar, theme switching, and absence of admin assets on public pages.
- Deactivate and reactivate the plugin; confirm native appearance is restored while preferences remain available.

Record the actual WordPress, PHP, browser, theme, and plugin versions tested. Do not claim compatibility with untested releases or full accessibility conformance based only on these checks.
