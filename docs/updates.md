# Updates and migration to WordPress.org

## Directory edition (0.4.0 onward)

This edition contains no external `Update URI`, GitHub updater, `plugins_api` override, custom update cache, or package download hook. The installed plugin does not request a GitHub manifest or install updates from a third-party server. WordPress owns update detection, downloads, compatibility checks, permissions, cron, and optional automatic installation.

**Approval is still required.** Native updates are only available after the Plugins Team approves the plugin, its approved slug is published in the directory, and a newer version is released there. A GitHub tag or release does not publish to WordPress.org. Do not tell users to expect directory updates before those conditions are met.

After approval, use the normal Plugins screen (Network Admin on multisite) to enable automatic updates if desired. Adminlume does not change `auto_update_plugins`, force auto-update filters, or bypass filesystem/site policies.

## Existing GitHub installations

Versions 0.3.x had an external GitHub updater; version 0.2.0 had none. Existing copies of those versions do not learn a new update source simply because this repository changes.

1. Back up and test on staging.
2. Wait for approval and publication under the confirmed directory slug.
3. Upload the approved directory ZIP and choose to replace the existing `adminlume/` plugin, or use the directory installation flow as appropriate for the confirmed slug.
4. Do not uninstall first. Current and legacy user metadata, per-user opt-in, and browser visibility keys remain compatible.
5. Verify that the installed plugin has no external `Update URI`, then check **Dashboard → Updates**. Subsequent updates use WordPress.org.

If the approved slug differs, plan and test the folder, text-domain, action-link, and metadata compatibility migration before instructing existing users to switch. Do not reserve or assume an unapproved slug.

Old release tags/assets are unchanged. The new release builder does not generate `adminlume-update.json`, and the workflow does not attach it to new releases. Old clients cannot automatically discover this migration from that retired feed; migration is deliberately manual. No updater code is conditionally hidden in the directory ZIP.

## Update checks

After directory publication, use **Dashboard → Updates → Check again**. In a local/staging Docker environment, native update metadata can be refreshed from the Compose directory:

```bash
docker compose run --rm wpcli wp transient delete update_plugins --network
docker compose run --rm wpcli wp eval 'wp_update_plugins();'
```

These commands only request a check; they do not install an update. The old `adminlume_release_manifest_v1` transient is no longer read and can expire naturally. There is no need to flush all site caches.

## Privacy and integrity

The directory edition adds no update-service requests or telemetry of its own. Core WordPress and third-party toolbar/avatar features keep their normal behavior. GitHub archive ZIPs retain a SHA-256 sidecar for manual verification; this is not an independent signature and is not a replacement for WordPress's native updater. Protect directory/SVN accounts and never change the contents of an already published version.
