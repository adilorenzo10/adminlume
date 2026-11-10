# Adminlume 0.4.1: initial Plugins Team review corrections

Date: 2026-11-10. This report follows the initial WordPress.org review of the submitted 0.4.0 ZIP. The submission remains pending. The reviewed corrections were subsequently committed at the maintainer's request. No corrected ZIP was uploaded, email sent, tag changed, release published, or push performed by the agent during this correction task.

## Reported issues and corrections

### Translation catalogs in the package

The builder now excludes the entire development `languages/` directory, including PO, MO, POT, PHP, and JSON files. The runtime no longer declares a bundled `Domain Path` or registers a custom textdomain path. Literal English gettext strings and the `adminlume` text domain are unchanged.

WordPress loads separately installed language packs from its standard global language directory. Development Italian catalogs remain in the source repository for translation maintenance and test fixtures only. They are not shipped in the ZIP. Italian plugin labels will therefore require an available, approved WordPress.org language pack after publication; otherwise the English fallback is expected. Repository catalogs are not evidence that a directory language pack has been approved.

### Late escaping of generated inline CSS

All runtime output sites were inspected, including settings HTML, sidebar output, toolbar nodes, script localization, and both previously reported inline-style calls. The dynamic selector parameter was removed; the scope is now the literal `body.rounded-admin`. Custom properties are assembled from validated hexadecimal colors, an allowed integer radius, and fixed light/dark palettes. The declaration text passes through `safecss_filter_attr()` and is escaped with `esc_html()` directly at the single `wp_add_inline_style()` output boundary. This keeps CSS filtering separate from HTML escaping and prevents generated declaration text from ending the style element.

No PHPCS/Plugin Check suppressions were added for this change. The existing HTML/URL/attribute outputs retain their context-specific escaping. PHP-localized script labels still use WordPress's JSON serialization rather than HTML entities, which would be incorrect for plain-text JavaScript labels.

## Isolated verification

Two new Docker projects were created with separate database and WordPress volumes, localhost-only ports, `WP_DEBUG=true`, `WP_DEBUG_LOG=true`, and debug display disabled. The reviewed artifact was installed from the ZIP; runtime tests did not load the source checkout as the plugin. No customer/local installation or prior release/tag was changed.

| Check | Environment | Result |
| --- | --- | --- |
| Official Plugin Check, static and runtime | WordPress 7.1.4, PHP 8.3.32, Plugin Check 2.2.0 | No findings; no checks disabled |
| Full WordPress Coding Standards | WPCS 3.4.1, PHP_CodeSniffer 3.13.6 | Five runtime files pass with zero errors/warnings |
| Standalone Python suite | Packaging, metadata, development gettext consistency | 25 tests pass |
| PHP integration | Clean WordPress 7.1.4, PHP 8.3.32 and PHP 8.1.34 CLI | 70 checks pass on each PHP version |
| Minimum-version PHP integration | Clean WordPress 6.5, PHP 8.1.34 | 70 checks pass |
| English/Italian locale switching without plugin language pack | Both WordPress versions and the PHP combinations above | 22 checks pass per run; English fallback confirmed |
| English/Italian locale switching with external test language pack | Both WordPress versions and the PHP combinations above | 22 checks pass per run; standard-directory Italian loading confirmed |
| Settings browser regression | Both WordPress versions, Chromium 158.0.8127.18 / Playwright 1.65.0 | 14 checks pass per version |
| Frontend toolbar browser regression | WordPress 7.1.4, Chromium | 34 checks pass on clean site without WooCommerce |
| Deactivation/reactivation | WordPress 7.1.4 | Existing sandbox preferences retained |
| Debug logs | Both clean sites after runtime/browser checks | No debug log generated |
| ZIP verification | 19 entries, CRC/checksum/content checks | Pass; no translation catalogs; packaged runtime matches checkout |

The PHP suite now handles the absence of WooCommerce explicitly rather than requiring a product screen fixture. Its new CSS cases exercise dark/light backgrounds, three-digit colors, allowed radius values, markup/style-breakout attempts, CSS rule injection, and malformed array metadata. They verify a single literal-scoped declaration block, retained palette properties, safe defaults, and no injected HTML/rules. The settings browser suite additionally checks that the escaped inline CSS applies the selected radius and custom colors and switches correctly between light/dark palettes.

External Italian pack checks used a copy of the development MO in the sandbox's `WP_LANG_DIR/plugins`, outside the installed plugin directory. Each fixture was removed afterward, without overwriting an existing pack. This verifies WordPress loading behavior, not actual translate.wordpress.org approval or delivery.

## Corrected artifact

- ZIP: `dist/wordpress-org/adminlume-0.4.1.zip`
- Sidecar: `dist/wordpress-org/adminlume-0.4.1.zip.sha256`
- SHA-256: `652fba4230f0b45adb1d67026a8219d5977f07bfdf91b8af9eb1aa18d3825bd3`
- Version and stable tag: `0.4.1`; contributor: `dilorsoft`.
- No runtime CSS/JavaScript assets were changed; only the generated inline-style boundary and translation loading/packaging changed.

Version 0.4.1 intentionally does not replace the existing 0.4.0 tag or historical artifact. Rebuild with `python3 scripts/build_release.py --version 0.4.1`; repeat package checks if runtime files or metadata change.

## Next review step and limitations

Upload the corrected ZIP using **Add Your Plugin**, then reply in the existing review email thread. Do not create a new plugin submission or a new email thread. Keep the requested slug `adminlume` unless an intentional change is agreed before approval. A tag or GitHub release is not needed to update the pending submission.

The current correction pass used clean sites without WooCommerce. It did not repeat the complete prior commerce, multisite, theme, browser, accessibility, or real-device matrix. Automated passes and this targeted output review do not guarantee approval or replace a full security/accessibility audit. WordPress.org can identify further issues in subsequent review rounds.

After uploading, a concise reply may be:

> Thank you for your review. I have uploaded version 0.4.1 addressing both reported issues and tested it on clean WordPress installations with WP_DEBUG enabled. Plugin Check passes. The requested slug remains adminlume.

Only use past-tense upload wording after the corrected ZIP has actually been uploaded.
