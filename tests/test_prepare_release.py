"""Release preparation checks; no Git writes or network access."""

from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from build_release import validate_version
from prepare_release import prepare_release


class PrepareReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.header = '<?php\n/**\n * Version: 0.3.3\n * Requires PHP: 8.1\n */\n// Keep runtime code.\n'
        self.readme = 'Stable tag: 0.3.3\n\n== Description ==\n\nKeep description.\n\n== Changelog ==\n\n= 0.3.3 =\n\n* Previous release.\n\n== Upgrade Notice ==\n\nKeep upgrade notes.\n'
        (self.root / 'adminlume.php').write_text(self.header)
        (self.root / 'readme.txt').write_text(self.readme)

    def test_prepares_matching_versions_and_changelog(self):
        prepare_release(self.root, '0.3.5', ['Fix collapsed hover.', 'Keep the updater.'])
        validate_version(self.root, '0.3.5')
        self.assertEqual((self.root / 'adminlume.php').read_text(), self.header.replace('Version: 0.3.3', 'Version: 0.3.5'))
        readme = (self.root / 'readme.txt').read_text()
        self.assertIn('* Fix collapsed hover.\n* Keep the updater.', readme)
        self.assertLess(readme.index('= 0.3.5 ='), readme.index('= 0.3.3 ='))
        self.assertIn('Keep description.', readme)
        self.assertIn('Keep upgrade notes.', readme)

    def test_equal_older_and_invalid_versions_do_not_modify_files(self):
        for version in ('0.3.3', '0.3.2', 'v0.3.5', '0.3.5-rc.1', '00.3.5', '../0.3.5'):
            with self.subTest(version=version), self.assertRaises(ValueError):
                prepare_release(self.root, version, ['Valid note.'])
            self.assertEqual((self.root / 'adminlume.php').read_text(), self.header)
            self.assertEqual((self.root / 'readme.txt').read_text(), self.readme)

    def test_empty_or_multiline_notes_do_not_modify_files(self):
        for notes in ([], [' '], ['Line one\nLine two'], ['Line one\rLine two']):
            with self.subTest(notes=notes), self.assertRaises(ValueError):
                prepare_release(self.root, '0.3.5', notes)
            self.assertEqual((self.root / 'adminlume.php').read_text(), self.header)
            self.assertEqual((self.root / 'readme.txt').read_text(), self.readme)

    def test_mismatched_current_metadata_is_not_silently_repaired(self):
        readme = self.readme.replace('Stable tag: 0.3.3', 'Stable tag: 0.3.0')
        (self.root / 'readme.txt').write_text(readme)
        with self.assertRaisesRegex(ValueError, 'must match'):
            prepare_release(self.root, '0.3.5', ['Valid note.'])
        self.assertEqual((self.root / 'adminlume.php').read_text(), self.header)
        self.assertEqual((self.root / 'readme.txt').read_text(), readme)

    def test_existing_changelog_is_not_overwritten(self):
        readme = self.readme.replace('== Changelog ==', '== Changelog ==\n\n= 0.3.5 =\n\n* User notes.')
        (self.root / 'readme.txt').write_text(readme)
        with self.assertRaisesRegex(ValueError, 'already exists'):
            prepare_release(self.root, '0.3.5', ['Different note.'])
        self.assertEqual((self.root / 'readme.txt').read_text(), readme)

    def test_prepares_release_after_a_manual_bump_without_changelog(self):
        readme = self.readme.replace('= 0.3.3 =', '= 0.3.0 =')
        (self.root / 'readme.txt').write_text(readme)
        prepare_release(self.root, '0.3.10', ['Add complete release notes.'])
        validate_version(self.root, '0.3.10')
        prepared = (self.root / 'readme.txt').read_text()
        self.assertIn('= 0.3.10 =\n\n* Add complete release notes.', prepared)
        self.assertIn('= 0.3.0 =\n\n* Previous release.', prepared)
        self.assertNotIn('= 0.3.3 =', prepared)

    def test_missing_changelog_section_does_not_modify_files(self):
        readme = self.readme.replace('== Changelog ==', '== Notes ==')
        (self.root / 'readme.txt').write_text(readme)
        with self.assertRaisesRegex(ValueError, 'Changelog section'):
            prepare_release(self.root, '0.3.10', ['Valid note.'])
        self.assertEqual((self.root / 'adminlume.php').read_text(), self.header)
        self.assertEqual((self.root / 'readme.txt').read_text(), readme)


if __name__ == '__main__':
    unittest.main()
