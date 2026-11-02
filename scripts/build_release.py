#!/usr/bin/env python3
"""Build a reproducible, installable WordPress plugin ZIP using only stdlib."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile


ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = (
    'adminlume.php', 'readme.txt', 'LICENSE', 'COPYRIGHT.md',
    'TRADEMARKS.md',
)
DIRECTORIES = {
    'src': {'.php'},
    'assets': {'.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp',
               '.avif', '.woff', '.woff2', '.ttf', '.otf', '.json'},
    'languages': {'.mo', '.po', '.pot', '.php', '.json'},
}


def validate_version(root: Path, version: str) -> None:
    """Require tag, plugin header, stable tag, and changelog to agree."""
    if not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', version):
        raise ValueError('Use a stable version such as 0.2.0, without the v prefix.')
    header = (root / 'adminlume.php').read_text(encoding='utf-8')
    readme = (root / 'readme.txt').read_text(encoding='utf-8')
    plugin = re.search(r'^\s*\* Version:\s*(\S+)\s*$', header, re.MULTILINE)
    stable = re.search(r'^Stable tag:\s*(\S+)\s*$', readme, re.MULTILINE)
    if not plugin or not stable or plugin.group(1) != version or stable.group(1) != version:
        raise ValueError(
            'Release version must match the plugin header and readme.txt Stable tag. '
            f'Requested={version}, plugin={plugin.group(1) if plugin else "missing"}, '
            f'Stable tag={stable.group(1) if stable else "missing"}. '
            'Commit matching metadata and a changelog entry before creating a new tag.'
        )
    changelog = readme.partition('== Changelog ==')[2].split('\n== ', 1)[0]
    if f'= {version} =' not in changelog.splitlines():
        raise ValueError(f'Missing readme.txt changelog entry for {version}.')


def release_files(root: Path) -> list[Path]:
    """Use a runtime allowlist, not a repository-wide archive or denylist."""
    files = []
    for name in REQUIRED_FILES:
        file = root / name
        if not file.is_file():
            raise ValueError(f'Missing required release file: {name}')
        files.append(file)
    for directory, extensions in DIRECTORIES.items():
        base = root / directory
        if directory != 'languages' and not base.is_dir():
            raise ValueError(f'Missing runtime directory: {directory}')
        if base.is_symlink():
            raise ValueError(f'Symlinks are not allowed in release paths: {directory}')
        if base.exists():
            for file in base.rglob('*'):
                relative = file.relative_to(root)
                if file.is_symlink():
                    raise ValueError(f'Symlinks are not allowed in releases: {relative}')
                if file.is_file() and file.suffix.lower() in extensions and not any(part.startswith('.') for part in relative.parts):
                    files.append(file)
    for file in files:
        if file.is_symlink() or not file.resolve().is_relative_to(root.resolve()):
            raise ValueError(f'Unsafe release path: {file}')
    return sorted(files)


def build_release(root: Path, version: str, output: Path) -> Path:
    """Package runtime files under adminlume/ and write a SHA-256 sidecar."""
    validate_version(root, version)
    files = release_files(root)
    header = (root / 'adminlume.php').read_text(encoding='utf-8')
    requirements = {}
    for label, key in (('Requires at least', 'requires'), ('Requires PHP', 'requires_php')):
        value = re.search(r'^\s*\* ' + re.escape(label) + r':\s*(\S+)\s*$', header, re.MULTILINE)
        if not value or not re.fullmatch(r'\d+\.\d+(?:\.\d+)?', value.group(1)):
            raise ValueError(f'Missing or invalid plugin requirement: {label}')
        requirements[key] = value.group(1)
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f'adminlume-{version}.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for file in files:
            info = zipfile.ZipInfo('adminlume/' + file.relative_to(root).as_posix(), date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            bundle.writestr(info, file.read_bytes(), compresslevel=9)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix('.zip.sha256').write_text(f'{digest}  {archive.name}\n', encoding='ascii')
    readme = (root / 'readme.txt').read_text(encoding='utf-8')
    changelog = readme.partition('== Changelog ==')[2].split('\n== ', 1)[0]
    notes = changelog.partition(f'= {version} =')[2].split('\n= ', 1)[0].strip()
    repository = 'https://github.com/adilorenzo10/adminlume'
    manifest = {
        'schema': 1,
        'version': version,
        **requirements,
        'url': f'{repository}/releases/tag/v{version}',
        'package': f'{repository}/releases/download/v{version}/{archive.name}',
        'sha256': digest,
        'changelog': notes,
    }
    (output / 'adminlume-update.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    return archive


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', required=True, help='Stable version without v, matching plugin metadata.')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    try:
        archive = build_release(ROOT, args.version, args.output_dir)
    except ValueError as error:
        parser.exit(1, f'Release build failed: {error}\n')
    print(f'Built {archive}, {archive.name}.sha256, and adminlume-update.json')


if __name__ == '__main__':
    main()
