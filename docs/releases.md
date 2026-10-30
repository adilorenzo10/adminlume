# Releases

Pushing a stable version tag such as `v0.2.0` triggers `.github/workflows/release.yml`. GitHub Actions validates the version, checks PHP/JavaScript syntax, runs packaging tests, builds an installable ZIP and SHA-256 checksum, and publishes a GitHub Release with generated notes and both files attached.

No personal access token or third-party release action is needed: the workflow uses GitHub's built-in, short-lived `GITHUB_TOKEN` with repository contents write permission. GitHub Actions must be enabled and repository or organization policy must allow that permission. This workflow does not publish to WordPress.org.

## Prepare a release

1. Finish code review and local WordPress/browser regression checks. The release job checks syntax and packaging, not the full Docker/Playwright integration suite.
2. Set `Version` in `adminlume.php` and `Stable tag` in `readme.txt` to the same stable version, without `v`.
3. Add the corresponding `= X.Y.Z =` entry under `== Changelog ==` in `readme.txt`, with relevant upgrade information.
4. Run the local packaging tests and build (Python 3.9+; standard library only):

   ```bash
   python3 -m unittest discover -s tests -p 'test_build_release.py' -v
   python3 scripts/build_release.py --version 0.2.0
   ```

5. Install the resulting ZIP in an isolated WordPress environment and verify activation, assets, preferences, and compatibility. `dist/` is ignored by Git.
6. Commit and push the reviewed release preparation and workflow before pushing the annotated tag:

   ```bash
   git push origin main
   git tag -a v0.2.0 -m "Release Adminlume 0.2.0"
   git push origin v0.2.0
   ```

Replace the example version for later releases. Tags must use stable `vX.Y.Z` versions; prerelease tags and mismatched versions fail validation rather than publishing an incorrect ZIP. The first release uses `v0.2.0` because the plugin already declares version `0.2.0`.

## Release assets

- `adminlume-X.Y.Z.zip`: the installable plugin, rooted at `adminlume/adminlume.php` so WordPress installs it in the correct directory.
- `adminlume-X.Y.Z.zip.sha256`: a SHA-256 checksum for integrity verification. It is not a cryptographic signature or an independent proof of publisher identity.

The package includes the plugin entry point, `src/`, runtime asset types under `assets/`, translation files under `languages/` when present, the WordPress `readme.txt`, and license/copyright/branding notices. Tests, scripts, workflows, the repository's Markdown readme, contributor/developer documentation, Git metadata, dependencies, and local files are not included. Packaging uses an explicit allowlist and rejects symlinks. Review that allowlist when adding a new runtime file type or directory.

Archive entries have stable ordering, timestamps, and permissions for reproducibility with the same Python/zlib toolchain. Source files remain unminified and no runtime build step is introduced.

On the GitHub Release page, download the named **`adminlume-X.Y.Z.zip` asset**, not GitHub's automatically generated “Source code” archives. Install it with **Plugins → Add New Plugin → Upload Plugin**. Release pages are available at [GitHub Releases](https://github.com/adilorenzo10/adminlume/releases).

Verify the downloaded archive and checksum from the same directory:

```bash
# Linux
sha256sum -c adminlume-0.2.0.zip.sha256

# macOS
shasum -a 256 -c adminlume-0.2.0.zip.sha256
```

## Failures and immutable versions

If the tag exists but no run was started, use **Actions → Release plugin → Run workflow** on `main` and enter the existing tag, such as `v0.2.0`. This recovery path validates and checks out that exact tag, not the current branch, and does not move or recreate it. It uses the same build and publication steps as a tag push. Future tags still publish automatically on push.

Check the **Release plugin** run under the repository's **Actions** tab. If validation fails, no release is created. If the job fails before publication, fix the issue and use a new version when source changes are required; do not move an already shared tag. A transient failure without source changes can be retried from Actions.

The publication step does not overwrite an existing release or its assets. If a release already exists, the job fails rather than silently replacing a published package. Diagnose the existing release and publish a new version for corrections. Do not delete/recreate shared tags or force-push them as part of routine release work.
