# Adminlume 0.4.0 directory-edition review

Historical report: these checks preceded the initial Plugins Team review. That review subsequently requested removal of packaged translation catalogs and late escaping of generated CSS. See the [0.4.1 correction report](review-0.4.1.md); the earlier automated passes did not constitute directory approval.

Review date: 2026-11-05. Scope: prepare the WordPress.org edition and execute isolated compatibility/automated review checks. The reviewed changes were subsequently committed at the maintainer's request. No tag, release, push, directory submission, or SVN publication was performed by the agent. The existing customer/local installation was not modified.

## Distribution changes

- Removed the external `Update URI`, GitHub updater class/bootstrap/hooks, and obsolete updater integration suite.
- The builder and release workflow now produce only a directory ZIP and SHA-256 sidecar, not `adminlume-update.json`. Historical releases are unchanged.
- Runtime PHP follows WordPress filenames and coding standards. Settings saves now require POST in addition to the existing capability, nonce, and field validation.
- Bundled Italian catalogs use WordPress's native just-in-time registry, registered on `init`. No custom locale selection is introduced.
- Copyright and trademark notices are retained as `.txt` in the ZIP. Developer dependencies, tests, scripts, and documentation are excluded.
- No frontend/backend CSS or JavaScript was changed for this migration. Personal preference keys and legacy metadata compatibility are preserved.

## Environment and results

The package was installed in a separate Docker Compose project, `adminlume-review`, using its own database and WordPress volumes, exposed only on localhost. Tests used the installed ZIP, without browser asset overrides. WordPress's official version API identified 7.1.4 as the current stable release during this review.

| Check | Environment | Result |
| --- | --- | --- |
| Official Plugin Check, static and runtime | WordPress 7.1.4, PHP 8.3.32, Plugin Check 2.1.0, WP-CLI 2.12.0 | No errors or warnings; no checks disabled |
| Full WordPress Coding Standards | WPCS 3.4.1, PHP_CodeSniffer 3.13.6 | All five runtime PHP files pass, zero errors/warnings |
| Packaging, release metadata, gettext unit tests | Python unittest | 24 tests pass |
| PHP integration | WordPress 7.1.4, PHP 8.3.32 | 56 checks pass |
| PHP integration | WordPress 7.1.4, PHP 8.1.34 | 56 checks pass |
| Minimum-version PHP integration | WordPress 6.5, PHP 8.1.34, WooCommerce 8.8.3 fixture | 56 checks pass |
| Minimum-version English/Italian locale switching | WordPress 6.5, PHP 8.1.34 | 21 checks pass |
| English/Italian locale switching | WordPress 7.1.4, PHP 8.3.32 and 8.1.34 | 21 checks pass on each PHP version |
| Frontend toolbar browser regression | Playwright 1.64.1, Chromium 156.0.8078.4, PHP 8.3 web service | 38 checks pass |
| Backend/frontend toolbar browser regression | Same browser, WooCommerce 11.2.2 | 25 checks pass |
| Settings keyboard/save/opt-in browser regression | WordPress 7.1.4, Chromium, axe-core 4.14.0 | 13 checks pass; no scoped axe violations, contrast requires manual review |
| Minimum-version settings browser regression | WordPress 6.5, PHP 8.1.34 web service, Chromium, axe-core 4.14.0 | 13 checks pass; no scoped axe violations, contrast requires manual review |
| Minimum-version frontend toolbar browser regression | WordPress 6.5, PHP 8.1.34 web service, Chromium | 37 checks pass |
| Deactivation/reactivation | Installed ZIP, isolated admin account | Activation state changes correctly; preferences retained |
| Archive integrity and reproducibility | ZIP CRC check and packaging tests | Pass; 22 runtime/package entries |
| Whitespace review | `git diff --check` | Pass |

Integration coverage includes preference isolation, sanitization, capabilities, GET rejection, invalid nonce rejection, conditional assets, native toolbar integration, and absence of Adminlume external update hooks. Browser coverage includes desktop/mobile geometry, dropdown behavior, restored frontend dock controls, and unchanged anonymous pages. WooCommerce and an isolated product fixture were used to exercise relevant native toolbar/admin behavior; this is not a complete WooCommerce store audit.

The first frontend browser run printed all 38 passing checks but exceeded its outer timeout during shutdown. It was rerun with a longer timeout and completed successfully, including temporary-session cleanup. Early setup findings (missing readme tested header, notice filenames, eager translation loading) were corrected and the final installed package passed Plugin Check. Initial WooCommerce onboarding redirects were resolved by creating a product fixture only in the sandbox.

Composer's global executable emitted host-PHP deprecation notices during dependency installation; these were tool-environment notices, not plugin runtime findings. The lock refresh reported no dependency vulnerability advisories.

Follow-up minimum-version testing used a separate `adminlume-minimum` Docker project on localhost, not a downgrade of the current-version review site. The PHP suite initially failed its WooCommerce asset expectation because WooCommerce was absent; after installing a compatible WooCommerce 8.8.3 fixture and a sandbox product, all checks passed. This historical core/commerce stack is for isolated compatibility testing only, not a recommended production version.

The settings browser suite creates and deletes a disposable administrator and tests real nonce-protected POST saves without modifying existing users. It verifies accessible field labels, Space/Enter interaction, persistence, visible checkbox focus, narrow-screen layout, and restoration of native appearance after opt-out. Desktop screenshots on both core versions were visually inspected: settings labels, controls, feedback, and focus ring were legible and unobscured. Axe was scoped to `.ra-preferences`, with no A/AA violations reported; `color-contrast` remained incomplete (the current-version diagnostic identifies the native `#ra-radius` select) and is not counted as a passing contrast audit. The first current-version settings navigation timed out at 30 seconds; the suite subsequently completed with a longer navigation timeout.

The minimum-version frontend suite initially found no admin toolbar before its first assertion. After deferring the new sandbox site's native admin-email confirmation prompt, it passed all 37 applicable checks. The current-version suite has one additional WooCommerce visibility-badge check; that badge is absent in the older commerce fixture. No plugin changes were made to accommodate these fixture differences.

## Reviewed artifact

- ZIP: `dist/wordpress-org/adminlume-0.4.0.zip`
- Sidecar: `dist/wordpress-org/adminlume-0.4.0.zip.sha256`
- SHA-256: `0c4feb31a9f091848cf3d83c9777679e79105893db04fba6963a699ff93ff396`
- Root: `adminlume/adminlume.php`; version and stable tag: `0.4.0`.
- `Tested up to: 7.1` uses directory-required major/minor notation; the exact tested core release was `7.1.4`.

Rebuild with `python3 scripts/build_release.py --version 0.4.0`. Recheck the checksum after any packaged-file change.

After the initial runtime/browser review, the maintainer supplied the contributor username and the ZIP was rebuilt with `Contributors: dilorsoft`. No runtime files changed. The checksum above identifies that rebuilt artifact. It was reinstalled and official Plugin Check (including runtime checks) was rerun successfully with no findings. Use the runtime bootstrap when repeating it:

```bash
wp plugin check adminlume --format=json --require=./wp-content/plugins/plugin-check/cli.php
```

## Limitations and remaining submission prerequisites

- Passing automated checks is not WordPress.org approval, a complete security/accessibility audit, or a guarantee for every theme/plugin combination.
- WordPress 6.5 and the current 7.1.4 release were exercised. No multisite, Firefox, Safari, real-device, or exhaustive commerce matrix was run. Human screen-reader testing and a complete contrast/usability review remain outside the completed automated checks.
- The public WordPress.org readme validator was also executed with the current readme. It returned only optional notes for a missing Screenshots section and donation link; no errors were reported. These notes do not require invented screenshots or a donation URL.
- The additional `tests/settings-browser.cjs` exercises a disposable administrator's settings form; it supports optional development-only axe-core scanning. Browser/automated accessibility checks do not replace screen-reader and human usability review.
- The maintainer supplied the WordPress.org username `Dilorsoft`; `Contributors` now contains its lowercase form, `dilorsoft`. Account ownership was not independently verified. The Plugins Team must approve the plugin and confirm its slug. Reconcile folder/text-domain compatibility if the approved slug differs.
- Submission, reviewer feedback, SVN publication, listing artwork, and actual directory update delivery remain separate future work. No directory updates are promised before approval/publication.
- Older GitHub installations require a one-time manual replacement with the approved directory edition without uninstalling. Same-folder replacement retained sandbox preferences, but an end-to-end automatic directory update cannot be tested before publication.
- The isolated review stack may be stopped after testing; its volumes can be retained for reproduction. Do not apply cleanup commands to other Docker projects.

See [submission prerequisites](wordpress-org.md), [updates and migration](updates.md), and [release packaging](releases.md).
