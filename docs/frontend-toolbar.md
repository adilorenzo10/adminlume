# Front-end toolbar

Adminlume enhances the existing `#wpadminbar` only for logged-in users who opted in and whose native toolbar is visible. It does not render a second toolbar, change the theme, or load front-end dock styles in `wp-admin`.

## Layout and actions

- **Shell:** 56px tall, content-sized up to 850px, fully rounded, `#17181B`, subtle border, soft shadow. Bottom spacing is 22px plus the device safe-area inset. Visual viewport changes account for an on-screen keyboard.
- **Site:** a single generated dropdown contains the original WordPress, site-name, WooCommerce status (when present), and capability-checked Dashboard nodes. Existing nested menus and links remain attached to those nodes.
- **Quick actions:** the original edit node remains the primary action. Its label uses the queried post type's native `edit_item` label, including custom post types. Its destination and metadata are not replaced. If the homepage has no edit action, an existing native Customizer action is promoted and labeled “Customize site”; no unsupported action is created.
- **More:** comments, customization when not primary, search, and other plugin actions are grouped without cloning their elements. On screens up to 600px, New moves here too. A width-based fallback also groups New if desktop content would overflow.
- **Account:** the native account link is presented as a 44px avatar control. The greeting is visually hidden while the account menu remains intact. A local Dashicon is used if the avatar is unavailable. An Adminlume preferences link is added for users with `read`, under Users or Profile according to their capabilities.

On small phones, the edit action uses an icon while retaining an accessible name and a native title tooltip. Site names are truncated visually; the full site name remains in the dropdown. Native IDs, destinations, and plugin handlers are retained. Third-party code that assumes its node is always a direct child of a particular top-level list may need adaptation; no generic regrouping implementation can guarantee compatibility with every DOM-dependent extension.

## Interaction

- Buttons and menu rows have touch targets of at least 44px.
- Generated dropdown buttons toggle on click or tap. Native links keep their destinations and modified-click behavior. Touch opens nested native menus before following their links.
- Arrow keys enter menus and move between entries; Home and End move to the first and last entry. Right Arrow opens a nested menu. Escape or Left Arrow closes the current level and returns focus to its trigger.
- Tab remains available for normal navigation. Input fields keep their editing keys. Clicking outside closes menus.
- Native title tooltips, visible focus indicators, subdued hover states, and 180ms transitions provide feedback. Reduced motion disables transitions and collapse animation.

Menus are viewport-clamped, open above the dock, and have independently scrollable contents. Native menu links remain available through a CSS fallback when JavaScript is unavailable.

## Compression and saved preferences

The minus control replaces the expanded toolbar with a 72px-wide, 44px-tall pill. The pill remains visible and restores the toolbar on activation. Focus moves between the two controls; the collapsed toolbar is inert so its hidden actions cannot receive focus.

The existing `rounded-admin-dock-{blog_id}-{user_id}` browser storage key and `hidden` / `visible` values are retained for compatibility. An old hidden preference now displays the compact pill. This is a per-browser preference, not a server-synchronized account setting; controls continue working if storage is blocked.

When a site control receives focus underneath the toolbar, the dock compresses without taking focus, scrolling the page, or overwriting the user's stored choice. The pill moves toward a viewport edge if necessary to reduce overlap with that focused control. Expansion is explicit; the dock does not unexpectedly reopen during form entry.

**Overlap limitation:** an overlay cannot guarantee that it never covers arbitrary site controls while also leaving the site's layout untouched. Safe-area spacing, compact sizing, focus-triggered compression, and the persistent pill mitigate this without adding padding to the theme or moving its controls. Test sticky carts, chat widgets, cookie banners, full-screen dialogs, and virtual keyboards on the actual site.

## Validation

See [development.md](development.md) for local setup and test commands. Browser coverage includes native-node preservation, late plugin controls, nested menu handlers, keyboard and touch navigation, widths down to 320px, RTL layout, compression persistence, blocked storage, reduced motion, no-JavaScript fallback, guests, and backend isolation. PHP integration coverage checks contextual labels and preservation of native action metadata separately.

These checks do not establish compatibility with every WordPress theme, plugin, browser, or assistive technology. Verify the exact deployment combination before release.
