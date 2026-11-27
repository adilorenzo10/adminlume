# WordPress.org directory publication and plugin branding

## Current status: published on WordPress.org

Adminlume is published in the WordPress.org Plugin Directory under the `adminlume` slug. The `dilorsoft` account committed SVN revision 3809784 on 2026-11-18, which created `/tags/0.4.2` from `/trunk` and added the listing icons to top-level `/assets`. Version 0.5.0 followed in SVN revision 3829337 on 2026-11-27 (`/tags/0.5.0`, Git tag `v0.5.0` on `6784854`); its runtime files match the GitHub Release ZIP, SHA-256 `b34d755fde04722c15d245326dced086389f70b3fce0493206ebf70962cd946e`. 0.5.0 is the current stable tag.

- Public listing: `https://wordpress.org/plugins/adminlume/`
- SVN repository: `https://plugins.svn.wordpress.org/adminlume`
- Current stable release: 0.4.2 ([verification report](review-0.4.2.md))

Installations of 0.4.2 or later receive updates through WordPress's native directory update channel when a newer stable tag is published in SVN. GitHub remains the development/source archive, not an installed update provider; a GitHub tag or release does not publish anything to WordPress.org.

The initial review of 0.4.0 requested removal of bundled translation catalogs and late escaping of generated inline CSS; version 0.4.1 addressed these requests and the plugin was approved. Version 0.4.2 additionally fixed the frontend favicon layout and was the first release published to SVN. The [0.4.0 review report](review-0.4.0.md) and [0.4.1 correction report](review-0.4.1.md) describe historical review stages.

[Directory guideline 8](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/#8-plugins-may-not-send-executable-code-via-third-party-systems) prohibits delivering plugin updates from third-party servers in directory-hosted plugins. The directory edition must keep using WordPress.org's own update channel.

This guide does not publish to SVN by itself. Every SVN commit is a separate, explicitly authorized step.

## SVN working copy

The local working copy is `dist/wordpress-org/svn/`, ignored by Git. It is a checkout of the plugin's SVN root, not of the entire WordPress.org directory. Run `svn update` before preparing a new release; a working copy that predates r3809784 does not yet contain `tags/0.4.2` or the listing assets.

```text
dist/wordpress-org/svn/
  trunk/adminlume.php
  trunk/readme.txt          # Stable tag: latest published version
  trunk/...                 # All other packaged runtime files and notices
  tags/0.4.2/...            # Immutable runtime snapshot of 0.4.2
  tags/0.5.0/...            # Immutable runtime snapshot of 0.5.0
  assets/icon.svg
  assets/icon-128x128.png
  assets/icon-256x256.png
```

Listing icons belong in the top-level SVN `assets/` directory. Runtime icons under `trunk/assets/images/` and `tags/X.Y.Z/assets/images/` are a separate part of the installable plugin. Do not copy Git metadata, development catalogs, Composer tools, tests, ZIPs, checksums, or preparation reports into SVN.

## Publish a new version to SVN

1. Prepare, verify, commit, and tag the release in Git as described in [the release guide](releases.md).
2. Run `svn update` in `dist/wordpress-org/svn/`.
3. Replace the contents of `trunk/` with the verified installable ZIP, removing only the archive's outer `adminlume/` prefix. Schedule new files with `svn add` and removed files with `svn delete`; do not leave files in `trunk/` that the ZIP no longer contains.
4. Create the release tag from the working copy with `svn copy trunk tags/X.Y.Z`. The `Stable tag` in `trunk/readme.txt` must name an existing `tags/X.Y.Z` directory.
5. Review `svn status`, `svn diff --summarize`, and `svn diff`, then commit in a separate, explicitly authorized step.
6. Verify the public listing version, the download ZIP, and update delivery on a staging site still running the previous version.

Local `svn add`, `svn delete`, `svn propset`, and working-copy `svn copy` operations only schedule changes. Use the case-sensitive username `dilorsoft` when committing and enter the SVN password through the client's secure prompt or credential manager, never in repository files or shell arguments. Never modify an existing release tag; publish a new version instead.

Readme-only corrections that do not change runtime code may be committed to `trunk/readme.txt` and to the readme of the current stable tag without a version bump. Keep the Git `readme.txt` identical to what is published.

## Icon files

Original Adminlume artwork is included under the project's `GPL-2.0-or-later` license:

- `assets/images/icon.svg`: editable vector source, dark background, light A monogram, orange crossbar and spark.
- `assets/images/icon-128x128.png`: standard raster fallback.
- `assets/images/icon-256x256.png`: high-DPI raster fallback.

These assets remain bundled, but no custom updater supplies icon metadata. Directory listing artwork comes from SVN `/assets/`, where these three icons were published in r3809784. Core's installed Plugins table does not have a general custom-icon header. No unsupported `Icon URI` header is added, and the public toolbar's native WordPress logo is not replaced.

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

## Maintain the directory edition

1. Keep WordPress.org as the sole installed update source. Do not reintroduce an external `Update URI`, updater class, update/download hooks, or a generated manifest; the packaging guards reject the old updater files.
2. Keep the `adminlume` slug and text domain unchanged. They match the published directory slug.
3. `Contributors` in `readme.txt` contains `dilorsoft`, the WordPress.org account that owns the plugin and commits to SVN.
4. Retain GPL-compatible licensing and all required notices. Audit any new bundled code and artwork for provenance.
5. Review security, output escaping, capability/nonce checks, accessibility, per-user opt-in, WooCommerce compatibility, and internationalization for every release. Keep English source strings and the `adminlume` text domain; runtime language packs come from translate.wordpress.org.
6. Set matching plugin `Version`, readme `Stable tag`, and changelog with the release-preparation workflow. Set `Tested up to` only after actually testing that WordPress version. Never reuse a published version number.

## Validate before each release

Use an isolated local/staging WordPress site, not production. Run the official [Plugin Check](https://wordpress.org/plugins/plugin-check/) against the installed release ZIP and address errors. Its WordPress CLI command is:

```bash
wp plugin check adminlume --require=./wp-content/plugins/plugin-check/cli.php --format=json
```

The Plugin Check tool must first be installed in that test environment. Also run the project's tests and review new PHP with WordPress Coding Standards. Validate `readme.txt` with the [readme validator](https://wordpress.org/plugins/developers/readme-validator/). Automated checks help but do not replace review.

Build with `python3 scripts/build_release.py --version X.Y.Z`. The clean ZIP is `dist/wordpress-org/adminlume-X.Y.Z.zip`, rooted at `adminlume/`, including runtime files, local assets, readme, and license notices only. Development translation catalogs are excluded; WordPress.org supplies approved language packs separately. Verify installation, activation, deactivation, preference retention, and supported PHP/WordPress combinations, then upgrade a staging site from the previously published version.

## Publication history

1. Version 0.4.0 was submitted through [Add Your Plugin](https://wordpress.org/plugins/developers/add/) without the GitHub updater ([review report](review-0.4.0.md)).
2. Version 0.4.1 addressed the Plugins Team's review requests ([correction report](review-0.4.1.md)); the `adminlume` slug and `dilorsoft` SVN access were approved.
3. Version 0.4.2 added the frontend favicon fix and became the first SVN release in r3809784 on 2026-11-18 ([verification report](review-0.4.2.md)).

Maintain SVN as a release repository rather than mirroring every development commit. Follow the official [SVN guide](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/). SVN credentials and any future deployment automation must be configured separately and never committed.

Existing installations of the older GitHub-updater edition (0.3.x) need a one-time manual replacement with the directory edition; see [updates and migration](updates.md).
