# Front-end toolbar

Adminlume enhances the existing `#wpadminbar` only for logged-in users who opted in and whose native toolbar is visible. It does not render a second toolbar, change the theme, or load front-end dock styles in `wp-admin`.

## Restored appearance and layout

The front-end dock uses the original appearance from before the compact, three-section redesign: a translucent charcoal gradient with blur, 22px corners on desktop, a subtle border and inset highlight, and individually rounded controls. It is centered 20px above the bottom of the viewport, or above the device's bottom safe-area inset when larger. Desktop minimum height is 56px; the mobile layout uses a 50px minimum height and 18px corners.

WordPress, site name, WooCommerce Live/status when available, Dashboard, customization, comments, New, edit, and account actions are separate on desktop. Native labels, destinations, permissions, and nested menus are preserved. The edit action uses the original orange accent; there is no new homepage customization promotion. The native account greeting and name are visible on desktop, with a compact avatar presentation on smaller screens. No extra Adminlume preferences link is added to the account menu; personal preferences remain under Users or Profile as before.

The compact layout activates at 1100px or when desktop content would overflow. It retains WordPress, site name, edit, and account directly in the dock and groups other actions in More. Original nodes are moved, not cloned, and return to their native groups when switching back to desktop. On small phones the edit label is visually reduced to an icon while retaining its native text for accessibility.

When WordPress supplies a site icon, it stays inline beside the site title at 20px. The dock overrides native mobile absolute positioning and theme block-image rules only for that icon; long titles retain a single-line ellipsis. Logical spacing supports both LTR and RTL layouts.

## Menus and visibility

Menus open upward and are positioned inside the viewport with scrollable contents. Native menu hover/focus behavior, Arrow keys, Home/End, and Escape support remain available. More toggles on click or tap, and clicking outside closes open menus. A CSS fallback retains native links and menus when JavaScript is unavailable.

The original **Hide** control is restored, including its desktop text label and local SVG visibility icon. It hides the dock and displays a 44px floating reopen button. Focus moves between the hide and reopen controls; the hidden dock becomes inert. Visibility transitions last 180ms and are skipped for reduced-motion preferences. Quick reopening cancels the outgoing animation.

The existing `rounded-admin-dock-{blog_id}-{user_id}` browser storage key and `hidden` / `visible` values are unchanged. Controls work even when storage is unavailable. Visibility is a per-browser preference, not a server-synchronized setting. The dock no longer compresses automatically when a site control receives focus.

A floating overlay can cover site elements. Use Hide when needed and test sticky carts, chat widgets, cookie banners, and mobile interactions on the actual site. The plugin does not add layout padding to the theme or reposition its controls.

## Scope and validation

The restored front-end toolbar remains in the directory edition. The update-source migration is separate from its appearance: WordPress.org owns future updates and the external GitHub updater has been removed. Personal preferences and compatibility keys remain unchanged. Existing tags and release assets are not rewritten.

See [development.md](development.md) for test setup. Browser checks cover the restored appearance, separate desktop actions, native menu navigation, late plugin nodes and handlers, saved visibility, responsive grouping, native URLs, reduced motion, touch hide/reopen controls, blocked storage, no-JavaScript fallback, guests, and backend isolation. PHP checks verify that native action labels, destinations, and metadata remain unchanged.

On core versions that supply a native site-icon menu title, the browser suite generates that markup using request-local filters, then tests it in the browser without saving site options. Cases include short/long titles with and without icons, theme block-image CSS, five viewport widths, and LTR/RTL directions.

Third-party code that assumes a fixed top-level DOM parent may require adaptation. These checks do not establish compatibility with every theme, plugin, browser, or assistive technology. Verify the exact deployment combination before release.
