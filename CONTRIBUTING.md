# Contributing to Adminlume

Use English for repository documentation, code comments, pull request descriptions, and new commit messages. Keep changes focused and describe user-visible effects and compatibility risks.

## Development workflow

1. Create a focused branch from the project's current development branch.
2. Work against an isolated local WordPress installation; never run development tests on production.
3. Follow the [development and testing guide](docs/development.md).
4. Update documentation when behavior, requirements, installation, or public interfaces change.
5. Submit a pull request with a summary, motivation, test results, and screenshots for visual changes. State explicitly which checks were not run.

Do not include credentials, authentication cookies, session tokens, customer data, database dumps, or private site details in issues, commits, or screenshots. Do not disclose an exploitable security issue in a public issue; arrange a private reporting channel with the maintainer first.

## WordPress development practices

- Follow the [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/) for new or changed PHP, JavaScript, CSS, and HTML. Avoid unrelated repository-wide formatting changes.
- Use the [WordPress PHP documentation standards](https://developer.wordpress.org/coding-standards/inline-documentation-standards/php/) for meaningful DocBlocks, including parameters and return values where appropriate. Explain intent and constraints rather than restating the code.
- Use WordPress hooks and enqueue APIs. Keep admin and front-end assets separate and load them only where needed.
- Check capabilities for authorization and nonces for request intent; a nonce is not a substitute for a permission check. Validate and sanitize input, unslash WordPress request data where appropriate, and escape output for its context as late as possible.
- Make new user-facing strings translatable with the `adminlume` text domain. Use English source strings for new work and translator comments for ambiguous placeholders. Existing Italian source strings require a separate localization change to avoid silently breaking translation catalogs.
- Preserve per-user opt-in, native navigation and capabilities, keyboard access, visible focus, reduced motion, responsive behavior, and RTL compatibility.
- Preserve legacy metadata fallbacks, selectors, handles, and storage keys unless an explicit migration is documented and tested.
- Do not introduce mandatory theme dependencies, remote assets, tracking, custom tables, or build requirements without prior discussion.

These are contribution requirements, not a claim that the entire existing codebase has passed an automated standards or security audit. PHP_CodeSniffer with WordPress Coding Standards is recommended for PHP review; no PHPCS configuration or dependency is currently bundled.

## Commit messages

Use English [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>[optional scope]: <imperative summary>

[optional body explaining why and any compatibility implications]

[optional footers]
```

Use `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, or `chore` as appropriate. Use `style` for formatting-only changes, not visual features or bug fixes. Prefer a concise subject, ideally no more than 72 characters, with no trailing period. Keep each commit focused on one logical change.

Examples:

```text
docs: translate plugin documentation into English
fix(toolbar): preserve focus when reopening the dock
feat(settings): add a personal sidebar background color
test: cover legacy preference fallback
```

For breaking changes, use `!` after the type or scope and include a `BREAKING CHANGE:` footer with migration instructions. Reference relevant issues in footers when applicable.

These conventions apply to new commits. Do not rewrite shared history solely to translate an existing commit message without explicit coordination: changing historical messages changes commit hashes. The initial commit subject is `feat: create Adminlume by Dilorsoft`.

## Licensing contributions

Submit original contributions under `GPL-2.0-or-later`, consistent with the project license. Only contribute material you have the right to license. Contributors retain copyright in their own work; no copyright assignment is required. Preserve existing notices and document the origin and compatible license of any third-party material.

See [LICENSE](LICENSE), [COPYRIGHT.md](COPYRIGHT.md), and [TRADEMARKS.md](TRADEMARKS.md). The branding policy must not be used to restrict software freedoms granted by the GPL.

## Release documentation

- Keep the plugin header version and the `readme.txt` stable tag aligned with the intended release.
- Record user-facing changes and any upgrade steps in the WordPress readme changelog.
- Set `Tested up to` only after verifying the actual WordPress release. It is intentionally omitted until that verification is available.
- Use a verified WordPress.org username for `Contributors` if publishing to the directory; do not infer it from the author name. The field is currently omitted because no account has been verified.
- Validate `readme.txt` with the [WordPress.org readme validator](https://wordpress.org/plugins/developers/readme-validator/) before submission. Readme formatting alone does not establish directory approval or full guideline compliance.
- Review the [Plugin Directory Guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/), licensing of bundled assets, and release contents before distribution. Include the applicable license text in the release package.
