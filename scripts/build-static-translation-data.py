#!/usr/bin/env python3
"""Build resumable, self-hosted translation dictionaries for the public site.

The script runs translation locally only while preparing a release. Visitors
receive just a small JSON dictionary for the selected language: no browser-side
neural model is distributed and public page text is not sent to a translation
API while a visitor is browsing.

Version 2 uses a small, source-controlled terminology map for site-specific
names, a quality-oriented CTranslate2 beam search, and an English-stage safety
gate. The terminology map is applied mechanically during every regeneration;
it is not a per-page or per-sentence hand-translation workflow.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

import argostranslate.package
import argostranslate.translate
from opencc import OpenCC

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / 'index.html'
OUTPUT_DIR = ROOT / 'assets' / 'data' / 'static-translations'
SOURCE_LANGUAGE = 'ja'
LANGUAGES = ('en', 'ko', 'zh', 'zh_hant', 'fr', 'de', 'es', 'pt', 'vi', 'id', 'th')
GENERATION_VERSION = 2
JAPANESE_RE = re.compile(r'[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]')
WHITESPACE_RE = re.compile(r'\s+')
TEMPLATE_EXPRESSION_RE = re.compile(r'\$\{(?:[^{}]|\{[^{}]*\})*\}')
IMPLEMENTATION_MARKERS = ('=>', '{', '}', ';', 'class=', 'querySelector', 'innerHTML', 'window.', 'function ', 'const ', 'let ')

# These are enduring service and UI terms, not individually maintained page
# translations. Tokens keep them intact while local machine translation handles
# surrounding prose. Canonical English labels remain recognisable in every
# language, which is preferable to a mistranslated feature name.
GLOSSARY = (
    ('天命乃杜', 'X01X', 'Tenmei no Mori'),
    ('おみくじの轍', 'X02X', 'Omikuji History'),
    ('参拝の記録', 'X03X', 'Pilgrimage Records'),
    ('参拝証', 'X04X', 'Pilgrimage Certificate'),
    ('社務所だより', 'X05X', 'Shrine Office News'),
    ('神籤草子', 'X06X', 'Omikuji Journal'),
    ('全国・土地の運気', 'X07X', 'Regional Fortune'),
    ('最強運勢ランキング', 'X08X', 'Fortune Ranking'),
    ('天命の授与所', 'X09X', 'Tenmei Grant Hall'),
    ('AI夢占い', 'X10X', 'AI Dream Interpretation'),
    ('12星座', 'X11X', 'Zodiac Signs'),
    ('血液型', 'X12X', 'Blood Type'),
    ('全48通り', 'X13X', 'All 48 Combinations'),
    ('本日の運勢', 'X14X', "Today's Fortune"),
    ('参拝履歴', 'X15X', 'Pilgrimage History'),
    ('参拝者名', 'X16X', 'Visitor Name'),
    ('御守', 'X17X', 'Digital Amulets'),
    ('巡り', 'X18X', 'Fortune Flow'),
)
GLOSSARY_BY_TOKEN = {token: canonical for _, token, canonical in GLOSSARY}
GLOSSARY_SORTED = tuple(sorted(GLOSSARY, key=lambda item: max(len(item[0]), len(item[2])), reverse=True))
GARBLED_EN_RE = re.compile(r'[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]|[。、]|⁇')
ASCII_LETTER_RE = re.compile(r'[A-Za-z]')

# Known short-label failures from the legacy Japanese→English model.
# Keep these reviewed labels stable across dictionary regeneration.
ENGLISH_OVERRIDES = {
    ' "You are here",
    ' "Will come true soon",
    ' "View the quick guide again",
    ' "Select",
    ' "Accessibility",
    ' "Content",
    ' "Back to list",
    ' "Traffic safety",
    ' "Hold back for now",
    ' "Sign up",
    ' "Register or log in here",
    ' "Persevere",
    ' "Unlikely to come true",
    ' "Will not come true",
    ' "Enter passphrase",
    ' "Syncing…",
    ' "Something went wrong",
    ' "Difficulties lie ahead",
    ' "Transfer of the land",
    ' "Wish fulfilled",
    ' "Will come true later",
    ' "Pay attention",
    ' "Hearts will connect",
    ' "On the road to recovery",
    ' "Organize the information",
    ' "Update",
    ' "Go to first",
    ' "Go to last",
    ' "Skip to content",
    ' "They will not come; an obstacle may arise",
    ' "They will not come; only an inquiry",
    ' "They will not come; only a message",
    ' "They will not come, but you will hear from them",
    ' "They will come; expect a message",
    ' "Correct!",
    ' "Ask for advice",
    ' "Checking",
    ' "Checking…",
    ' "Will come true before long",
    ' "Thinking…",
    ' "Good fortune lies ahead",
    ' "Turn it into action",
    ' "Authorizing…",
    ' "Stronger authentication",
    ' "Sincerity will get through",
    ' "Interpretation",
    ' "Interpreting…",
    ' "Sending…",
    ' "Will come true after a delay",
    ' "Will come true by taking a detour",
    ' "Delivery worker",
    ' "Important notices",
    ' "Calculating…",
    ' "Encounter difficulties",
    ' "Take care of your health",
    ' "Proceed with confidence",
    ' "Please see the details.",
    ' "Use the table of contents to jump to the relevant guide",
    ' "Note: This site sends email requests to Maileroo's API. Maileroo is based in Australia and may retain email content for up to 90 days for troubleshooting and support. For details, see Maileroo's data-use policy."
}




class VisibleTextCollector(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ignored_depth = 0
        self.values: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style', 'noscript', 'svg', 'template'}:
            self.ignored_depth += 1

    def handle_endtag(self, tag):
        if tag in {'script', 'style', 'noscript', 'svg', 'template'} and self.ignored_depth:
            self.ignored_depth -= 1

    def handle_data(self, data):
        if not self.ignored_depth:
            self.values.extend(normalize_candidate(data))


def normalize_candidate(value: str) -> list[str]:
    value = html.unescape(value).replace('\\n', '\n').replace('\\t', '\t').strip()
    if not value or value.startswith('%c') or not JAPANESE_RE.search(value):
        return []
    value = WHITESPACE_RE.sub(' ', value)
    if any(marker in value for marker in IMPLEMENTATION_MARKERS):
        return []
    return [value]


def extract_script_strings(source: str) -> list[str]:
    values: list[str] = []
    patterns = (
        re.compile(r"(['\"])((?:\\.|(?!\1)[^\r\n])*)\1"),
        re.compile(r'`((?:\\.|[^`]){0,1000})`'),
    )
    for pattern in patterns:
        for match in pattern.finditer(source):
            literal = match.group(2) if match.lastindex == 2 else match.group(1)
            literal = TEMPLATE_EXPRESSION_RE.sub('', literal)
            literal = literal.replace('\\\\n', '\n').replace('\\\\t', '\t').replace('\\\\"', '"').replace("\\\\'", "'")
            if len(literal) > 1000 or not JAPANESE_RE.search(literal):
                continue
            collector = VisibleTextCollector()
            try:
                collector.feed(literal)
                collector.close()
                values.extend(collector.values)
            except Exception:
                continue
    return values


def source_strings() -> list[str]:
    source = INDEX_PATH.read_text(encoding='utf-8')
    collector = VisibleTextCollector()
    collector.feed(source)
    collector.close()
    values = set(collector.values)
    for script in re.findall(r'<script\b[^>]*>(.*?)</script\s*>', source, re.IGNORECASE | re.DOTALL):
        values.update(extract_script_strings(script))
    return sorted(value for value in values if len(value) <= 5000)


def fingerprint(values: list[str]) -> str:
    return hashlib.sha256('\n'.join(values).encode('utf-8')).hexdigest()


def protect_glossary(value: str) -> str:
    """Replace site terms or their English pivot labels with robust tokens."""
    protected = value
    for source_term, token, canonical in GLOSSARY_SORTED:
        protected = protected.replace(source_term, token).replace(canonical, token)
    return protected


def restore_glossary(value: str, original: str) -> str:
    """Restore all known term tokens and guarantee labels for mentioned terms."""
    restored = value
    for source_term, token, canonical in GLOSSARY_SORTED:
        # Translators may preserve either plain or bracketed token notation.
        restored = restored.replace(f'[{token}]', canonical).replace(token, canonical)
        if (source_term in original or canonical in original) and canonical not in restored:
            restored = f'{canonical}: {restored}' if restored else canonical
    return WHITESPACE_RE.sub(' ', restored).strip()


def apply_english_overrides(translations: dict[str, str]) -> dict[str, str]:
    for source, translated in ENGLISH_OVERRIDES.items():
        if source in translations:
            translations[source] = translated
    return translations


def english_is_garbled(value: str) -> bool:
    return not value.strip() or bool(GARBLED_EN_RE.search(value))


def english_is_unsafe(source: str, value: str) -> bool:
    """Reject clearly unreliable short-label output without hand-translating pages."""
    source_compact = WHITESPACE_RE.sub('', source)
    target = value.strip()
    if english_is_garbled(target):
        return True
    if target.casefold() in {'contact us', 'click here for more information.', 'click here to register and log in.'}:
        return True
    # Decorative glyphs and two-character labels are often misread as unrelated
    # English words by generic models. Keeping the Japanese glyph is clearer.
    if len(source_compact) <= 2:
        return True
    # A one-word output for a longer Japanese heading is a common truncation
    # failure (for example, unrelated navigation words). Do not display it.
    if len(source_compact) >= 4 and len(target) < max(5, len(source_compact) // 2):
        return True
    # An all-caps term not present in the source indicates an accidental label
    # substitution rather than a translation.
    letters = ''.join(character for character in target if character.isalpha())
    if letters and letters.isupper() and not ASCII_LETTER_RE.search(source):
        return True
    # Personal/session labels are intentionally outside the public-text scope.
    return 'ゲスト' in source_compact


def installed_pairs() -> set[tuple[str, str]]:
    pairs = set()
    for source in argostranslate.translate.get_installed_languages():
        for target in source.translations_from:
            pairs.add((source.code, target.to_lang.code))
    return pairs


def ensure_model(source_code: str, target_code: str) -> None:
    if (source_code, target_code) in installed_pairs():
        return
    argostranslate.package.update_package_index()
    package = next((item for item in argostranslate.package.get_available_packages() if item.from_code == source_code and item.to_code == target_code), None)
    if package is None:
        raise RuntimeError(f'Argos model unavailable: {source_code}->{target_code}')
    print(f'Installing local Argos model: {source_code}->{target_code}', flush=True)
    argostranslate.package.install_from_path(package.download())


def translate_one(text: str, source_code: str, target_code: str) -> str:
    if len(text) <= 1200:
        return argostranslate.translate.translate(text, source_code, target_code)
    pieces = re.split(r'(?<=[。！？.!?])\s*', text)
    output, buffer = [], ''
    for piece in pieces:
        if not piece:
            continue
        if buffer and len(buffer) + len(piece) > 1200:
            output.append(argostranslate.translate.translate(buffer, source_code, target_code))
            buffer = piece
        else:
            buffer += piece
    if buffer:
        output.append(argostranslate.translate.translate(buffer, source_code, target_code))
    return ' '.join(output)


def translate_batch(values: list[str], source_code: str, target_code: str) -> list[str]:
    cached = argostranslate.translate.get_translation_from_codes(source_code, target_code)
    if cached is None:
        raise RuntimeError(f'Installed Argos model unavailable: {source_code}->{target_code}')
    cached.translate(values[0])
    package_translation = cached.underlying
    package = package_translation.pkg
    translator = package_translation.translator
    tokenized = [package.tokenizer.encode(value) for value in values]
    prefix = [[package.target_prefix]] * len(tokenized) if package.target_prefix else None
    # Japanese is the source of truth and receives the more expensive beam
    # search. Derived languages consume that cleaned English stage and use a
    # light greedy decode so a full 11-language release remains practical.
    primary_quality_pass = source_code == 'ja' and target_code == 'en'
    results = translator.translate_batch(
        tokenized,
        target_prefix=prefix,
        replace_unknowns=False,
        max_batch_size=512,
        batch_type='tokens',
        beam_size=4 if primary_quality_pass else 1,
        num_hypotheses=1,
        length_penalty=1.0 if primary_quality_pass else 0.8,
        disable_unk=True,
        return_scores=False,
    )
    output = []
    for result in results:
        value = package.tokenizer.decode(result.hypotheses[0])
        if package.target_prefix and value.startswith(package.target_prefix):
            value = value[len(package.target_prefix):]
        output.append(value[1:] if value.startswith(' ') else value)
    return output


def translate_mapping(values: list[str], source_code: str, target_code: str, label: str) -> dict[str, str]:
    ensure_model(source_code, target_code)
    output: dict[str, str] = {}
    short = [value for value in values if len(value) <= 1200]
    long = [value for value in values if len(value) > 1200]
    total, completed, guarded = len(values), 0, 0
    for start in range(0, len(short), 64):
        batch = short[start:start + 64]
        protected = [protect_glossary(value) for value in batch]
        translated_batch = translate_batch(protected, source_code, target_code)
        for source, translated in zip(batch, translated_batch, strict=True):
            value = restore_glossary(translated, source)
            if source_code == 'ja' and target_code == 'en' and english_is_unsafe(source, value):
                value = source
                guarded += 1
            output[source] = value
        completed += len(batch)
        print(f'{label}: {completed}/{total}', flush=True)
    for source in long:
        translated = translate_one(protect_glossary(source), source_code, target_code)
        value = restore_glossary(translated, source)
        if source_code == 'ja' and target_code == 'en' and english_is_garbled(value):
            value = source
            guarded += 1
        output[source] = value
        completed += 1
        print(f'{label}: {completed}/{total}', flush=True)
    if guarded:
        print(f'{label}: kept Japanese original for {guarded} machine-detected broken English entries', flush=True)
    return output


def read_manifest() -> dict:
    path = OUTPUT_DIR / 'manifest.json'
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        return {}


def write_dictionary(language: str, translations: dict[str, str], source_fingerprint: str) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        'schemaVersion': 1,
        'generationVersion': GENERATION_VERSION,
        'sourceLanguage': SOURCE_LANGUAGE,
        'targetLanguage': language,
        'sourceFingerprint': source_fingerprint,
        'translations': translations,
    }
    (OUTPUT_DIR / f'{language}.json').write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


def write_manifest(source_fingerprint: str, entry_count: int) -> None:
    previous = read_manifest()
    files = {language: f'{language}.json' for language in LANGUAGES if (OUTPUT_DIR / f'{language}.json').exists()}
    sizes = {language: (OUTPUT_DIR / file_name).stat().st_size for language, file_name in files.items()}
    curated_path = OUTPUT_DIR / 'curated.json'
    curated = {}
    if curated_path.exists():
        try:
            curated = json.loads(curated_path.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            curated = {}
    curated_languages = curated.get('languages', {})
    curated_entry_count = len(curated_languages.get('en', {}))
    has_curated = curated_entry_count > 0
    generation = {
        'mode': 'static-dictionary-with-chatgpt-curated-overrides' if has_curated else 'build-time-local-translation',
        'engine': 'ChatGPT-authored contextual translations; legacy Argos entries are fallback only while migration is in progress' if has_curated else 'Argos Translate (OpenNMT/CTranslate2, local beam search)',
        'qualityPolicy': 'ChatGPT-authored entries take precedence; legacy machine-generated entries remain fallback only until every source key is reviewed.' if has_curated else 'Machine-detected corrupted English is kept in Japanese rather than shown as a false translation; stable site terms are restored from the release glossary.',
        'traditionalChinese': 'Traditional Chinese curated entries are authored directly; remaining legacy entries are still awaiting review.' if has_curated else 'OpenCC s2twp',
        'notice': 'Visitors load only same-origin static JSON dictionaries. No external translation engine or browser-side model is downloaded. Page text is not sent to a translation API.',
        'generatedAt': datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    }
    payload = {
        'schemaVersion': 1,
        'generationVersion': GENERATION_VERSION,
        'sourceLanguage': SOURCE_LANGUAGE,
        'languages': list(files),
        'files': files,
        'sizes': sizes,
        'entryCount': entry_count,
        'sourceFingerprint': source_fingerprint,
        'generation': generation,
    }
    if has_curated:
        payload['curatedFile'] = 'curated.json'
        payload['curatedGenerationVersion'] = previous.get('curatedGenerationVersion', curated.get('generationVersion', 1))
        payload['curatedEntryCount'] = curated_entry_count
    (OUTPUT_DIR / 'manifest.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\\n', encoding='utf-8')


def dictionary_is_current(language: str, source_fingerprint: str) -> bool:
    path = OUTPUT_DIR / f'{language}.json'
    if not path.exists():
        return False
    try:
        dictionary = json.loads(path.read_text(encoding='utf-8'))
        return (
            dictionary.get('sourceFingerprint') == source_fingerprint
            and dictionary.get('generationVersion') == GENERATION_VERSION
        )
    except json.JSONDecodeError:
        return False


def generate(language: str, sources: list[str], source_fingerprint: str) -> None:
    if dictionary_is_current(language, source_fingerprint):
        print(f'{language}: current dictionary already exists; skipped', flush=True)
        return
    if language == 'en':
        write_dictionary('en', apply_english_overrides(translate_mapping(sources, 'ja', 'en', 'Japanese → English')), source_fingerprint)
    elif language == 'zh_hant':
        if not dictionary_is_current('zh', source_fingerprint):
            generate('zh', sources, source_fingerprint)
        simplified = json.loads((OUTPUT_DIR / 'zh.json').read_text(encoding='utf-8'))['translations']
        converter = OpenCC('s2twp')
        write_dictionary('zh_hant', {source: converter.convert(value) for source, value in simplified.items()}, source_fingerprint)
    else:
        if not dictionary_is_current('en', source_fingerprint):
            generate('en', sources, source_fingerprint)
        english = json.loads((OUTPUT_DIR / 'en.json').read_text(encoding='utf-8'))['translations']
        translatable = [value for source, value in english.items() if value != source]
        target_values = translate_mapping(translatable, 'en', language, f'English → {language}')
        write_dictionary(language, {
            source: source if intermediate == source else target_values[intermediate]
            for source, intermediate in english.items()
        }, source_fingerprint)
    write_manifest(source_fingerprint, len(sources))
    print(f'{language}: saved', flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--languages', nargs='+', choices=LANGUAGES, default=list(LANGUAGES))
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--repair-existing', action='store_true', help='Apply the conservative English quality gate to existing dictionaries without retranslating.')
    args = parser.parse_args()
    sources = source_strings()
    if not sources:
        raise RuntimeError('No Japanese visible strings were extracted')
    source_fingerprint = fingerprint(sources)
    if args.dry_run:
        print(json.dumps({
            'entries': len(sources),
            'sourceFingerprint': source_fingerprint,
            'languages': args.languages,
            'generationVersion': GENERATION_VERSION,
            'glossaryTerms': len(GLOSSARY),
        }, ensure_ascii=False, indent=2))
        return
    if args.repair_existing:
        english_path = OUTPUT_DIR / 'en.json'
        if not english_path.exists():
            raise RuntimeError('English dictionary is required before --repair-existing')
        english = json.loads(english_path.read_text(encoding='utf-8'))['translations']
        english = apply_english_overrides(english)
        fallback_sources = {source for source, value in english.items() if english_is_unsafe(source, value)}
        for source in fallback_sources:
            english[source] = source
        write_dictionary('en', english, source_fingerprint)
        if fallback_sources:
            for language in LANGUAGES:
                if language == 'en':
                    continue
                path = OUTPUT_DIR / f'{language}.json'
                if not path.exists():
                    continue
                translations = json.loads(path.read_text(encoding='utf-8'))['translations']
                for source in fallback_sources:
                    if source in translations:
                        translations[source] = source
                write_dictionary(language, translations, source_fingerprint)
        write_manifest(source_fingerprint, len(sources))
        print(f'quality repair: kept Japanese original for {len(fallback_sources)} uncertain entries', flush=True)
        return
    for language in args.languages:
        generate(language, sources, source_fingerprint)
    write_manifest(source_fingerprint, len(sources))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Static translation generation failed: {error}', file=sys.stderr)
        raise
