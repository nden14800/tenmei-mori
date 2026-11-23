#!/usr/bin/env python3
"""Build resumable, self-hosted translation dictionaries for the public site.

The script runs translation locally only while preparing a release. Visitors
receive just a small JSON dictionary for the selected language: no browser-side
neural model is distributed and public page text is not sent to a translation
API while a visitor is browsing.

This script only validates and publishes the ChatGPT-authored dictionary.
It never invokes a translation engine. Missing entries remain Japanese.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / 'index.html'
OUTPUT_DIR = ROOT / 'assets' / 'data' / 'static-translations'
SOURCE_LANGUAGE = 'ja'
LANGUAGES = ('en', 'ko', 'zh', 'zh_hant', 'fr', 'de', 'es', 'pt', 'vi', 'id', 'th')
USER_FACING_JS = (
    'assets/js/column-editorial-visuals.js',
    'assets/js/static-translation.js',
    'assets/js/tenmei-ad-easter-egg.js',
    'assets/js/tenmei-ai-agent.js',
    'assets/js/tenmei-mini-games.js',
)
GENERATION_VERSION = 2
JAPANESE_RE = re.compile(r'[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]')
WHITESPACE_RE = re.compile(r'\s+')
TEMPLATE_EXPRESSION_RE = re.compile(r'\$\{(?:[^{}]|\{[^{}]*\})*\}')
IMPLEMENTATION_MARKERS = ('=>', '{', '}', ';', 'class=', 'querySelector', 'innerHTML', 'window.', 'function ', 'const ', 'let ')

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
    for relative_path in USER_FACING_JS:
        script_path = ROOT / relative_path
        if not script_path.is_file():
            raise RuntimeError(f"Missing user-facing translation source: {relative_path}")
        values.update(extract_script_strings(script_path.read_text(encoding='utf-8')))
    return sorted(value for value in values if len(value) <= 5000)


def fingerprint(values: list[str]) -> str:
    return hashlib.sha256('\n'.join(values).encode('utf-8')).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    sources = source_strings()
    if not sources:
        raise RuntimeError("No Japanese visible strings were extracted")
    source_fingerprint = fingerprint(sources)

    curated = json.loads((OUTPUT_DIR / "curated.json").read_text(encoding="utf-8"))
    dictionaries = curated.get("languages", {})
    if sorted(dictionaries) != sorted(LANGUAGES):
        raise RuntimeError("Curated dictionary must contain exactly the supported languages")
    key_sets = {language: set(dictionaries[language]) for language in LANGUAGES}
    expected_keys = key_sets["en"]
    if not expected_keys or any(keys != expected_keys for keys in key_sets.values()):
        raise RuntimeError("All language dictionaries must have identical non-empty keys")
    for language in LANGUAGES:
        if any(not isinstance(value, str) or not value.strip() for value in dictionaries[language].values()):
            raise RuntimeError(f"{language} contains an empty translation")

    manifest = {
        "schemaVersion": 1,
        "sourceLanguage": "ja",
        "languages": list(LANGUAGES),
        "entryCount": len(sources),
        "sourceFingerprint": source_fingerprint,
        "generation": {
            "mode": "chatgpt-authored-only",
            "engine": "ChatGPT-authored contextual translations only; no other translation engine is used",
            "qualityPolicy": "Only reviewed ChatGPT-authored entries are displayed as translations. Missing entries remain in Japanese until ChatGPT-authored translations are added.",
            "traditionalChinese": "Traditional Chinese entries are authored directly by ChatGPT; untranslated entries remain in Japanese.",
            "notice": "The runtime loads only the same-origin ChatGPT-authored curated dictionary. No machine-translation fallback is available and page text is not sent to a translation API.",
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        },
        "curatedFile": "curated.json",
        "curatedGenerationVersion": curated.get("generationVersion", 1),
        "curatedEntryCount": len(expected_keys),
    }
    if args.dry_run:
        print(json.dumps({
            "sourceEntries": len(sources),
            "sourceFingerprint": source_fingerprint,
            "chatgptAuthoredEntries": len(expected_keys),
            "untranslatedEntries": max(0, len(sources) - len(expected_keys)),
            "languages": list(LANGUAGES),
        }, ensure_ascii=False, indent=2))
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + chr(10), encoding="utf-8")
    print(json.dumps({
        "status": "ok",
        "languages": len(LANGUAGES),
        "chatgptAuthoredEntries": len(expected_keys),
        "untranslatedEntries": max(0, len(sources) - len(expected_keys)),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
