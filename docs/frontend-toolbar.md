# Front-end toolbar

Adminlume enhances the existing `#wpadminbar` only for logged-in users who opted in and whose native toolbar is visible. It does not render a second toolbar, change the theme, or load front-end dock styles in `wp-admin`.

## Restored appearance and layout

The front-end dock uses the original appearance from before the compact, three-section redesign: a translucent charcoal gradient with blur, 22px corners on desktop, a subtle border and inset highlight, and individually rounded controls. It is centered 20px above the bottom of the viewport, or above the device's bottom safe-area inset when larger. Desktop minimum height is 56px; the mobile layout uses a 50px minimum height and 18px corners.

WordPress, site name, WooCommerce Live/status when available, a Search button for the command palette, Dashboard, customization, comments, New, edit, and account actions are separate on desktop. Native labels, destinations, permissions, and nested menus are preserved. The edit action uses the original orange accent; there is no new homepage customization promotion. The native account greeting and name are visible on desktop, with a compact avatar presentation on smaller screens. Since 0.5.1 the account menu adds an Adminlume preferences link before Log Out, matching the admin header.

The native Comments node is shown only when comments await moderation; with nothing to review it is omitted and Comments stays reachable from the palette. The native search form node is removed because the palette offers site search.

The compact layout activates at 1100px or when desktop content would overflow. It retains WordPress, site name, Search, edit, and account directly in the dock and groups other actions in More. If the compact dock still overflows (small phones, touch targets), the WordPress logo and then the site name move into More as well; Search, edit, account, and Hide always stay visible. Original nodes are moved, not cloned, and return to their native groups when switching back to desktop. On small phones the edit label is visually reduced to an icon while retaining its native text for accessibility.

On touch screens (`pointer: coarse`) primary dock controls and menu rows are 44px tall. The account avatar stays inside its control: WordPress's mobile rules, which shrink the link and position the avatar absolutely, are overridden for the dock only.

When WordPress supplies a site icon, it stays inline beside the site title at 20px. The dock overrides native mobile absolute positioning and theme block-image rules only for that icon; long titles retain a single-line ellipsis. Logical spacing supports both LTR and RTL layouts.

## Command palette

The dock uses the same command palette as the admin header (`assets/js/palette.js`, `assets/css/palette.css`). It opens from the Search button or with `Cmd+K` / `Ctrl+K` and indexes:

- **Create:** the native New menu.
- **Site:** dock actions such as edit, customization, comments, and the site menu.
- **Go to:** a snapshot of the admin menu WordPress built for the same user during their last admin visit. `Chrome::remember_menu()` stores only labels and admin URLs in a per-site, per-user transient (`adminlume_menu_{blog_id}_{user_id}`) that expires after a day and is deleted on logout. `FrontendToolbar::menu_for_script()` passes on only same-site admin URLs with plain-text labels. Until the user visits the admin once, this group is empty.
- **Notifications and tools:** links from other plugins' toolbar nodes.
- **Account:** the account menu links.
- **Search the site for "…":** always offered for a non-empty query; it opens the theme's standard `?s=` search results.

The palette is a modal dialog following the ARIA combobox/listbox pattern, restores focus on close, and carries a theme-independent baseline so public theme styles for lists, inputs, and `kbd` do not leak into it.

## Menus and visibility

Menus open upward and are positioned inside the viewport with scrollable contents. Native menu hover/focus behavior, Arrow keys, Home/End, and Escape support remain available. More toggles on click or tap, and clicking outside closes open menus. A CSS fallback retains native links and menus when JavaScript is unavailable.

The original **Hide** control is restored, including its desktop text label and local SVG visibility icon. It hides the dock and displays a 44px floating reopen button. Focus moves between the hide and reopen controls; the hidden dock becomes inert. Visibility transitions last 180ms and are skipped for reduced-motion preferences. Quick reopening cancels the outgoing animation.

The existing `rounded-admin-dock-{blog_id}-{user_id}` browser storage key and `hidden` / `visible` values are unchanged. Controls work even when storage is unavailable. Visibility is a per-browser preference, not a server-synchronized setting. The dock no longer compresses automatically when a site control receives focus.

A floating overlay can cover site elements. At the very end of a scrollable page, where covered content (often the footer) could not be scrolled into view, the dock slides away; scrolling up or moving keyboard focus into it brings it back, and reduced-motion preferences skip the transition. Use Hide when needed and test sticky carts, chat widgets, cookie banners, and mobile interactions on the actual site. The plugin does not add layout padding to the theme or reposition its controls.

## Scope and validation

The restored front-end toolbar remains in the directory edition. The update-source migration is separate from its appearance: WordPress.org owns future updates and the external GitHub updater has been removed. Personal preferences and compatibility keys remain unchanged. Existing tags and release assets are not rewritten.

See [development.md](development.md) for test setup. Browser checks cover the restored appearance, separate desktop actions, the command palette (button, shortcut, site search, focus return), the end-of-page behavior, native menu navigation, late plugin nodes and handlers, saved visibility, responsive grouping, native URLs, reduced motion, touch hide/reopen controls, blocked storage, no-JavaScript fallback, guests, and backend isolation. PHP checks verify that native action labels, destinations, and metadata remain unchanged.

On core versions that supply a native site-icon menu title, the browser suite generates that markup using request-local filters, then tests it in the browser without saving site options. Cases include short/long titles with and without icons, theme block-image CSS, five viewport widths, and LTR/RTL directions.

Third-party code that assumes a fixed top-level DOM parent may require adaptation. These checks do not establish compatibility with every theme, plugin, browser, or assistive technology. Verify the exact deployment combination before release.
