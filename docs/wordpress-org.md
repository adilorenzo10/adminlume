# WordPress.org submission and plugin branding

## Current status: directory edition prepared locally

Adminlume 0.4.0 was submitted without the GitHub updater or external `Update URI`. The initial Plugins Team review requested removal of bundled translation catalogs and late escaping of generated inline CSS; version 0.4.1 addresses these requests. GitHub remains the development/source archive; the installed plugin uses WordPress's directory update system. The submission is pending, not approved or published. See the historical [0.4.0 review report](review-0.4.0.md) and the [0.4.1 correction report](review-0.4.1.md).

[Directory guideline 8](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/#8-plugins-may-not-send-executable-code-via-third-party-systems) prohibits delivering plugin updates from third-party servers in directory-hosted plugins. The directory build must use WordPress.org's own update channel. Merely adding an icon or changing the readme does not resolve this requirement.

This guide does not submit or update a submission, create a release/tag, or publish to SVN. After uploading a corrected ZIP through Add Your Plugin, reply concisely in the existing review email thread to rejoin the review queue.

## Icon files

Original Adminlume artwork is included under the project's `GPL-2.0-or-later` license:

- `assets/images/icon.svg`: editable vector source, dark background, light A monogram, orange crossbar and spark.
- `assets/images/icon-128x128.png`: standard raster fallback.
- `assets/images/icon-256x256.png`: high-DPI raster fallback.

These assets remain bundled, but no custom updater supplies icon metadata. Directory listing artwork comes from SVN `/assets/` after approval. Core's installed Plugins table does not have a general custom-icon header. No unsupported `Icon URI` header is added, and the public toolbar's native WordPress logo is not replaced.

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

1. Keep WordPress.org as the sole installed update source. GitHub is retained for development and source availability, not as an alternative updater inside this edition.
2. Preserve the completed removal of the external `Update URI`, updater class/bootstrap, hooks, external update/download code, and generated manifest. Readme/privacy descriptions and packaging guards now match this behavior.
3. Plan migration of existing GitHub installations to the directory edition once the approved slug exists. Test the one-time replacement on staging, then confirm subsequent updates come from WordPress.org. Do not assume directory publication automatically changes existing clients' update source.
4. Keep the `adminlume` slug/text domain consistent with the approved directory slug. Availability is determined by the Plugins Team; the name is not reserved by this repository.
5. `Contributors` in `readme.txt` contains `dilorsoft`, the WordPress.org username supplied by the maintainer. Confirm account access before submission; it was not inferred from GitHub or branding.
6. Retain GPL-compatible licensing and all required notices. Audit all bundled code and artwork for provenance. The original icon source and PNGs are covered by the existing project license.
7. Review security, output escaping, capability/nonce checks, accessibility, per-user opt-in, WooCommerce compatibility, and internationalization. English source strings, an Italian PO/MO catalog, and a POT template are provided; keep the `adminlume` text domain, regenerate catalogs for changed strings, and verify user-locale behavior. Do not claim untested compatibility.
8. Set matching plugin `Version`, readme `Stable tag`, and changelog. Set `Tested up to` only after actually testing that WordPress version. Use the release-preparation workflow before tagging; do not reuse an existing public tag.

## Validate before submission

Use an isolated local/staging WordPress site, not production. Run the official [Plugin Check](https://wordpress.org/plugins/plugin-check/) against the directory edition and address errors. Its WordPress CLI command is:

```bash
wp plugin check adminlume --require=./wp-content/plugins/plugin-check/cli.php --format=json
```

The Plugin Check tool must first be installed in that test environment. Also run the project's tests and review new PHP with WordPress Coding Standards. Validate `readme.txt` with the [readme validator](https://wordpress.org/plugins/developers/readme-validator/). Automated checks help but do not guarantee approval.

Build with `python3 scripts/build_release.py --version 0.4.1`. The clean ZIP is `dist/wordpress-org/adminlume-0.4.1.zip`, rooted at `adminlume/`, including runtime files, local assets, readme, and license notices only. Development translation catalogs are excluded; WordPress.org supplies approved language packs separately. Historical packages are not the corrected submission. Verify installation, activation, deactivation, preference retention, and supported PHP/WordPress combinations. Actual directory update delivery can only be confirmed after publication.

## Submit and publish

1. Create or use a WordPress.org account, keep its email reachable, and complete the required two-factor/authentication setup for plugin contributors.
2. Read the current [Detailed Plugin Guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/).
3. Submit the reviewed plugin ZIP through [Add Your Plugin](https://wordpress.org/plugins/developers/add/), with an accurate description. Submission is reviewed; a GitHub release alone does not publish a plugin in the directory.
4. Respond to the Plugins Team's review requests. Do not promise an approval date; fixes or a different slug may be required.
5. After approval and SVN access, publish runtime files in `/trunk`, create the matching immutable release under `/tags/X.Y.Z`, and place listing icons/banners/screenshots in top-level `/assets`. Follow the official [SVN guide](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/).
6. Verify the public plugin listing, artwork, version, download ZIP, and native WordPress update delivery. Maintain SVN as a release repository rather than mirroring every development commit. SVN credentials and any future deployment automation must be configured separately and never committed.

Until approval and publication, reviewed ZIPs can be installed manually on staging through **Plugins → Add New Plugin → Upload Plugin**. Existing GitHub installations need a one-time manual replacement with the approved directory edition; do not uninstall first. This is installation on an individual site, not publication on WordPress.org.
