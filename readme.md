# Adminlume

A lightweight WordPress admin interface and front-end toolbar dock by **Dilorsoft**, formerly known as Rounded Admin.

Adminlume adds a dark sidebar, rounded panels, and compact controls without requiring WooCommerce, a particular theme, or site-specific code. It changes presentation, not roles, capabilities, menu order, or store data.

## Requirements

- WordPress 6.5 or later.
- PHP 8.1 or later.
- No build step, JavaScript framework, or Node.js dependency at runtime.

Minimum requirements are not a claim of testing against every later release. Validate your WordPress, theme, and plugin combination on a local or staging site before deployment.

## Installation

Download the installable `adminlume-X.Y.Z.zip` asset from [GitHub Releases](https://github.com/adilorenzo10/adminlume/releases) and upload it through **Plugins → Add New Plugin → Upload Plugin**, or install manually:

1. Copy the `adminlume` directory to `wp-content/plugins/`.
2. Activate **Adminlume** on the **Plugins** screen.
3. Open **Users → Adminlume**, or **Profile → Adminlume** if you cannot list users.
4. Enable Adminlume for your account and save your preferences.

Adminlume is disabled by default for each user. Each account opts in independently; there is no site-wide appearance setting. Select **Enable Adminlume for me** and **Save preferences** (or their translations in your WordPress language).

The interface uses English source strings and includes an Italian (`it_IT`) translation. WordPress chooses the active locale: the admin area respects the user's language preference, while the public site follows WordPress's front-end locale. Unsupported locales fall back to English. See [translation maintenance](docs/translations.md).

## Personal preferences

| Preference | Default | Behavior |
| --- | --- | --- |
| Enable Adminlume | Disabled | Applies the skin only to the current user. |
| Sidebar and top bar background | `#000000` | Adjusts the admin header, sidebar, scrollbar track, and workspace corners. Text, icons, search, and interaction states adapt to a light or dark palette. |
| Accent color | `#303030` | Controls the admin accent independently of the sidebar background. Black or white button text is selected using relative luminance. |
| Panel corner radius | `16px` | Accepts `8px`, `12px`, or `16px`. |

The front-end dock retains its own dark presentation. Disabling the personal preference or deactivating the plugin restores the native interface. Deactivation retains user preferences for later reactivation. The plugin currently has no uninstall cleanup routine; do not assume deletion removes stored preferences.

## Plugin updates

The **0.4.0 directory edition** removes the GitHub updater and external `Update URI`. It relies on WordPress.org's native update channel once the plugin is approved, published under its approved slug, and a newer directory release exists. This repository and ZIP preparation do not imply directory approval. Until publication, install reviewed ZIPs manually on staging.

**One-time migration:** users of the older GitHub edition must manually replace it with the approved directory edition once. Keep the same `adminlume/` folder and do not uninstall first; personal preferences are retained. Removing the external updater does not automatically migrate existing installations or publish anything to WordPress.org.

Automatic installation remains controlled by WordPress and site policies. GitHub remains the development repository and source/archive host only, not an updater inside the installed plugin. See [updates and migration](docs/updates.md).

## Features

### Admin navigation

- Fixed desktop/tablet sidebar with independent scrolling and a thin native scrollbar. Persistent scrollbar visibility also depends on operating-system preferences.
- A separate, non-scrolling desktop header with a clickable site name and the native collapse control. Original WordPress nodes are moved, not cloned, and restored for the native mobile layout.
- Compact 32px desktop menu rows, system typography, local outline SVG icons for standard menu items, and unchanged icons for unknown plugins.
- A 52px collapsed desktop sidebar, with 180ms layout transitions disabled when reduced motion is requested.
- Individually rounded submenu rows with a 1px gap. A selected submenu item receives the highlight; its parent remains a neutral heading. The collapsed section icon remains highlighted for orientation.
- Menu search filters existing menu and submenu labels only. It does not query posts, products, orders, or the database. `Cmd+K` / `Ctrl+K` focuses search; Escape clears the filter. A keyboard-accessible clear button keeps focus in the field.
- Search is available in the desktop layout, not the native tablet auto-fold or mobile menu. Native menu order, capabilities, collapse state, and responsive controls remain WordPress-owned.

### Admin surfaces and toolbar

- Rounded native panels, Help and Screen Options panels, tabs, pagination, and media dialogs. Mobile full-screen media dialogs remain edge-to-edge.
- Separate WooCommerce styles loaded only on relevant screens, without making WooCommerce a required dependency.
- A full-width desktop toolbar with square outer edges, 10px horizontal padding, 26px controls centered inside the native 32px bar, and dropdowns anchored below it.
- Native mobile toolbar dimensions and primary touch targets of at least 44px are preserved where styled.
- The site name moves to the admin sidebar header; the WordPress logo and site-name nodes are removed from the admin toolbar only for opted-in users. Both remain available in the front-end dock.
- Native menu separators are visually hidden without changing item order or permissions.

### Front-end dock

- The original translucent charcoal dock, centered 20px above the viewport bottom, with rounded corners, blur, a subtle border, and individually rounded controls.
- Separate WordPress, site-name, Live status (when available), and Dashboard actions on desktop, alongside native customization, comments, New, edit, and account links.
- Native edit labels and destinations remain unchanged; the edit action retains its original orange accent. The account greeting and name remain visible on desktop and become compact on smaller screens.
- Secondary and third-party actions remain available in More. The compact layout also groups customization, comments, New, Dashboard, and status without duplicating their original nodes.
- The original labeled Hide control and 44px reopen button preserve focus and saved visibility preferences. Animation lasts 180ms and respects reduced motion.
- Upward-opening menus retain keyboard navigation and viewport positioning. The plugin does not automatically hide the dock when a site control receives focus.
- No reserved toolbar space at the top of the page and no intentional changes to the public header or content.
- No skin assets for anonymous visitors, opted-out users, or users whose native toolbar is hidden.

## Compatibility and accessibility

Admin CSS is scoped to `body.rounded-admin` and native controls. The block editor retains its canvas and controls; the sidebar enhancement is not loaded in the block editor. Network admin and user admin screens are excluded from the admin skin.

Keyboard focus indicators, native WordPress breakpoints, and native collapsed-menu behavior are preserved. RTL layouts retain the native menu width. Panels are not clipped, so contextual menus and Select2 controls can extend beyond them. Sidebar enhancements fall back to native behavior on mobile, in the block editor, or without JavaScript.

Adminlume does not attempt to restyle arbitrary React application internals or completely custom plugin pages. A CSS skin cannot guarantee universal visual compatibility or complete accessibility conformance. Test third-party screens and assistive-technology workflows before release.

## Privacy and security

- Preferences are stored in WordPress user metadata and apply only to the current account.
- Saving uses the authenticated WordPress POST handler, the `read` capability, and a nonce tied to the current user. No client-supplied user ID is accepted.
- Colors are validated as hexadecimal values, panel radii use an allowlist, and rendered settings values are escaped.
- The plugin adds no tracking, remote fonts, custom scheduled tasks, or custom database tables. Preferences should not contain secrets.
- Adminlume makes no plugin-initiated external update requests. WordPress's own directory update services retain their normal behavior; no custom GitHub update/download hooks are registered.
- Existing WordPress or third-party toolbar features may retain their own external links or resources; Adminlume does not replace their privacy policies.

## Developer documentation

- [Development, architecture, and testing](docs/development.md)
- [Front-end toolbar behavior and compatibility](docs/frontend-toolbar.md)
- [Automated releases and installable ZIPs](docs/releases.md)
- [Native WordPress updates](docs/updates.md)
- [Translations and WordPress internationalization](docs/translations.md)
- [Plugin icon and WordPress.org submission checklist](docs/wordpress-org.md)
- [Contributing and commit conventions](CONTRIBUTING.md)
- [WordPress plugin readme](readme.txt)

## Rounded Admin compatibility

The PHP namespace is `Adminlume` and the text domain is `adminlume`. New preferences use `adminlume_preferences`. If that key does not exist, `rounded_admin_preferences` is read as a fallback. Saving writes the new key without deleting the legacy one; an explicit new opt-out takes precedence over legacy opt-in.

Internal `rounded-admin`, `ra-*`, and `nzm-*` identifiers, asset handles, and dock storage keys are intentionally retained for compatibility. They do not require Rounded Admin, the Nerd Zone theme, or any other theme.

## License

Copyright (c) 2026 Dilorsoft. Adminlume is free and open-source software licensed under **GPL-2.0-or-later**: GNU GPL version 2 or, at your option, any later version. See [LICENSE](LICENSE) for the full terms and [COPYRIGHT.md](COPYRIGHT.md) for attribution and redistribution guidance.

You may use, modify, fork, redistribute, and sell the software under the GPL. Preserve required notices and comply with the license's source-code and derivative-work obligations. The software is provided without warranty.

The software license does not grant a separate trademark license. See [TRADEMARKS.md](TRADEMARKS.md) for guidance on distinguishing independent forks from official Adminlume releases. This does not restrict the freedoms granted by the GPL or claim that a trademark is registered.
