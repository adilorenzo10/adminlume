# Adminlume

A lightweight WordPress admin interface and front-end toolbar dock by **Dilorsoft**, formerly known as Rounded Admin.

Adminlume adds a dark sidebar, rounded panels, and compact controls without requiring WooCommerce, a particular theme, or site-specific code. It changes presentation, not roles, capabilities, menu order, or store data.

## Requirements

- WordPress 6.5 or later.
- PHP 8.1 or later.
- No build step, JavaScript framework, or Node.js dependency at runtime.

Minimum requirements are not a claim of testing against every later release. Validate your WordPress, theme, and plugin combination on a local or staging site before deployment.

## Installation

1. Copy the `adminlume` directory to `wp-content/plugins/`.
2. Activate **Adminlume** on the **Plugins** screen.
3. Open **Users → Adminlume**, or **Profile → Adminlume** if you cannot list users.
4. Enable Adminlume for your account and save your preferences.

Adminlume is disabled by default for each user. Each account opts in independently; there is no site-wide appearance setting. The current settings interface uses Italian labels, including **Abilita Adminlume per me** (enable) and **Salva preferenze** (save). English documentation does not change the interface language.

## Personal preferences

| Preference | Default | Behavior |
| --- | --- | --- |
| Enable Adminlume | Disabled | Applies the skin only to the current user. |
| Sidebar and top bar background | `#000000` | Adjusts the admin header, sidebar, scrollbar track, and workspace corners. Text, icons, search, and interaction states adapt to a light or dark palette. |
| Accent color | `#303030` | Controls the admin accent independently of the sidebar background. Black or white button text is selected using relative luminance. |
| Panel corner radius | `16px` | Accepts `8px`, `12px`, or `16px`. |

The front-end dock retains its own dark presentation. Disabling the personal preference or deactivating the plugin restores the native interface. Deactivation retains user preferences for later reactivation. The plugin currently has no uninstall cleanup routine; do not assume deletion removes stored preferences.

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

- A 56px pill-shaped bottom dock, up to 850px wide, centered 22px above the safe area, with a solid `#17181B` background, a soft shadow, and no light halo.
- Three sections: a site dropdown with native WordPress links, site name, Live status when available, and Dashboard; contextual editing and New actions; and an avatar account menu with profile, preferences, and logout.
- Native edit labels follow the current post type (page, post, product, or a registered custom type). On the homepage, an existing Customizer action is promoted if no native edit action exists. No edit URL or permission is invented.
- Comments, customization, and third-party controls remain available in More. On narrow screens, New also moves there; the primary action becomes an accessible icon on small phones.
- Collapse and expand controls leave an always-available floating pill, preserve focus, and honor reduced motion. The existing per-user browser storage key is retained.
- Menus open upward, support keyboard and touch input, and stay within the viewport. Focused site controls under the dock trigger temporary compression without overwriting the saved preference or changing the site layout.
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
- The plugin adds no tracking, remote fonts, external HTTP requests, scheduled tasks, or custom database tables. Preferences should not contain secrets.
- Existing WordPress or third-party toolbar features may retain their own external links or resources; Adminlume does not replace their privacy policies.

## Developer documentation

- [Development, architecture, and testing](docs/development.md)
- [Front-end toolbar behavior and compatibility](docs/frontend-toolbar.md)
- [Contributing and commit conventions](CONTRIBUTING.md)
- [WordPress plugin readme](readme.txt)

## Rounded Admin compatibility

The PHP namespace is `Adminlume` and the text domain is `adminlume`. New preferences use `adminlume_preferences`. If that key does not exist, `rounded_admin_preferences` is read as a fallback. Saving writes the new key without deleting the legacy one; an explicit new opt-out takes precedence over legacy opt-in.

Internal `rounded-admin`, `ra-*`, and `nzm-*` identifiers, asset handles, and dock storage keys are intentionally retained for compatibility. They do not require Rounded Admin, the Nerd Zone theme, or any other theme.

## License

Copyright (c) 2026 Dilorsoft. Adminlume is free and open-source software licensed under **GPL-2.0-or-later**: GNU GPL version 2 or, at your option, any later version. See [LICENSE](LICENSE) for the full terms and [COPYRIGHT.md](COPYRIGHT.md) for attribution and redistribution guidance.

You may use, modify, fork, redistribute, and sell the software under the GPL. Preserve required notices and comply with the license's source-code and derivative-work obligations. The software is provided without warranty.

The software license does not grant a separate trademark license. See [TRADEMARKS.md](TRADEMARKS.md) for guidance on distinguishing independent forks from official Adminlume releases. This does not restrict the freedoms granted by the GPL or claim that a trademark is registered.
