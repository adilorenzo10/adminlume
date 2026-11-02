"""Packaging checks; no WordPress, Docker, or third-party dependencies required."""

import hashlib
import json
from pathlib import Path
import re
import shutil
import struct
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from build_release import ROOT, REQUIRED_FILES, build_release


class ReleaseBuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'plugin'
        self.root.mkdir()
        for name in REQUIRED_FILES:
            shutil.copyfile(ROOT / name, self.root / name)
        for name in ('src', 'assets', 'tests', 'docs', '.github', 'languages'):
            (self.root / name).mkdir()
        (self.root / 'assets/images').mkdir()
        for name in ('icon.svg', 'icon-128x128.png', 'icon-256x256.png'):
            shutil.copyfile(ROOT / 'assets/images' / name, self.root / 'assets/images' / name)
        (self.root / 'src/Runtime.php').write_text('<?php // Runtime fixture.\n')
        (self.root / 'assets/toolbar.css').write_text('/* Runtime fixture. */\n')
        for name in ('adminlume.pot', 'adminlume-it_IT.po', 'adminlume-it_IT.mo'):
            shutil.copyfile(ROOT / 'languages' / name, self.root / 'languages' / name)
        (self.root / 'tests/private.php').write_text('<?php // Excluded.\n')
        (self.root / 'assets/.env').write_text('PRIVATE=excluded\n')
        (self.root / 'assets/debug.log').write_text('Excluded.\n')
        (self.root / '.github/workflow.yml').write_text('Excluded.\n')
        (self.root / 'docs/development.md').write_text('Excluded.\n')
        # Keep test fixtures independent of the project's next release number.
        header = (self.root / 'adminlume.php').read_text()
        header = re.sub(r'(?m)^(\s*\* Version:)\s*\S+', r'\1 1.2.3', header)
        (self.root / 'adminlume.php').write_text(header)
        (self.root / 'readme.txt').write_text('Stable tag: 1.2.3\n\n== Changelog ==\n\n= 1.2.3 =\n\n* Test release.\n')
        self.output = Path(self.temp.name) / 'dist'

    def test_installable_layout_and_runtime_allowlist(self):
        archive = build_release(self.root, '1.2.3', self.output)
        with zipfile.ZipFile(archive) as bundle:
            self.assertIsNone(bundle.testzip())
            self.assertEqual(set(bundle.namelist()), {
                *('adminlume/' + name for name in REQUIRED_FILES),
                'adminlume/src/Runtime.php', 'adminlume/assets/toolbar.css',
                'adminlume/languages/adminlume.pot',
                'adminlume/languages/adminlume-it_IT.po',
                'adminlume/languages/adminlume-it_IT.mo',
                'adminlume/assets/images/icon.svg',
                'adminlume/assets/images/icon-128x128.png',
                'adminlume/assets/images/icon-256x256.png',
            })

    def test_icon_fallbacks_have_the_documented_dimensions(self):
        for size in (128, 256):
            with self.subTest(size=size):
                data = (self.root / f'assets/images/icon-{size}x{size}.png').read_bytes()
                self.assertEqual(data[:8], b'\x89PNG\r\n\x1a\n')
                self.assertEqual(struct.unpack('>II', data[16:24]), (size, size))
                self.assertLess(len(data), 1024 * 1024)

    def test_reproducible_archive_and_checksum(self):
        archive = build_release(self.root, '1.2.3', self.output)
        first = archive.read_bytes()
        build_release(self.root, '1.2.3', self.output)
        self.assertEqual(first, archive.read_bytes())
        self.assertEqual(archive.with_suffix('.zip.sha256').read_text(), f'{hashlib.sha256(first).hexdigest()}  {archive.name}\n')

    def test_update_manifest_matches_package_and_requirements(self):
        archive = build_release(self.root, '1.2.3', self.output)
        manifest = json.loads((self.output / 'adminlume-update.json').read_text())
        self.assertEqual(manifest['schema'], 1)
        self.assertEqual(manifest['version'], '1.2.3')
        self.assertEqual(manifest['requires'], '6.5')
        self.assertEqual(manifest['requires_php'], '8.1')
        self.assertEqual(manifest['sha256'], hashlib.sha256(archive.read_bytes()).hexdigest())
        self.assertEqual(manifest['package'], 'https://github.com/adilorenzo10/adminlume/releases/download/v1.2.3/adminlume-1.2.3.zip')
        self.assertEqual(manifest['url'], 'https://github.com/adilorenzo10/adminlume/releases/tag/v1.2.3')
        self.assertEqual(manifest['changelog'], '* Test release.')

    def test_invalid_requirements_are_rejected(self):
        header = (self.root / 'adminlume.php').read_text().replace('Requires PHP: 8.1', 'Requires PHP: invalid')
        (self.root / 'adminlume.php').write_text(header)
        with self.assertRaisesRegex(ValueError, 'requirement'):
            build_release(self.root, '1.2.3', self.output)

    def test_mismatched_version_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'must match') as raised:
            build_release(self.root, '1.2.4', self.output)
        self.assertIn('Requested=1.2.4, plugin=1.2.3, Stable tag=1.2.3', str(raised.exception))

    def test_mismatched_stable_tag_is_reported(self):
        readme = (self.root / 'readme.txt').read_text().replace('Stable tag: 1.2.3', 'Stable tag: 1.2.4')
        (self.root / 'readme.txt').write_text(readme)
        with self.assertRaisesRegex(ValueError, 'must match') as raised:
            build_release(self.root, '1.2.3', self.output)
        self.assertIn('Requested=1.2.3, plugin=1.2.3, Stable tag=1.2.4', str(raised.exception))

    def test_invalid_versions_are_rejected(self):
        for version in ('v1.2.3', '1.2.3-rc.1', '../1.2.3', '01.2.3'):
            with self.subTest(version=version), self.assertRaises(ValueError):
                build_release(self.root, version, self.output)

    def test_missing_changelog_is_rejected(self):
        (self.root / 'readme.txt').write_text('Stable tag: 1.2.3\n')
        with self.assertRaisesRegex(ValueError, 'changelog'):
            build_release(self.root, '1.2.3', self.output)

    def test_missing_license_is_rejected(self):
        (self.root / 'LICENSE').unlink()
        with self.assertRaisesRegex(ValueError, 'required release file'):
            build_release(self.root, '1.2.3', self.output)

    def test_symlinks_are_rejected(self):
        (self.root / 'src/linked.php').symlink_to(self.root / 'adminlume.php')
        with self.assertRaisesRegex(ValueError, 'Symlinks'):
            build_release(self.root, '1.2.3', self.output)


if __name__ == '__main__':
    unittest.main()
