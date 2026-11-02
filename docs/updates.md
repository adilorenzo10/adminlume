# Native WordPress plugin updates

Adminlume 0.3.0 introduces an updater for the official public GitHub repository, integrated with WordPress's existing plugin-update system. The project does not need a WordPress.org listing, a GitHub token on customer sites, an external updater library, or a custom scheduled task.

## Enable and use updates

1. Back up the site and test on staging.
2. If running 0.2.0, manually upload the first updater-enabled `adminlume-X.Y.Z.zip` through **Plugins → Add New Plugin → Upload Plugin**, then choose to replace the existing plugin. Do not uninstall it first. A version without updater code cannot discover its own replacement.
3. Keep Adminlume active. Appearance preferences remain per-user and may stay disabled; update detection is independent of them. Like other plugin-bundled updaters, this code cannot register its hooks while the plugin is inactive. Network activation is appropriate when updates must be checked from a multisite network context.
4. Newer stable releases appear under **Plugins** and **Dashboard → Updates**, through WordPress's standard checks. Enable automatic updates for Adminlume on the Plugins screen if desired (Network Admin on multisite).

Automatic installation is optional. Site policies, WordPress constants and filters, cron availability, version-control detection, filesystem access, and WordPress/PHP compatibility still apply. Adminlume does not change `auto_update_plugins` or force the `auto_update_plugin` filter. Only newer versions are offered; equal and older releases do not trigger a downgrade.

An updater-enabled release must be published and installed before this mechanism is available. Creating a newer Git tag alone does not teach an existing 0.2.0 installation how to update.

## Release requirements

The [release workflow](releases.md) attaches these files for each updater-enabled release:

- `adminlume-X.Y.Z.zip`: installable package, rooted at `adminlume/`.
- `adminlume-X.Y.Z.zip.sha256`: human-readable checksum sidecar.
- `adminlume-update.json`: machine-readable manifest, containing schema version `1`, stable version, minimum WordPress/PHP versions, the exact release/package URLs, ZIP SHA-256, and plain-text changelog for that version.

The manifest is generated from the same tagged files and ZIP as the release, not edited by hand. Its fixed asset name allows clients to request:

```text
https://github.com/adilorenzo10/adminlume/releases/latest/download/adminlume-update.json
```

Publish a normal, stable release and ensure it is selected as GitHub's latest release. Do not mark it as a prerelease or leave it as a draft. Drafts, prereleases, source-code archives, and packages from different repositories are not update sources. A deleted or missing latest manifest causes checks to fail safely; it does not fall back to an unrelated WordPress.org plugin with the same slug.

## Native integration and safety

The plugin header's `Update URI` identifies the official GitHub repository, avoiding WordPress.org slug collisions. `update_plugins_github.com` supplies update data only for this plugin's basename and Update URI. WordPress compares versions and owns the update UI, permissions, scheduling, and auto-update choices. `plugins_api` supplies the native details dialog only for the `adminlume` slug; remote notes are escaped as plain text.

Before downloading an Adminlume update, the updater requires a validated manifest and matching canonical package URL, checks minimum WordPress and PHP versions, then uses WordPress's downloader. A SHA-256 mismatch removes the temporary download and blocks installation before plugin files are replaced. Other plugin downloads and pre-existing download filter results are not overridden. Standard WordPress installation checks and rollback behavior remain in place.

Checksum validation detects a mismatched or corrupted artifact; it is not an independent signature. The repository, maintainer account, GitHub release assets, and HTTPS delivery remain trusted parts of the update chain. Protect repository access and use immutable release versions. The plugin rejects packages whose URL no longer matches the currently cached manifest; stale update offers may need a fresh check rather than installing an unverified archive.

## Caching and troubleshooting

- Valid metadata is cached in a site/network transient for six hours; failed checks are cached for 15 minutes. WordPress also caches plugin checks. A release notification is therefore not immediate.
- Use **Dashboard → Updates → Check again** to request a native check, but note that the manifest cache still applies. Developers can clear just `adminlume_release_manifest_v1` with `wp transient delete adminlume_release_manifest_v1 --network`, then request a native check. `--network` targets WordPress site transients, including on single-site installations; `wp site transient` is not a valid command. This is not required for normal operation.
- Allow outbound HTTPS to `github.com` and GitHub release download/CDN hosts such as `release-assets.githubusercontent.com`. Network restrictions, `WP_HTTP_BLOCK_EXTERNAL`, TLS errors, or unavailable GitHub services prevent checks or downloads without breaking the site.
- Keep `adminlume/adminlume.php` as the normal installation path and use the installable ZIP asset, not GitHub's source-code archives. Update the code and manifest generator together if changing repository ownership, slug, package layout, or manifest schema.
- If an update is rejected as incompatible, update WordPress/PHP first and check again. If a checksum fails, investigate the release asset; do not disable verification to work around it.
- If auto-updates are not offered or do not run, check the native Plugins settings, multisite activation context, site restrictions, and cron health. Appearance opt-in is not involved.

For the local Docker setup, run these from the directory containing the Compose file, not the host's `wordpress/` directory. Core WordPress files live in the container volume:

```bash
docker compose run --rm wpcli wp transient delete adminlume_release_manifest_v1 --network
docker compose run --rm wpcli wp transient delete update_plugins --network
docker compose run --rm wpcli wp eval 'wp_update_plugins();'
```

These commands clear only update metadata and request a check; they do not install an update.

## Privacy

Metadata requests use WordPress's safe HTTP API, HTTPS, a 10-second timeout, bounded redirects, and a 64 KiB response limit. A generic Adminlume user agent is used instead of WordPress's default site-identifying agent for the manifest request. The request carries no account details, site URL, locale, or installed-version parameters. No browser tracking script is added.

GitHub and its CDN receive normal connection metadata such as the server IP address. Package downloads use the native WordPress HTTP user agent, which may include WordPress version and site URL. Core WordPress's other update-service requests retain their normal behavior. See [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
