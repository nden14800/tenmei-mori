const LANGUAGE_OPTIONS = [
    { code: 'ja', locale: 'ja', native: '日本語', japanese: '日本語', mark: '日' },
    { code: 'en', locale: 'en', native: 'English', japanese: '英語', mark: 'EN' },
    { code: 'ko', locale: 'ko', native: '한국어', japanese: '韓国語', mark: '한' },
    { code: 'zh', locale: 'zh-CN', native: '简体中文', japanese: '簡体中国語', mark: '简' },
    { code: 'zh_hant', locale: 'zh-TW', native: '繁體中文', japanese: '繁体中国語', mark: '繁' },
    { code: 'fr', locale: 'fr', native: 'Français', japanese: 'フランス語', mark: 'FR' },
    { code: 'de', locale: 'de', native: 'Deutsch', japanese: 'ドイツ語', mark: 'DE' },
    { code: 'es', locale: 'es', native: 'Español', japanese: 'スペイン語', mark: 'ES' },
    { code: 'pt', locale: 'pt-BR', native: 'Português', japanese: 'ポルトガル語', mark: 'PT' },
    { code: 'vi', locale: 'vi', native: 'Tiếng Việt', japanese: 'ベトナム語', mark: 'VI' },
    { code: 'id', locale: 'id', native: 'Bahasa Indonesia', japanese: 'インドネシア語', mark: 'ID' },
    { code: 'th', locale: 'th', native: 'ไทย', japanese: 'タイ語', mark: 'TH' },
];

const state = {
    currentLanguage: 'ja',
    originalNodes: [],
    originalText: new WeakMap(),
    originalAttributeTargets: [],
    originalAttributes: new WeakMap(),
    dictionaries: new Map(),
    dictionaryPromises: new Map(),
    curatedPromise: null,
    translating: false,
    pendingLanguage: null,
    observed: false,
    mutationTimer: null,
    translationRun: 0,
};

function getOption(code) {
    return LANGUAGE_OPTIONS.find((option) => option.code === code) || LANGUAGE_OPTIONS[0];
}

function getElement(id) {
    return document.getElementById(id);
}

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function restoreWhitespace(original, translated) {
    const source = String(original || '');
    const leading = source.match(/^\s*/)?.[0] || '';
    const trailing = source.match(/\s*$/)?.[0] || '';
    return `${leading}${translated}${trailing}`;
}

function setStatus({ title, detail, loading = false, progress = null }) {
    const container = getElement('static-translation-status');
    const titleElement = getElement('static-translation-status-title');
    const detailElement = getElement('static-translation-status-detail');
    const progressElement = getElement('static-translation-progress');
    if (container) container.classList.toggle('is-loading', Boolean(loading));
    if (titleElement) titleElement.textContent = title;
    if (detailElement) detailElement.textContent = detail;
    if (progressElement) {
        progressElement.hidden = progress === null;
        if (progress !== null) progressElement.value = Math.max(0, Math.min(100, Number(progress) || 0));
    }
}

function updateLanguageButtons() {
    document.querySelectorAll('[data-static-language]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.staticLanguage === state.currentLanguage));
        button.disabled = state.translating;
    });
}

function renderLanguageGrid() {
    const grid = getElement('static-translation-language-grid');
    if (!grid) return;
    grid.innerHTML = LANGUAGE_OPTIONS.map((option) => {
        const isCurrent = option.code === state.currentLanguage;
        return `<button class="translation-language-option notranslate" type="button" data-static-language="${option.code}" aria-pressed="${isCurrent}" aria-label="${option.japanese}で表示">
            <span class="translation-language-option__mark" aria-hidden="true">${option.mark}</span>
            <span class="translation-language-option__copy">
                <span class="translation-language-option__native">${option.native}</span>
                <span class="translation-language-option__ja">${option.japanese}</span>
            </span>
        </button>`;
    }).join('');
    grid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-static-language]');
        if (!button || button.disabled) return;
        void selectLanguage(button.dataset.staticLanguage);
    });
}

const EXCLUDED_TRANSLATION_SELECTOR = [
    'script', 'style', 'noscript', 'template', 'svg', 'math',
    '[contenteditable="true"]', '[data-translation-exclude]', '.notranslate', '#translation-dialog',
    '#document-history-dialog', '#site-language-access', '#tutorial-overlay', '#ch-plugin', '.channel-plugin'
].join(',');

const TRANSLATABLE_ATTRIBUTES = ['title', 'placeholder', 'aria-label', 'alt'];

function isExcludedElement(element) {
    return !element || Boolean(element.closest(EXCLUDED_TRANSLATION_SELECTOR));
}

function isExcludedTextNode(node) {
    const parent = node.parentElement;
    if (!parent || !normalizeText(node.nodeValue)) return true;
    if (parent.closest('textarea')) return true;
    return isExcludedElement(parent);
}

function collectTextNodes() {
    const root = document.body;
    if (!root) return [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            return isExcludedTextNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
    });
    const nodes = [];
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!state.originalText.has(node)) {
            state.originalText.set(node, node.nodeValue);
            state.originalNodes.push(node);
        }
        nodes.push(node);
    }
    return nodes;
}

function collectAttributeTargets() {
    const targets = [];
    document.body?.querySelectorAll(TRANSLATABLE_ATTRIBUTES.map((name) => '[' + name + ']').join(',')).forEach((element) => {
        if (isExcludedElement(element)) return;
        TRANSLATABLE_ATTRIBUTES.forEach((name) => {
            if (!element.hasAttribute(name)) return;
            let originals = state.originalAttributes.get(element);
            if (!originals) {
                originals = new Map();
                state.originalAttributes.set(element, originals);
            }
            if (!originals.has(name)) {
                const original = element.getAttribute(name);
                originals.set(name, original);
                state.originalAttributeTargets.push({ element, name, original });
            }
            const original = originals.get(name);
            if (normalizeText(original)) targets.push({ element, name, original });
        });
    });
    return targets;
}

function restoreJapanese() {
    state.originalNodes.forEach((node) => {
        if (node?.isConnected && state.originalText.has(node)) {
            node.nodeValue = state.originalText.get(node);
        }
    });
    state.originalAttributeTargets.forEach(({ element, name, original }) => {
        if (element?.isConnected) element.setAttribute(name, original);
    });
    document.documentElement.lang = 'ja';
}

async function loadCuratedDictionary() {
    if (!state.curatedPromise) {
        state.curatedPromise = fetch('/assets/data/static-translations/curated.json', { credentials: 'same-origin' })
            .then((response) => {
                if (!response.ok) throw new Error('curated_dictionary_http_' + response.status);
                return response.json();
            })
            .catch((error) => {
                state.curatedPromise = null;
                throw error;
            });
    }
    return state.curatedPromise;
}

async function loadTranslationDictionary(language) {
    if (state.dictionaries.has(language)) return state.dictionaries.get(language);
    if (!state.dictionaryPromises.has(language)) {
        const promise = Promise.all([
            fetch(`/assets/data/static-translations/${language}.json`, { credentials: 'same-origin' }).then((response) => {
                if (!response.ok) throw new Error('translation_dictionary_http_' + response.status);
                return response.json();
            }),
            loadCuratedDictionary(),
        ]).then(([legacy, curated]) => {
            const legacyTranslations = legacy?.translations && typeof legacy.translations === 'object' ? legacy.translations : {};
            const curatedTranslations = curated?.languages?.[language] && typeof curated.languages[language] === 'object'
                ? curated.languages[language]
                : {};
            const dictionary = Object.assign({}, legacyTranslations, curatedTranslations);
            state.dictionaries.set(language, dictionary);
            return dictionary;
        }).catch((error) => {
            state.dictionaryPromises.delete(language);
            throw error;
        });
        state.dictionaryPromises.set(language, promise);
    }
    return state.dictionaryPromises.get(language);
}

function applyTranslations(dictionary, nodes, attributeTargets) {
    let translated = 0;
    let total = 0;
    for (const node of nodes) {
        const original = state.originalText.get(node);
        const normalized = normalizeText(original);
        if (!normalized) continue;
        total += 1;
        const value = dictionary[normalized];
        const translatedValue = normalizeText(value);
        if (typeof value === 'string' && translatedValue) {
            node.nodeValue = restoreWhitespace(original, value);
            if (translatedValue !== normalized) translated += 1;
        }
    }
    for (const target of attributeTargets) {
        const normalized = normalizeText(target.original);
        if (!normalized) continue;
        total += 1;
        const value = dictionary[normalized];
        const translatedValue = normalizeText(value);
        if (typeof value === 'string' && translatedValue) {
            target.element.setAttribute(target.name, value);
            if (translatedValue !== normalized) translated += 1;
        }
    }
    return { total, translated };
}

async function selectLanguage(language, { force = false } = {}) {
    const option = getOption(language);
    if (!force && option.code === state.currentLanguage && !state.translating) return;
    if (state.translating) {
        state.pendingLanguage = option.code;
        return;
    }

    const runId = ++state.translationRun;
    state.translating = true;
    state.pendingLanguage = option.code;
    updateLanguageButtons();

    try {
        restoreJapanese();
        if (option.code === 'ja') {
            state.currentLanguage = 'ja';
            setStatus({ title: '日本語を表示中です', detail: '公開時の原文をそのまま表示しています。', loading: false });
            return;
        }

        const nodes = collectTextNodes();
        const attributeTargets = collectAttributeTargets();
        setStatus({
            title: `${option.japanese}の翻訳辞書を読み込んでいます`,
            detail: 'ChatGPT作成の翻訳を優先し、未確認の項目は従来の機械翻訳辞書で補完します。AI・機械翻訳には誤訳や不自然な表現が含まれる場合があるため、重要な内容は日本語原文もご確認ください。辞書はこのサイトから読み込み、ページ本文を翻訳APIへ送信しません。',
            loading: true,
            progress: 25,
        });
        const dictionary = await loadTranslationDictionary(option.code);
        if (runId !== state.translationRun) return;
        const result = applyTranslations(dictionary, nodes, attributeTargets);
        state.currentLanguage = option.code;
        document.documentElement.lang = option.locale;
        setStatus({
            title: `${option.japanese}を表示中です`,
            detail: `辞書から実際に翻訳文へ置き換えた項目は ${result.translated}/${result.total} 件です。AI・機械翻訳のため、重要な内容は日本語原文もご確認ください。ページ本文を翻訳APIへ送信しません。`,
            loading: false,
            progress: 100,
        });
    } catch (error) {
        console.error('Static translation dictionary failed:', error);
        restoreJapanese();
        state.currentLanguage = 'ja';
        setStatus({
            title: '翻訳表示を開始できませんでした',
            detail: 'このサイトの翻訳辞書を読み込めませんでした。通信状況を確認して、もう一度お試しください。',
            loading: false,
        });
    } finally {
        state.translating = false;
        const nextLanguage = state.pendingLanguage !== option.code ? state.pendingLanguage : null;
        state.pendingLanguage = null;
        updateLanguageButtons();
        if (nextLanguage) void selectLanguage(nextLanguage);
    }
}

function observeViewChanges() {
    if (state.observed || !document.body) return;
    const observer = new MutationObserver((mutations) => {
        if (state.currentLanguage === 'ja' || state.translating) return;
        const shouldRefresh = mutations.some((mutation) => {
            const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
            if (!target || isExcludedElement(target)) return false;
            if (mutation.type === 'attributes') return target.matches('.view-section');
            return [...mutation.addedNodes].some((node) => {
                if (node.nodeType === Node.TEXT_NODE) return Boolean(normalizeText(node.nodeValue));
                if (node.nodeType !== Node.ELEMENT_NODE) return false;
                return !isExcludedElement(node);
            });
        });
        if (!shouldRefresh) return;
        window.clearTimeout(state.mutationTimer);
        state.mutationTimer = window.setTimeout(() => {
            if (!state.translating && state.currentLanguage !== 'ja') void selectLanguage(state.currentLanguage, { force: true });
        }, 300);
    });
    observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['class'],
    });
    state.observed = true;
}

function openTranslationPanel() {
    const dialog = getElement('translation-dialog');
    if (dialog && !dialog.open) dialog.showModal();
}

function closeTranslationPanel() {
    const dialog = getElement('translation-dialog');
    if (dialog?.open) dialog.close();
}

function initialize() {
    renderLanguageGrid();
    updateLanguageButtons();
    observeViewChanges();
    window.openTranslationPanel = openTranslationPanel;
    window.closeTranslationPanel = closeTranslationPanel;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
    initialize();
}
