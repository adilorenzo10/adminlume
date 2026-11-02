=== Adminlume ===
Tags: admin, dashboard, toolbar, customization
Requires at least: 6.5
Requires PHP: 8.1
Stable tag: 0.3.7
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html

A lightweight, opt-in WordPress admin interface and front-end toolbar dock with personal appearance preferences.

== Description ==

Adminlume by Dilorsoft gives the WordPress admin area a compact sidebar, rounded panels, and personal colors. On the public site, the native toolbar becomes a bottom dock for logged-in users who opt in.

The plugin is disabled by default for each user. It does not change roles, capabilities, menu order, store data, or the experience of anonymous visitors. No particular theme or WooCommerce installation is required.

Features include:

* Personal accent color, sidebar background, and panel corner radius.
* Independently scrolling desktop navigation and menu-only search.
* Native WordPress navigation, permissions, and responsive controls.
* Conditional styles for media dialogs and relevant WooCommerce screens.
* A translucent charcoal front-end dock with separate native site and account actions.
* Native actions preserved in responsive menus, with keyboard-accessible hide and reopen controls.
* Native WordPress update notices and optional automatic updates from stable GitHub releases.
* No runtime build step, remote fonts, or tracking.

Preferences are stored in user metadata. Dock visibility uses browser local storage when available. Existing WordPress and third-party toolbar links and resources remain subject to their own behavior and privacy policies.

Update checks contact the official public GitHub repository and its download CDN over HTTPS. Requests are cached and do not include account details, the site URL, or installed-version parameters. GitHub receives normal connection information such as the server IP address. Package downloads use WordPress's HTTP API, whose default user agent may include WordPress and site information. See https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement for GitHub's privacy policy.

The current settings interface uses Italian labels. This English readme does not include an English interface translation.

Adminlume was previously known as Rounded Admin. Legacy preferences are read as a fallback; saving new preferences does not delete the old metadata.

== Installation ==

1. Upload the adminlume folder to /wp-content/plugins/.
2. Activate Adminlume from the Plugins screen.
3. Open Users > Adminlume, or Profile > Adminlume if your account cannot list users.
4. Select "Abilita Adminlume per me" (enable Adminlume for me).
5. Choose your appearance preferences and select "Salva preferenze" (save preferences).

WordPress 6.5 or later and PHP 8.1 or later are required. Test on a local or staging site before deployment.

== Frequently Asked Questions ==

= How do updates work? =

After installing an updater-enabled version, keep Adminlume active. Stable releases with an update manifest appear through WordPress's normal plugin update checks. Use Dashboard > Updates > Check again to request a check; GitHub metadata is cached for up to six hours. Enable automatic updates on the Plugins screen if desired. Adminlume does not force that setting or bypass site policies and compatibility checks.

Version 0.2.0 does not contain the updater. Upload and replace it once with the first updater-enabled release, then later releases can be detected normally. No WordPress.org listing or GitHub token is required for the public release feed.

= Does activation change the interface for everyone? =

No. Each user must opt in independently. There is no site-wide appearance setting.

= Does Adminlume require WooCommerce or a specific theme? =

No. WooCommerce styles load only on relevant screens. The front-end dock belongs to the plugin and does not require theme support or a theme build step.

= Does menu search find posts, products, or orders? =

No. It filters existing menu and submenu labels in the desktop layout. Cmd+K or Ctrl+K focuses the search field; Escape clears the filter.

= Does the dock appear for visitors or when my toolbar is disabled? =

No. It is only enabled for logged-in, opted-in users whose native toolbar is visible.

= What happens when I deactivate or delete the plugin? =

Deactivation restores the native appearance and retains personal preferences. The plugin currently has no uninstall cleanup routine, so deleting the plugin does not automatically remove its stored user metadata.

= Is every third-party plugin screen supported? =

No. Native WordPress surfaces are the primary target. The block editor retains its own controls, and arbitrary React applications or fully custom plugin screens are not comprehensively restyled. Test your theme and plugin combination before deployment.

== Copyright and License ==

Copyright (c) 2026 Dilorsoft.

Adminlume is free and open-source software licensed under the GNU General Public License, version 2 or (at your option) any later version. You may use, modify, fork, redistribute, and sell it under those terms. Preserve required notices and comply with the applicable source-code and derivative-work requirements.

The software is distributed without warranty. See LICENSE for the complete license and COPYRIGHT.md for attribution guidance.

The software license grants no separate trademark license. Independent forks must not be misleadingly presented as official Dilorsoft releases. See TRADEMARKS.md; that policy does not add restrictions to GPL rights or assert trademark registration.

== Changelog ==

= 0.3.7 =

* Add plugin icons and WordPress.org submission documentation.

= 0.3.5 =

* Keep the collapsed toolbar reopen control dark on hover, keyboard focus, and press, with a visible white icon.
* Add a release-preparation command to synchronize plugin version, Stable tag, and changelog before tagging.

= 0.3.3 =

* Restore the original translucent front-end dock, separate desktop actions, and hide/reopen controls.
* Preserve native action labels, destinations, and metadata while retaining the GitHub updater.
* Align the plugin and release metadata and improve version-mismatch diagnostics.

= 0.3.0 =

* Integrate stable GitHub releases with native WordPress plugin update checks and plugin details.
* Respect the site's automatic-update preferences and WordPress/PHP compatibility checks.
* Verify update ZIP checksums before installation and cache release metadata.

= 0.2.0 =

* Per-user admin appearance preferences and an independent front-end toolbar dock.
* Compatibility fallback for existing Rounded Admin preferences.

== Upgrade Notice ==

= 0.3.3 =

Restores the original front-end toolbar appearance without changing the backend or native updater. Sites still running 0.2.0 must install an updater-enabled release manually once.

= 0.3.0 =

Install this updater-enabled version manually over 0.2.0 once. Later stable GitHub releases can then appear in WordPress. Automatic installation remains opt-in through the native Plugins screen.

= 0.2.0 =

Existing Rounded Admin preferences remain available as a fallback. Test upgrades on a local or staging installation before deploying to production.
