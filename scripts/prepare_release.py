#!/usr/bin/env python3
"""Synchronize release metadata before committing and creating a version tag."""

import argparse
from pathlib import Path
import re
import subprocess

from build_release import ROOT, validate_version


VERSION = r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)'


def prepare_release(root: Path, version: str, notes: list[str]) -> None:
    """Update only plugin version, stable tag, and a new changelog entry."""
    if not re.fullmatch(VERSION, version):
        raise ValueError('Use a stable version without the v prefix, such as 0.3.5.')
    if not notes or any(not note.strip() or '\n' in note or '\r' in note for note in notes):
        raise ValueError('Provide at least one non-empty, single-line release note.')
    header_path = root / 'adminlume.php'
    readme_path = root / 'readme.txt'
    header = header_path.read_text(encoding='utf-8')
    readme = readme_path.read_text(encoding='utf-8')
    pattern = r'^([ \t]*\* Version:[ \t]*)(\S+)([ \t]*)$'
    current = re.search(pattern, header, re.MULTILINE)
    if not current:
        raise ValueError('Missing plugin Version header.')
    old_version = current.group(2)
    validate_version(root, old_version)
    if tuple(map(int, version.split('.'))) <= tuple(map(int, old_version.split('.'))):
        raise ValueError(f'New version must be greater than {old_version}.')
    changelog = readme.partition('== Changelog ==')[2].split('\n== ', 1)[0]
    if '== Changelog ==\n' not in readme:
        raise ValueError('Expected a standalone Changelog section header.')
    if f'= {version} =' in changelog.splitlines():
        raise ValueError(f'Changelog entry for {version} already exists; edit it manually instead.')
    new_header = re.sub(pattern, lambda match: match.group(1) + version + match.group(3), header, count=1, flags=re.MULTILINE)
    new_readme = re.sub(r'^(Stable tag:[ \t]*)\S+([ \t]*)$', lambda match: match.group(1) + version + match.group(2), readme, count=1, flags=re.MULTILINE)
    entry = f'\n= {version} =\n\n' + '\n'.join('* ' + note.strip() for note in notes) + '\n'
    new_readme = new_readme.replace('== Changelog ==\n', '== Changelog ==\n' + entry, 1)
    header_path.write_text(new_header, encoding='utf-8')
    readme_path.write_text(new_readme, encoding='utf-8')
    validate_version(root, version)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', required=True, help='Next stable version, without v.')
    parser.add_argument('--note', action='append', required=True, help='Changelog bullet; repeat for additional notes.')
    args = parser.parse_args()
    try:
        if not re.fullmatch(VERSION, args.version):
            raise ValueError('Use a stable version without the v prefix.')
        result = subprocess.run(['git', '-C', str(ROOT), 'show-ref', '--verify', '--quiet', f'refs/tags/v{args.version}'], check=False)
        if result.returncode == 0:
            raise ValueError(f'Tag v{args.version} already exists. Choose a new version; existing tags are not changed.')
        if result.returncode != 1:
            raise ValueError('Could not check existing Git tags. Run from a valid checkout.')
        prepare_release(ROOT, args.version, args.note)
    except (OSError, ValueError) as error:
        parser.exit(1, f'Release preparation failed: {error}\n')
    print(f'Prepared {args.version}: plugin header, Stable tag, and changelog are aligned.')
    print(f'Next: build with --version {args.version}, review and commit the changes, then create tag v{args.version}.')
    print('No commit, tag, or push was performed.')


if __name__ == '__main__':
    main()
