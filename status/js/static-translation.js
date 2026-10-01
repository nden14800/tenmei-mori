const BERGAMOT_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@browsermt/bergamot-translator@0.4.9/translator.js';
const BERGAMOT_REGISTRY_URL = 'https://storage.googleapis.com/bergamot-models-sandbox/0.3.3/registry.json';
const BERGAMOT_DOWNLOAD_TIMEOUT = 0;

const LANGUAGE_OPTIONS = [
    { code: 'ja', locale: 'ja', bergamot: 'ja', native: '日本語', japanese: '日本語', mark: '日' },
    { code: 'en', locale: 'en', bergamot: 'en', native: 'English', japanese: '英語', mark: 'EN' },
    { code: 'ko', locale: 'ko', bergamot: 'ko', native: '한국어', japanese: '韓国語', mark: '한' },
    { code: 'zh', locale: 'zh-CN', bergamot: 'zh', native: '简体中文', japanese: '簡体中国語', mark: '简' },
    { code: 'fr', locale: 'fr', bergamot: 'fr', native: 'Français', japanese: 'フランス語', mark: 'FR' },
    { code: 'de', locale: 'de', bergamot: 'de', native: 'Deutsch', japanese: 'ドイツ語', mark: 'DE' },
    { code: 'es', locale: 'es', bergamot: 'es', native: 'Español', japanese: 'スペイン語', mark: 'ES' },
    { code: 'pt', locale: 'pt', bergamot: 'pt', native: 'Português', japanese: 'ポルトガル語', mark: 'PT' },
    { code: 'vi', locale: 'vi', bergamot: 'vi', native: 'Tiếng Việt', japanese: 'ベトナム語', mark: 'VI' },
    { code: 'id', locale: 'id', bergamot: 'id', native: 'Bahasa Indonesia', japanese: 'インドネシア語', mark: 'ID' },
    { code: 'th', locale: 'th', bergamot: 'th', native: 'ไทย', japanese: 'タイ語', mark: 'TH' },
];

const state = {
    currentLanguage: 'ja',
    originalNodes: [],
    originalText: new WeakMap(),
    translatedTextCache: new Map(),
    translator: null,
    translatorLanguage: null,
    translatorModulePromise: null,
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

function isExcludedTextNode(node) {
    const parent = node.parentElement;
    if (!parent || !normalizeText(node.nodeValue)) return true;
    return Boolean(parent.closest([
        'script', 'style', 'noscript', 'template', 'svg', 'math', 'textarea', 'input', 'select', 'option', 'button', '[role="button"]',
        '[contenteditable="true"]', '[data-translation-exclude]', '.notranslate', '#sidebar', '#translation-dialog',
        '#document-history-dialog', '#site-language-access', '#tutorial-overlay', '#ch-plugin', '.channel-plugin',
        '[aria-live]'
    ].join(',')));
}

function collectTextNodes() {
    const root = document.querySelector('.view-section.active') || document.getElementById('main-content') || document.body;
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

function restoreJapanese() {
    state.originalNodes.forEach((node) => {
        if (node?.isConnected && state.originalText.has(node)) {
            node.nodeValue = state.originalText.get(node);
        }
    });
    document.documentElement.lang = 'ja';
}

async function loadBergamotModule() {
    if (!state.translatorModulePromise) {
        state.translatorModulePromise = import(BERGAMOT_MODULE_URL).catch((error) => {
            state.translatorModulePromise = null;
            throw error;
        });
    }
    return state.translatorModulePromise;
}

async function ensureTranslator(language) {
    const option = getOption(language);
    if (state.translator && state.translatorLanguage === option.code) return state.translator;

    if (state.translator) {
        try { state.translator.delete(); } catch (error) { console.warn('Bergamot translator cleanup failed:', error); }
        state.translator = null;
        state.translatorLanguage = null;
    }

    const module = await loadBergamotModule();
    if (!module?.BatchTranslator) throw new Error('bergamot_batch_translator_unavailable');
    state.translator = new module.BatchTranslator({
        pivotLanguage: 'en',
        registryUrl: BERGAMOT_REGISTRY_URL,
        downloadTimeout: BERGAMOT_DOWNLOAD_TIMEOUT,
        workers: 1,
        batchSize: 8,
        cacheSize: 2048,
    });
    state.translatorLanguage = option.code;
    return state.translator;
}

async function translateUniqueTexts(language, texts, runId) {
    const option = getOption(language);
    const translator = await ensureTranslator(language);
    const unique = [...new Set(texts.map(normalizeText).filter(Boolean))];
    const missing = unique.filter((text) => !state.translatedTextCache.has(`${language}\u0000${text}`));

    let completed = unique.length - missing.length;
    const total = unique.length || 1;
    const updateProgress = () => setStatus({
        title: `${option.japanese}を表示しています`,
        detail: `端末内のBergamot翻訳エンジンで本文を処理しています（${completed}/${unique.length}）。初回のみ翻訳モデルをダウンロードします。`,
        loading: true,
        progress: 45 + Math.round((completed / total) * 45),
    });
    updateProgress();

    const batchSize = 32;
    for (let start = 0; start < missing.length; start += batchSize) {
        if (runId !== state.translationRun) return false;
        const batch = missing.slice(start, start + batchSize);
        const results = await Promise.all(batch.map(async (text) => {
            const response = await translator.translate({
                from: 'ja',
                to: option.bergamot,
                text,
                html: false,
                priority: 10,
            });
            return [text, response?.target?.text];
        }));
        results.forEach(([source, translated]) => {
            if (typeof translated === 'string' && normalizeText(translated)) {
                state.translatedTextCache.set(`${language}\u0000${source}`, translated);
            }
            completed += 1;
        });
        updateProgress();
    }
    return runId === state.translationRun;
}

function applyBergamotTranslations(language, nodes) {
    let translatedCount = 0;
    for (const node of nodes) {
        const original = state.originalText.get(node);
        const normalized = normalizeText(original);
        if (!normalized) continue;
        const translated = state.translatedTextCache.get(`${language}\u0000${normalized}`);
        if (typeof translated === 'string' && translated.trim()) {
            node.nodeValue = restoreWhitespace(original, translated);
            translatedCount += 1;
        }
    }
    return { total: nodes.length, translated: translatedCount };
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
            setStatus({ title: '日本語を表示中です', detail: '公開時の原文へ戻しました。', loading: false });
            return;
        }

        const nodes = collectTextNodes();
        const uniqueCount = new Set(nodes.map((node) => normalizeText(state.originalText.get(node))).filter(Boolean)).size;
        setStatus({
            title: `${option.japanese}の翻訳モデルを準備しています`,
            detail: `Firefox Translationsで使われているBergamot系のローカル翻訳エンジンを初期化しています（対象 ${uniqueCount} 件）。`,
            loading: true,
            progress: 10,
        });
        await translateUniqueTexts(option.code, nodes.map((node) => state.originalText.get(node)), runId);
        if (runId !== state.translationRun) return;

        const result = applyBergamotTranslations(option.code, nodes);
        state.currentLanguage = option.code;
        document.documentElement.lang = option.locale;
        setStatus({
            title: `${option.japanese}を表示中です`,
            detail: `端末内のBergamot翻訳エンジンで ${result.translated}/${result.total} 件を翻訳しました。本文は翻訳APIへ送信していません。`,
            loading: false,
            progress: 100,
        });
    } catch (error) {
        console.error('Bergamot translation failed:', error);
        restoreJapanese();
        state.currentLanguage = 'ja';
        setStatus({
            title: '翻訳表示を開始できませんでした',
            detail: 'ローカル翻訳エンジンまたは翻訳モデルの読み込みに失敗しました。通信状況を確認して、もう一度お試しください。',
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
        const activeViewChanged = mutations.some((mutation) => mutation.target instanceof Element && mutation.target.matches('.view-section'));
        if (!activeViewChanged || state.currentLanguage === 'ja' || state.translating) return;
        window.clearTimeout(state.mutationTimer);
        state.mutationTimer = window.setTimeout(() => {
            if (!state.translating && state.currentLanguage !== 'ja') void selectLanguage(state.currentLanguage, { force: true });
        }, 220);
    });
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
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
