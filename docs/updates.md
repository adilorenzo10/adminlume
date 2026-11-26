# Updates and migration to WordPress.org

## Directory edition (0.4.0 onward)

This edition contains no external `Update URI`, GitHub updater, `plugins_api` override, custom update cache, or package download hook. The installed plugin does not request a GitHub manifest or install updates from a third-party server. WordPress owns update detection, downloads, compatibility checks, permissions, cron, and optional automatic installation.

**The plugin is published.** Version 0.4.2 is available at `https://wordpress.org/plugins/adminlume/` under the `adminlume` slug. Directory installations are offered a native update whenever a newer version is published to SVN with a matching stable tag. A GitHub tag or release alone does not publish to WordPress.org.

Use the normal Plugins screen (Network Admin on multisite) to enable automatic updates if desired. Adminlume does not change `auto_update_plugins`, force auto-update filters, or bypass filesystem/site policies.

## Existing GitHub installations

Versions 0.3.x had an external GitHub updater; version 0.2.0 had none. Existing copies of those versions do not learn a new update source simply because this repository changes.

1. Back up and test on staging.
2. Download the current ZIP from the [directory listing](https://wordpress.org/plugins/adminlume/).
3. Upload it through **Plugins → Add New Plugin → Upload Plugin** and choose to replace the existing `adminlume/` plugin.
4. Do not uninstall first. Current and legacy user metadata, per-user opt-in, and browser visibility keys remain compatible.
5. Verify that the installed plugin has no external `Update URI`, then check **Dashboard → Updates**. Subsequent updates use WordPress.org.

The directory slug is `adminlume`, matching the existing plugin folder and text domain, so no folder or metadata migration is required.

Old release tags/assets are unchanged. The new release builder does not generate `adminlume-update.json`, and the workflow does not attach it to new releases. Old clients cannot automatically discover this migration from that retired feed; migration is deliberately manual. No updater code is conditionally hidden in the directory ZIP.

## Update checks

Use **Dashboard → Updates → Check again**. In a local/staging Docker environment, native update metadata can be refreshed from the Compose directory:

```bash
docker compose run --rm wpcli wp transient delete update_plugins --network
docker compose run --rm wpcli wp eval 'wp_update_plugins();'
```

These commands only request a check; they do not install an update. The old `adminlume_release_manifest_v1` transient is no longer read and can expire naturally. There is no need to flush all site caches.

## Privacy and integrity

The directory edition adds no update-service requests or telemetry of its own. Core WordPress and third-party toolbar/avatar features keep their normal behavior. GitHub archive ZIPs retain a SHA-256 sidecar for manual verification; this is not an independent signature and is not a replacement for WordPress's native updater. Protect directory/SVN accounts and never change the contents of an already published version.
