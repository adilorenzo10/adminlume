# WordPress.org submission and plugin branding

## Current status: GitHub distribution

Adminlume currently ships with a GitHub updater and an external `Update URI`. The existing GitHub ZIP is **not ready for submission unchanged** to the WordPress.org Plugin Directory.

[Directory guideline 8](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/#8-plugins-may-not-send-executable-code-via-third-party-systems) prohibits delivering plugin updates from third-party servers in directory-hosted plugins. The directory build must use WordPress.org's own update channel. Merely adding an icon or changing the readme does not resolve this requirement.

This guide documents the remaining work; it does not disable the existing updater, submit a plugin, reserve a slug, or publish to SVN.

## Icon files

Original Adminlume artwork is included under the project's `GPL-2.0-or-later` license:

- `assets/images/icon.svg`: editable vector source, dark background, light A monogram, orange crossbar and spark.
- `assets/images/icon-128x128.png`: standard raster fallback.
- `assets/images/icon-256x256.png`: high-DPI raster fallback.

The current GitHub updater supplies these local assets through WordPress's `icons` metadata (`svg`, `1x`, and `2x`). They are included in the installable plugin ZIP and do not require a remote icon service. Core's installed Plugins table does not have a general custom-icon header; icons are shown on the update/discovery surfaces that support them. No unsupported `Icon URI` header is added, and the public toolbar's native WordPress logo is not replaced.

After editing the SVG, regenerate both PNG files with the same development-only Playwright setup used for browser tests:

```bash
node scripts/render_icon.cjs
```

`PLAYWRIGHT_MODULE` and `PLAYWRIGHT_BROWSERS_PATH` may point to an external development installation. The export is local and makes no HTTP requests. Node.js and Playwright are not runtime dependencies. Review the PNG files before committing them.

For WordPress.org, copy these three files into the **top-level SVN `/assets/` directory**, alongside `/trunk` and `/tags`, not into `/trunk/assets/`. The `assets/images/` directory in the GitHub checkout serves a different purpose: those files are bundled with the installed plugin.

Optional listing artwork:

- `banner-772x250.png` and optionally `banner-1544x500.png`.
- Real `screenshot-1.png`, `screenshot-2.png`, etc., with matching numbered captions under `== Screenshots ==` in `readme.txt`.

SVG icons need a PNG fallback. File dimensions must match their names. See the official [plugin assets guide](https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/). Do not add fake screenshots or declare an icon to be a registered trademark without a basis for that claim.

## Prepare the directory edition

1. Decide to use WordPress.org as the update source for the directory edition. Keep GitHub for development and source availability, not as an alternative updater inside that edition.
2. Remove the external `Update URI`, GitHub updater bootstrap, updater hooks, and related external update/download code from the directory package. Update the readme and privacy descriptions to match. This requires an explicit distribution change and testing; it has not been applied to the current GitHub edition.
3. Plan migration of existing GitHub installations to the directory edition once the approved slug exists. Test the one-time replacement on staging, then confirm subsequent updates come from WordPress.org. Do not assume directory publication automatically changes existing clients' update source.
4. Keep the `adminlume` slug/text domain consistent with the approved directory slug. Availability is determined by the Plugins Team; the name is not reserved by this repository.
5. Add the verified WordPress.org account username to `Contributors` in `readme.txt`. Do not infer the account name from GitHub or the Dilorsoft brand.
6. Retain GPL-compatible licensing and all required notices. Audit all bundled code and artwork for provenance. The original icon source and PNGs are covered by the existing project license.
7. Review security, output escaping, capability/nonce checks, accessibility, per-user opt-in, WooCommerce compatibility, and internationalization. English source strings, an Italian PO/MO catalog, and a POT template are provided; keep the `adminlume` text domain, regenerate catalogs for changed strings, and verify user-locale behavior. Do not claim untested compatibility.
8. Set matching plugin `Version`, readme `Stable tag`, and changelog. Set `Tested up to` only after actually testing that WordPress version. Use the release-preparation workflow before tagging; do not reuse an existing public tag.

## Validate before submission

Use an isolated local/staging WordPress site, not production. Run the official [Plugin Check](https://wordpress.org/plugins/plugin-check/) against the directory edition and address errors. Its WordPress CLI command is:

```bash
wp plugin check adminlume
```

The Plugin Check tool must first be installed in that test environment. Also run the project's tests and review new PHP with WordPress Coding Standards. Validate `readme.txt` with the [readme validator](https://wordpress.org/plugins/developers/readme-validator/). Automated checks help but do not guarantee approval.

Build a clean installable ZIP of the **directory edition** rooted at `adminlume/`, including only runtime files, translations, readme, and license notices. Do not upload the current GitHub-updater package unchanged. Verify clean installation, activation, deactivation, preference retention, and update behavior on supported PHP/WordPress versions.

## Submit and publish

1. Create or use a WordPress.org account, keep its email reachable, and complete the required two-factor/authentication setup for plugin contributors.
2. Read the current [Detailed Plugin Guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/).
3. Submit the reviewed plugin ZIP through [Add Your Plugin](https://wordpress.org/plugins/developers/add/), with an accurate description. Submission is reviewed; a GitHub release alone does not publish a plugin in the directory.
4. Respond to the Plugins Team's review requests. Do not promise an approval date; fixes or a different slug may be required.
5. After approval and SVN access, publish runtime files in `/trunk`, create the matching immutable release under `/tags/X.Y.Z`, and place listing icons/banners/screenshots in top-level `/assets`. Follow the official [SVN guide](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/).
6. Verify the public plugin listing, artwork, version, download ZIP, and native WordPress update delivery. Maintain SVN as a release repository rather than mirroring every development commit. SVN credentials and any future deployment automation must be configured separately and never committed.

Until the directory edition is prepared and approved, users can still install the existing GitHub ZIP through **Plugins → Add New Plugin → Upload Plugin**, then replace the current version when prompted. This is installation on an individual site, not publication on WordPress.org.
