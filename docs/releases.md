# Releases

Pushing a stable version tag such as `v0.3.0` triggers `.github/workflows/release.yml`. GitHub Actions validates the version, checks PHP/JavaScript syntax, runs packaging tests, builds an installable ZIP, SHA-256 checksum, and update manifest, and publishes a GitHub Release with generated notes and all three files attached.

No personal access token or third-party release action is needed: the workflow uses GitHub's built-in, short-lived `GITHUB_TOKEN` with repository contents write permission. GitHub Actions must be enabled and repository or organization policy must allow that permission. This workflow does not publish to WordPress.org.

## Prepare a release

1. Finish code review and local WordPress/browser regression checks. The release job checks syntax, packaging, and translation catalogs, not the full WordPress/Docker/Playwright integration suites.
2. **Before creating the tag**, synchronize the version and changelog with the preparation command (replace the example with your next unused version):

   ```bash
   python3 scripts/prepare_release.py --version 0.3.5 --note "Fix the collapsed toolbar hover state."
   ```

   This updates `Version` in `adminlume.php`, `Stable tag` in `readme.txt`, and adds the matching changelog entry. Repeat `--note` for multiple bullets. It rejects existing local tags, equal/older versions, and inconsistent current metadata. It does not create commits or tags, push changes, or overwrite existing changelog entries. If the version is already prepared, skip this command and continue below.
3. Review the changes and add upgrade notices manually when relevant. Creating a Git tag alone never updates these files.
4. Run the local packaging tests and build (Python 3.9+; standard library only):

   ```bash
   python3 -m unittest discover -s tests -p 'test_*.py' -v
   python3 scripts/build_release.py --version 0.3.5
   ```

5. Install the resulting ZIP in an isolated WordPress environment and verify activation, assets, preferences, and compatibility. `dist/` is ignored by Git.
6. Commit and push the reviewed release preparation and workflow before pushing the annotated tag:

   ```bash
   git add adminlume.php readme.txt
   git commit -m "chore(release): prepare version 0.3.5"
   git push origin main
   git tag -a v0.3.5 -m "Release Adminlume 0.3.5"
   git push origin v0.3.5
   ```

Replace the example version for later releases. Tags must use stable `vX.Y.Z` versions; prerelease tags and mismatched versions fail validation rather than publishing an incorrect ZIP. The first release used `v0.2.0`, matching the version declared at that time.

## Release assets

- `adminlume-X.Y.Z.zip`: the installable plugin, rooted at `adminlume/adminlume.php` so WordPress installs it in the correct directory.
- `adminlume-X.Y.Z.zip.sha256`: a SHA-256 checksum for integrity verification. It is not a cryptographic signature or an independent proof of publisher identity.
- `adminlume-update.json`: the fixed-name manifest generated from the same tagged source and ZIP, including version, WordPress/PHP requirements, canonical package URL, checksum, and changelog. Required for [native WordPress update detection](updates.md) starting with 0.3.0. Publish updater-enabled releases as GitHub's latest stable release.

The package includes the plugin entry point, `src/`, runtime asset types under `assets/`, translation files under `languages/` when present, the WordPress `readme.txt`, and license/copyright/branding notices. Tests, scripts, workflows, the repository's Markdown readme, contributor/developer documentation, Git metadata, dependencies, and local files are not included. Packaging uses an explicit allowlist and rejects symlinks. Review that allowlist when adding a new runtime file type or directory.

Archive entries have stable ordering, timestamps, and permissions for reproducibility with the same Python/zlib toolchain. Source files remain unminified and no runtime build step is introduced.

On the GitHub Release page, download the named **`adminlume-X.Y.Z.zip` asset**, not GitHub's automatically generated “Source code” archives. Install it with **Plugins → Add New Plugin → Upload Plugin**. Release pages are available at [GitHub Releases](https://github.com/adilorenzo10/adminlume/releases).

Verify the downloaded archive and checksum from the same directory:

```bash
# Linux
sha256sum -c adminlume-0.3.0.zip.sha256

# macOS
shasum -a 256 -c adminlume-0.3.0.zip.sha256
```

## Failures and immutable versions

Creating a tag does not update the plugin version. For example, tagging files that still declare `Version: 0.3.0` and `Stable tag: 0.3.0` as `v0.3.2` must fail validation. Editing `main` afterward or retrying that tag does not fix it: the workflow checks out the tagged commit. Update both metadata fields and the changelog, validate locally, commit the changes, then create a fresh version tag on that commit. Do not bypass the check or silently rewrite versions only inside the ZIP; installed versions must agree with the tagged source.

If an updater-enabled tag exists but no run was started, use **Actions → Release plugin → Run workflow** on `main` and enter the existing tag, such as `v0.3.0`. This recovery path validates and checks out that exact tag, not the current branch, and does not move or recreate it. It uses the same build and publication steps as a tag push. Future tags still publish automatically on push. Do not reuse this workflow to rebuild historical tags whose packaging scripts predate the update manifest; keep already published releases intact.

Check the **Release plugin** run under the repository's **Actions** tab. If validation fails, no release is created. If the job fails before publication, fix the issue and use a new version when source changes are required; do not move an already shared tag. A transient failure without source changes can be retried from Actions.

The publication step does not overwrite an existing release or its assets. If a release already exists, the job fails rather than silently replacing a published package. Diagnose the existing release and publish a new version for corrections. Do not delete/recreate shared tags or force-push them as part of routine release work.
