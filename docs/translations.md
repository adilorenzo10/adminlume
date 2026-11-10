# Translations and internationalization

## WordPress conventions

- **Source language:** English. An English PO/MO catalog is unnecessary: untranslated gettext strings are already the English fallback.
- **Text domain:** the literal `adminlume`, matching the plugin slug. There is no bundled language directory or `Domain Path` header in the submitted package.
- **Development files:** `languages/adminlume.pot` is the template; `adminlume-it_IT.po` is the editable Italian catalog; `adminlume-it_IT.mo` is compiled for development checks only. Starting with 0.4.1, the builder excludes the entire `languages/` directory, including POT, PO, MO, PHP, and JSON files.
- **Runtime loading:** WordPress loads separately installed language packs from `WP_LANG_DIR/plugins` just in time. Adminlume no longer registers a bundled path or calls `load_plugin_textdomain()`. WordPress owns locale selection, language-pack updates, and locale switching; no custom language option is added.

The admin area follows the user's language preference in **Users → Profile → Language**, with the site language as its default. The public site follows WordPress's active front-end locale (including any locale switching performed by WordPress or a multilingual plugin). Do not force the entire site to the logged-in user's language from this plugin. Unsupported locales fall back to English.

Italian translations must be contributed and approved at [translate.wordpress.org](https://translate.wordpress.org/projects/wp-plugins/) after the plugin project becomes available. The repository PO can be used as a starting point; its presence does not imply that WordPress.org has approved or published a language pack. Until a pack is available, Italian users receive English plugin labels. Do not replace English source strings with Italian or add a custom translation download service.

## PHP and JavaScript strings

Use `__()`, `_x()`, and the appropriate escaped translation helpers, such as `esc_html_e()` or `esc_html__()`. Use `_n()` for actual plural messages if introduced later. Pass literal English strings and a literal text domain; do not translate variables or concatenate fragments that translators need to reorder.

Use numbered placeholders when multiple values are involved and a `translators:` comment explaining each placeholder. The site tooltip's `%s` has a translator comment. The radius options use the context `panel corner radius` so words such as “Medium” are not accidentally reused in unrelated contexts. Escape the final output for HTML, attributes, or URLs as appropriate.

Sidebar and dock scripts currently receive **all their interface labels** through `wp_localize_script()` from PHP gettext calls. The POT therefore extracts those PHP calls; client code writes the localized values using `textContent`, placeholders, titles, or ARIA attributes. English JavaScript fallbacks cover absent configuration, not a separate translation system. Do not HTML-escape those plain-text labels before JSON serialization, or entities would be shown literally.

No JavaScript gettext catalogs or new runtime dependencies are needed for this approach. If future strings are translated directly in JavaScript, use `wp.i18n` with the `wp-i18n` dependency, register `wp_set_script_translations()`, and generate the appropriate JSON catalogs with `wp i18n make-json`. Do not add unextractable hardcoded interface text.

Native WordPress/plugin menu labels, user-entered site names, storage keys, selectors, and metadata keys are not rewritten as part of localization. Release changelog text supplied by GitHub remains publisher-authored release content, not a translatable plugin interface string.

## Maintain catalogs

Use WP-CLI's `i18n` commands (or a gettext-compatible editor such as Poedit). From the plugin repository root, with WP-CLI and its i18n command available:

```bash
wp i18n make-pot . languages/adminlume.pot --slug=adminlume --domain=adminlume --include=adminlume.php,src --skip-js --package-name=Adminlume --headers='{"Report-Msgid-Bugs-To":"https://github.com/adilorenzo10/adminlume/issues"}'
wp i18n update-po languages/adminlume.pot languages/adminlume-it_IT.po
# Review and translate new or fuzzy entries before compiling.
wp i18n make-mo languages
```

`--skip-js` is intentional for the current server-localized scripts, not permission to leave new client-only strings untranslated. These extraction/compilation commands do not need a running WordPress installation. In Docker, mount the checkout into the CLI container and run against that path; the output mount must be writable. Do not accidentally regenerate catalogs in a different installed copy of the plugin.

Commit the POT, PO, and regenerated MO together with source changes. Never edit the binary MO by hand. Keep the Italian catalog complete and non-fuzzy; validate placeholders and contexts. For additional locales, use the standard `adminlume-LOCALE.po`/`.mo` names and appropriate language/plural headers.

## Tests

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

CI checks PHP message-domain/template coverage, source/template/Italian development catalog consistency, placeholders, compiled MO lookups, and exclusion of translation files from the ZIP. The lightweight catalog reader covers the singular entries currently used; extend its tests appropriately when introducing plural catalogs. These checks do not replace a full WordPress Coding Standards/i18n audit.

On an isolated local Docker WordPress installation with the Italian core language pack installed and this plugin revision active:

```bash
docker compose run --rm wpcli wp eval-file /var/www/html/wp-content/plugins/adminlume/tests/i18n-integration.php
```

Test the installed ZIP, not the source checkout. With no Adminlume language pack installed, the suite verifies English fallback under both English and Italian core locales. To test separate language-pack loading before directory publication, copy the development MO into `WP_LANG_DIR/plugins/adminlume-it_IT.mo` in the isolated fixture only, then rerun the suite in a new WP-CLI process. This is a test fixture, not a claim that a WordPress.org pack exists. Preserve any pre-existing file and remove only the fixture afterward.

The suite creates a temporary subscriber, switches between English and Italian, verifies the settings, context-sensitive labels, site tooltip, localized script data, Dashboard label, absence of bundled catalogs, and return to English, then restores locale/user state and deletes its test user. No HTTP requests or content changes are required by the suite. Do not run it in production.
