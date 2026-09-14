from pathlib import Path
import re

INDEX = Path('index.html')
MARKER = 'tenmei-production-timezone-persistence-fix'

SCRIPT = r'''<script id="tenmei-production-timezone-persistence-fix">
(() => {
    const STORAGE_KEY = 'tenmei_timezone_setting';
    const FALLBACK = 'Asia/Tokyo';

    const validZone = (value) => {
        if (!value || typeof value !== 'string') return false;
        try {
            new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
            return true;
        } catch (_) {
            return false;
        }
    };

    const readZone = () => {
        try {
            const value = localStorage.getItem(STORAGE_KEY);
            return validZone(value) ? value : null;
        } catch (_) {
            return null;
        }
    };

    const persistZone = (value) => {
        if (!validZone(value)) return false;
        try { localStorage.setItem(STORAGE_KEY, value); } catch (_) {}
        try {
            if (typeof AppConfig !== 'undefined' && typeof AppConfig.toggle === 'function') {
                AppConfig.toggle('timeZone', value);
            }
        } catch (_) {}
        try { document.documentElement.dataset.timezone = value; } catch (_) {}
        try {
            if (window.TenmeiTime && typeof window.TenmeiTime.setTimeZone === 'function') {
                window.TenmeiTime.setTimeZone(value);
            }
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('tenmei:timezonechange', { detail: { timeZone: value } }));
        return true;
    };

    const zoneFromControl = (el) => {
        const value = el.value || el.getAttribute('data-timezone') || el.getAttribute('data-time-zone') || el.getAttribute('data-value');
        return validZone(value) ? value : null;
    };

    const isZoneControl = (el) => {
        if (!el || !(el instanceof Element)) return false;
        const identity = [el.id, el.getAttribute('name'), el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('data-setting'), el.getAttribute('data-config-key')]
            .filter(Boolean).join(' ').toLowerCase();
        if (identity.includes('timezone') || identity.includes('time-zone') || identity.includes('タイムゾーン')) return true;
        if (el.matches('select')) {
            return Array.from(el.options || []).some((o) => validZone(o.value) || /タイムゾーン|timezone/i.test(o.textContent || ''));
        }
        return false;
    };

    const bind = (root = document) => {
        root.querySelectorAll('select,button,[role="option"],[data-timezone],[data-time-zone],[data-value]').forEach((el) => {
            if (!isZoneControl(el) || el.dataset.tenmeiTimezoneBound === '1') return;
            el.dataset.tenmeiTimezoneBound = '1';
            const apply = () => {
                const value = zoneFromControl(el);
                if (!value) return;
                if (persistZone(value)) setTimeout(() => location.reload(), 250);
            };
            el.addEventListener('change', apply);
            if (!el.matches('select')) el.addEventListener('click', apply);
        });
    };

    const current = readZone();
    if (current) document.documentElement.dataset.timezone = current;

    window.TenmeiTime = window.TenmeiTime || {};
    if (typeof window.TenmeiTime.getTimeZone !== 'function') {
        window.TenmeiTime.getTimeZone = () => readZone() || FALLBACK;
    }
    if (typeof window.TenmeiTime.setTimeZone !== 'function') {
        window.TenmeiTime.setTimeZone = (value) => persistZone(value);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => bind(), { once: true });
    else bind();

    new MutationObserver((mutations) => {
        if (mutations.some((m) => m.addedNodes.length)) bind();
    }).observe(document.documentElement, { childList: true, subtree: true });
})();
</script>'''

text = INDEX.read_text(encoding='utf-8')
if MARKER not in text:
    match = re.search(r'</body>\s*</html>\s*$', text, re.I)
    if not match:
        raise SystemExit('index.html closing body/html tags not found')
    text = text[:match.start()] + SCRIPT + '\n' + text[match.start():]
    INDEX.write_text(text, encoding='utf-8')

assert MARKER in INDEX.read_text(encoding='utf-8')
print('production timezone persistence fix present')
