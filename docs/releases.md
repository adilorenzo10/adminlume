# Releases

## WordPress.org directory edition

Starting with 0.4.0, the installed plugin uses WordPress.org's update channel. Version 0.5.0 is the current directory release under the `adminlume` slug (SVN r3829337; 0.4.2 was first published in r3809784). The external GitHub updater, its `Update URI`, download filters, cache, and release manifest have been removed. See [updates and migration](updates.md).

GitHub remains the source/development archive. Pushing a stable `vX.Y.Z` tag runs `.github/workflows/release.yml`, validates the tagged metadata, checks PHP/JavaScript syntax, catalogs, packaging, and WordPress Coding Standards, then attaches the installable ZIP and SHA-256 sidecar to a GitHub Release. **It does not publish to WordPress.org or deliver updates to directory installations.** Directory publication is a separate SVN step; see [Directory publication](#directory-publication).

No personal token is needed for GitHub Releases: the job uses GitHub's built-in token with contents write permission. Directory/SVN deployment and credentials are separate, and are not configured by this workflow.

## Prepare a release

1. Complete local WordPress/browser checks and the directory review. Record versions and findings; release CI does not run a full WordPress database/browser environment.
2. Before creating the tag, choose the next unused version and prepare its metadata and real changelog notes. For example, after 0.4.2:

   ```bash
   NEXT_VERSION=0.4.3
   python3 scripts/prepare_release.py --version "$NEXT_VERSION" --note "Describe the actual changes."
   ```

   This synchronizes `Version`, `Stable tag`, and the changelog. It does not create commits, tags, or pushes. It rejects existing local tags, non-increasing versions, inconsistent version fields, and existing changelog entries that would be overwritten. A previous incomplete bump with missing notes can be recovered by preparing a newer complete version.
3. Review upgrade notices and use a major/minor `Tested up to` only after actual compatibility testing.
4. Validate and build before tagging:

   ```bash
   composer install
   composer lint
   python3 -m unittest discover -s tests -p 'test_*.py' -v
   python3 scripts/build_release.py --version "$NEXT_VERSION"
   ```

5. Install the ZIP from `dist/wordpress-org/` on staging. Run Plugin Check including runtime checks, verify activation/deactivation, translations, preferences, and the front-end/backend UI. The builder rejects the old external update URI or updater file. Tests and developer dependencies are not packaged.
6. Commit and push the reviewed changes before creating the annotated tag:

   ```bash
   git add adminlume.php readme.txt
   git commit -m "chore(release): prepare version $NEXT_VERSION"
   git push origin main
   git tag -a "v$NEXT_VERSION" -m "Release Adminlume $NEXT_VERSION"
   git push origin "v$NEXT_VERSION"
   ```

   Include any other reviewed source/catalog changes in the commit as appropriate. Version 0.4.2 includes the front-end favicon layout fix; see its [verification report](review-0.4.2.md). Do not rerun the helper for an equal version. No tag or publication is implied by local preparation.

## Release assets

- `dist/wordpress-org/adminlume-X.Y.Z.zip`: installable package rooted at `adminlume/adminlume.php`.
- `dist/wordpress-org/adminlume-X.Y.Z.zip.sha256`: checksum sidecar for manual integrity verification, not an independent publisher signature.

The ZIP contains runtime PHP, local assets, `readme.txt`, GPL license text, and copyright/branding notices. Starting with 0.4.1, the entire development `languages/` directory is excluded: WordPress.org supplies approved runtime language packs separately. Source `COPYRIGHT.md` and `TRADEMARKS.md` are packaged as `.txt` with adjusted internal references, preserving their notices without unexpected root Markdown files. Git metadata, tests, scripts, Composer dependencies, workflows, and developer documentation are excluded.

The builder no longer emits `adminlume-update.json`; the workflow does not upload one. Old files in a developer's ignored `dist/` directory do not belong to the new directory package. Never attach a stale manifest to a directory release or overwrite old published assets.

Archive entries use stable ordering, timestamps, and permissions for reproducibility with the same Python/zlib toolchain. Install the named ZIP asset, not GitHub's automatically generated source-code archives.

```bash
# Run from the directory containing the downloaded ZIP and sidecar.
sha256sum -c adminlume-0.4.2.zip.sha256    # Linux
shasum -a 256 -c adminlume-0.4.2.zip.sha256 # macOS
```

## Directory publication

A GitHub tag or Release is not a directory update. Installations receive a new version only after its runtime files are committed to SVN `/trunk` and the matching `/tags/X.Y.Z` exists with `Stable tag: X.Y.Z` in `trunk/readme.txt`. Listing assets stay in top-level `/assets`.

After the Git tag and GitHub Release succeed, update `dist/wordpress-org/svn/`, populate `trunk/` from the same verified ZIP, create `tags/X.Y.Z`, review the scheduled changes, and commit to SVN as the `dilorsoft` account in a separate, explicitly authorized step. Follow [the SVN procedure](wordpress-org.md#publish-a-new-version-to-svn). Never modify a published SVN tag.

## Failure recovery

Creating a Git tag does not change the files in its commit. Header version, stable tag, and an exact `= X.Y.Z =` entry under `== Changelog ==` must agree. An upgrade notice alone is not a changelog entry. Validate locally before committing and tagging; changing `main` later does not repair an existing tag's snapshot.

For a transient failed run of a valid directory-edition tag, use **Actions → Release plugin → Run workflow** on `main` and enter that existing tag. It checks out the exact tagged source without moving it. Do not use the new workflow to rebuild historical GitHub-updater tags with incompatible build scripts. For source fixes, prepare a new version rather than rewriting a shared tag.

Existing releases/assets are not overwritten. Review the failed job, correct the cause, and publish a new version when required. Do not delete/recreate shared tags or force-push them as routine release maintenance.
