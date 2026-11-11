# Adminlume 0.4.2 release verification

Date: 2026-11-11. Version 0.4.2 includes the committed frontend favicon layout fix. Plugin version, readme stable tag, changelog, and upgrade notice agree. Preparation does not create a commit, tag, GitHub release, or WordPress.org publication.

## Artifact

- `dist/wordpress-org/adminlume-0.4.2.zip`
- `dist/wordpress-org/adminlume-0.4.2.zip.sha256`
- SHA-256: `bd42a307aa9c7a3636bae686a1fcf9f7cf000d28164246e9d52f68219321908b`

The ZIP was installed over 0.4.1 in the isolated review WordPress site. The browser suite tested its installed CSS without asset overrides. The artifact contains the favicon fix and excludes development translation catalogs. The existing submitted 0.4.1 artifact and tags were not rewritten.

## Results

- WordPress 7.1.4 / PHP 8.3: official Plugin Check 2.2.0, including runtime checks, passes without findings.
- Full WordPress Coding Standards: five runtime PHP files pass without errors or warnings.
- Python packaging, metadata, and development translation suite: 25 tests pass.
- PHP integration: 70 checks pass.
- Localization without an installed plugin language pack: 22 checks pass, confirming English fallback.
- Frontend browser regression: 74 checks pass, including native favicon markup, theme block-image CSS, short/long titles, five viewport widths, and LTR/RTL directions.
- ZIP CRC, checksum, metadata, packaged favicon CSS, and translation exclusion: verified.

The native icon fixture is generated with request-local WordPress filters and tested in the browser without saving site-icon options. No customer installation was modified. The complete prior PHP/WordPress, commerce, theme, accessibility, and browser matrix was not repeated for this CSS release; the earlier [0.4.1 report](review-0.4.1.md) remains historical context, not a claim of directory approval.

Commit the prepared metadata before creating `v0.4.2`. GitHub tags do not deliver WordPress.org updates; until directory approval/publication, install the reviewed ZIP manually or update the existing pending submission.
