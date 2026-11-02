"""Validate gettext source keys and bundled catalogs without WordPress or HTTP."""

import gettext
import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]


def catalog(path):
    """Read the singular gettext entries used by this plugin, including context."""
    entries = {}
    for block in re.split(r'\n\s*\n', path.read_text(encoding='utf-8').strip()):
        fields = {}
        current = None
        for line in block.splitlines():
            if line.startswith('#'):
                continue
            match = re.match(r'^(msgctxt|msgid|msgstr)\s+(".*")$', line)
            if match:
                current = match.group(1)
                fields[current] = json.loads(match.group(2))
            elif line.startswith('"') and current:
                fields[current] += json.loads(line)
            elif line.strip():
                raise ValueError(f'Unsupported catalog syntax in {path}: {line}')
        if fields.get('msgid'):
            key = (fields.get('msgctxt', ''), fields['msgid'])
            if key in entries:
                raise ValueError(f'Duplicate gettext entry: {key}')
            entries[key] = fields.get('msgstr', '')
    return entries


class TranslationTests(unittest.TestCase):
    def test_catalogs_are_complete_and_compiled_without_fuzzy_entries(self):
        template = catalog(ROOT / 'languages/adminlume.pot')
        po_path = ROOT / 'languages/adminlume-it_IT.po'
        italian = catalog(po_path)
        self.assertEqual(template.keys(), italian.keys())
        self.assertNotRegex(po_path.read_text(encoding='utf-8'), r'(?m)^#,.*\bfuzzy\b')
        with (ROOT / 'languages/adminlume-it_IT.mo').open('rb') as file:
            compiled = gettext.GNUTranslations(file)
        self.assertEqual(compiled.info()['language'], 'it_IT')
        for (context, source), translation in italian.items():
            with self.subTest(source=source):
                self.assertTrue(translation)
                self.assertEqual(compiled.pgettext(context, source) if context else compiled.gettext(source), translation)
                self.assertEqual(re.findall(r'%(?:\d+\$)?[sdf]', source), re.findall(r'%(?:\d+\$)?[sdf]', translation))

    def test_all_literal_php_strings_use_the_domain_and_are_in_the_template(self):
        template = catalog(ROOT / 'languages/adminlume.pot')
        pattern = re.compile(r"\b(__|_e|_x|esc_html__|esc_attr__|esc_html_e|esc_attr_e|esc_html_x|esc_attr_x)\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'(?:\s*,\s*'((?:[^'\\]|\\.)*)')?\s*\)")
        matches = 0
        for path in [ROOT / 'adminlume.php', *sorted((ROOT / 'src').glob('*.php'))]:
            for function, source, third, fourth in pattern.findall(path.read_text(encoding='utf-8')):
                context, domain = (third, fourth) if function.endswith('_x') or function == '_x' else ('', third)
                source = source.replace("\\'", "'").replace('\\\\', '\\')
                with self.subTest(file=path.name, source=source):
                    self.assertEqual(domain, 'adminlume')
                    self.assertIn((context, source), template)
                matches += 1
        self.assertGreater(matches, 30)

    def test_english_is_the_source_and_context_is_preserved(self):
        template = catalog(ROOT / 'languages/adminlume.pot')
        self.assertIn(('', 'Enable Adminlume for me'), template)
        self.assertNotIn(('', 'Abilita Adminlume per me'), template)
        self.assertIn(('panel corner radius', 'Medium'), template)
        self.assertEqual(gettext.NullTranslations().gettext('Hide admin toolbar'), 'Hide admin toolbar')


if __name__ == '__main__':
    unittest.main()
