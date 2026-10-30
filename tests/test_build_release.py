"""Packaging checks; no WordPress, Docker, or third-party dependencies required."""

import hashlib
from pathlib import Path
import re
import shutil
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
        (self.root / 'src/Runtime.php').write_text('<?php // Runtime fixture.\n')
        (self.root / 'assets/toolbar.css').write_text('/* Runtime fixture. */\n')
        (self.root / 'languages/adminlume-en_US.mo').write_bytes(b'fixture')
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
                'adminlume/languages/adminlume-en_US.mo',
            })

    def test_reproducible_archive_and_checksum(self):
        archive = build_release(self.root, '1.2.3', self.output)
        first = archive.read_bytes()
        build_release(self.root, '1.2.3', self.output)
        self.assertEqual(first, archive.read_bytes())
        self.assertEqual(archive.with_suffix('.zip.sha256').read_text(), f'{hashlib.sha256(first).hexdigest()}  {archive.name}\n')

    def test_mismatched_version_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'must match'):
            build_release(self.root, '1.2.4', self.output)

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
