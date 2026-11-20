(function () {
    'use strict';

    const MIN_SECTIONS = 2;
    const MAX_SECTIONS = 6;
    const MAX_SUMMARY_LENGTH = 190;
    const MODE_LABELS = Object.freeze({
        timeline: 'CHRONOLOGY / 時系列',
        process: 'HOW IT WORKS / 手順と流れ',
        comparison: 'COMPARISON / 比較と整理',
        beforeAfter: 'BEFORE → AFTER / 改善の記録',
        hierarchy: 'STRUCTURE / 構造と関係',
        statistics: 'DATA NOTES / 数字で読む',
        editorial: 'EDITORIAL / 要点を読む'
    });

    function clean(content) {
        return String(content || '').replace(
            /<figure\b[^>]*class=["'][^"']*article-visual--ai-generated[^"']*["'][^>]*>[\s\S]*?<\/figure>/gi,
            ''
        );
    }

    function normalizeText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function summarize(value, limit) {
        const text = normalizeText(value);
        if (!text) return '';
        const max = limit || MAX_SUMMARY_LENGTH;
        if (text.length <= max) return text;
        return text.slice(0, max).replace(/[、。,:：；;・\s]+$/g, '') + '…';
    }

    function collectSections(article) {
        return Array.from(article.querySelectorAll('h2, h3, h4')).map((heading, index) => {
            let next = heading.nextElementSibling;
            let summary = '';
            let listItems = [];
            while (next && !/^H[234]$/.test(next.tagName)) {
                if (!summary && next.tagName === 'P') summary = next.textContent;
                if (!listItems.length && (next.tagName === 'UL' || next.tagName === 'OL')) {
                    listItems = Array.from(next.querySelectorAll('li')).map((item) => summarize(item.textContent, 100)).filter(Boolean).slice(0, 4);
                }
                next = next.nextElementSibling;
            }
            return {
                index,
                title: normalizeText(heading.textContent),
                summary: summarize(summary || listItems.join(' / ')),
                listItems
            };
        }).filter((section) => section.title && (section.summary || section.listItems.length)).slice(0, MAX_SECTIONS);
    }

    function extractMetrics(article) {
        const text = normalizeText(article.textContent);
        const pattern = /(?:19|20)\d{2}年|\d+(?:\.\d+)?\s?(?:%|％|件|人|県|項目|種類|分|時間|日|回|倍|円|px|MB|GB)/g;
        const matches = text.match(pattern) || [];
        const unique = Array.from(new Set(matches));
        return unique.slice(0, 4).map((value) => {
            const position = text.indexOf(value);
            const context = text.slice(Math.max(0, position - 34), Math.min(text.length, position + value.length + 42));
            return { value, context: summarize(context, 84) };
        });
    }

    function detectMode(item, article, sections) {
        const title = String(item.title || '');
        const headings = sections.map((section) => section.title).join(' ');
        const allText = normalizeText(article.textContent);
        const combined = title + ' ' + headings + ' ' + allText.slice(0, 1600);
        const dateCount = (combined.match(/(?:19|20)\d{2}年|(?:1[0-2]|0?[1-9])月\d{1,2}日/g) || []).length;
        const numbered = sections.filter((section) => /^(?:第?\s*)?\d+[.．、)\s]|^[①-⑳]/.test(section.title)).length;
        const hasOrderedList = article.querySelector('ol');
        const hasBeforeAfter = /従来|以前|旧仕様|旧画面|修正前|変更前/.test(combined) && /今回|新仕様|新画面|修正後|変更後|改善後/.test(combined);

        if (hasBeforeAfter && /修正|改善|刷新|変更|移行|統一/.test(title + headings)) return 'beforeAfter';
        if (/比較|違い|対比|比較表|メリット.*デメリット|長所.*短所|AとB|対.*比/.test(title + headings)) return 'comparison';
        if (/年表|沿革|歴史|変遷|時系列|経緯|これまでの歩み|履歴/.test(title + headings) || dateCount >= 3) return 'timeline';
        if (/手順|使い方|設定方法|進め方|流れ|プロセス|ステップ|導入方法|操作方法/.test(title + headings) || (numbered >= 3 && hasOrderedList)) return 'process';
        if (/階層|体系|構造|分類|区分|種類|役割|仕組み|構成図/.test(title + headings) && sections.length >= 3) return 'hierarchy';

        const metrics = extractMetrics(article);
        if (metrics.length >= 3 && /統計|数値|実績|ランキング|割合|集計|データ|結果/.test(title + headings)) return 'statistics';
        return 'editorial';
    }

    function append(parent, tag, text, className) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = String(text);
        parent.appendChild(node);
        return node;
    }

    function makeHeader(figure, item, mode) {
        const header = append(figure, 'header', null, 'column-native-visual__header');
        append(header, 'p', MODE_LABELS[mode], 'column-native-visual__eyebrow');
        append(header, 'h2', mode === 'editorial' ? 'この記事の要点を、ひと目で。' : item.title || '記事のポイント', 'column-native-visual__title');
        append(header, 'p', mode === 'editorial'
            ? summarize(item.desc || '本文の見出しと説明から、重要な論点を整理しました。', 150)
            : '本文に記載された情報を、内容に合うかたちで整理しています。', 'column-native-visual__description');
    }

    function renderTimeline(body, sections) {
        const list = append(body, 'ol', null, 'column-visual-timeline');
        sections.forEach((section, index) => {
            const item = append(list, 'li', null, 'column-visual-timeline__item');
            const marker = append(item, 'span', String(index + 1).padStart(2, '0'), 'column-visual-timeline__marker');
            marker.setAttribute('aria-hidden', 'true');
            const copy = append(item, 'div', null, 'column-visual-timeline__copy');
            append(copy, 'h3', section.title, 'column-visual-timeline__title');
            append(copy, 'p', section.summary, 'column-visual-timeline__summary');
        });
    }

    function renderProcess(body, sections) {
        const list = append(body, 'ol', null, 'column-visual-process');
        sections.forEach((section, index) => {
            const step = append(list, 'li', null, 'column-visual-process__step');
            append(step, 'span', 'STEP ' + String(index + 1).padStart(2, '0'), 'column-visual-process__index');
            append(step, 'h3', section.title, 'column-visual-process__title');
            append(step, 'p', section.summary, 'column-visual-process__summary');
            if (section.listItems.length) {
                const details = append(step, 'ul', null, 'column-visual-process__details');
                section.listItems.slice(0, 3).forEach((entry) => append(details, 'li', entry, ''));
            }
        });
    }

    function renderComparison(body, sections) {
        const grid = append(body, 'div', null, 'column-visual-compare');
        sections.slice(0, 4).forEach((section, index) => {
            const panel = append(grid, 'section', null, 'column-visual-compare__panel');
            append(panel, 'span', '0' + (index + 1), 'column-visual-compare__number');
            append(panel, 'h3', section.title, 'column-visual-compare__title');
            append(panel, 'p', section.summary, 'column-visual-compare__summary');
            if (section.listItems.length) {
                const list = append(panel, 'ul', null, 'column-visual-compare__details');
                section.listItems.slice(0, 3).forEach((entry) => append(list, 'li', entry, ''));
            }
        });
    }

    function renderBeforeAfter(body, sections) {
        const pair = append(body, 'div', null, 'column-visual-before-after');
        const before = sections.find((section) => /従来|以前|旧|修正前|変更前/.test(section.title)) || sections[0];
        const after = sections.find((section) => /今回|新|修正後|変更後|改善後/.test(section.title)) || sections[1];
        [[before, 'BEFORE', 'column-visual-before-after__panel is-before'], [after, 'AFTER', 'column-visual-before-after__panel is-after']].forEach(([section, label, className]) => {
            const panel = append(pair, 'section', null, className);
            append(panel, 'p', label, 'column-visual-before-after__label');
            append(panel, 'h3', section.title, 'column-visual-before-after__title');
            append(panel, 'p', section.summary, 'column-visual-before-after__summary');
        });
        append(pair, 'p', '変化のポイント', 'column-visual-before-after__bridge');
    }

    function renderHierarchy(body, sections) {
        const stack = append(body, 'ol', null, 'column-visual-hierarchy');
        sections.slice(0, 5).forEach((section, index) => {
            const level = append(stack, 'li', null, 'column-visual-hierarchy__level');
            append(level, 'span', 'L' + (index + 1), 'column-visual-hierarchy__rank');
            const copy = append(level, 'div', null, 'column-visual-hierarchy__copy');
            append(copy, 'h3', section.title, 'column-visual-hierarchy__title');
            append(copy, 'p', section.summary, 'column-visual-hierarchy__summary');
        });
    }

    function renderStatistics(body, article) {
        const metrics = extractMetrics(article);
        const grid = append(body, 'div', null, 'column-visual-stats');
        metrics.forEach((metric, index) => {
            const card = append(grid, 'div', null, 'column-visual-stats__item');
            append(card, 'span', '0' + (index + 1), 'column-visual-stats__index');
            append(card, 'strong', metric.value, 'column-visual-stats__value');
            append(card, 'p', metric.context, 'column-visual-stats__context');
        });
    }

    function renderEditorial(body, sections, item) {
        const lead = append(body, 'div', null, 'column-visual-editorial__lead');
        append(lead, 'span', 'KEY TAKEAWAYS', 'column-visual-editorial__label');
        append(lead, 'p', summarize(item.desc || sections[0].summary, 210), 'column-visual-editorial__statement');

        const list = append(body, 'ol', null, 'column-visual-editorial__chapters');
        sections.slice(0, 4).forEach((section, index) => {
            const chapter = append(list, 'li', null, 'column-visual-editorial__chapter');
            append(chapter, 'span', String(index + 1).padStart(2, '0'), 'column-visual-editorial__number');
            const copy = append(chapter, 'div', null, 'column-visual-editorial__copy');
            append(copy, 'h3', section.title, 'column-visual-editorial__title');
            append(copy, 'p', section.summary, 'column-visual-editorial__summary');
        });
    }

    function createVisual(item, article, sections) {
        const mode = detectMode(item, article, sections);
        const figure = document.createElement('figure');
        figure.className = 'column-native-visual column-native-visual--' + mode;
        figure.setAttribute('aria-label', '記事内容を整理したインフォグラフィック');
        makeHeader(figure, item, mode);
        const body = append(figure, 'div', null, 'column-native-visual__body');

        if (mode === 'timeline') renderTimeline(body, sections);
        else if (mode === 'process') renderProcess(body, sections);
        else if (mode === 'comparison') renderComparison(body, sections);
        else if (mode === 'beforeAfter') renderBeforeAfter(body, sections);
        else if (mode === 'hierarchy') renderHierarchy(body, sections);
        else if (mode === 'statistics') renderStatistics(body, article);
        else renderEditorial(body, sections, item);

        append(figure, 'figcaption', '記事本文の記述をもとに構成しています。本文にない数値・事実・関係性は補っていません。', 'column-native-visual__caption');
        return figure;
    }

    function mount(item, container) {
        if (!item || !container || !Number.isFinite(Number(item.id))) return;
        const article = container.querySelector('.column-reader-body .article-content .article-content')
            || container.querySelector('.column-reader-body .article-content');
        if (!article || article.querySelector('.column-native-visual')) return;
        const sections = collectSections(article);
        if (sections.length < MIN_SECTIONS) return;

        const figure = createVisual(item, article, sections);
        const opening = Array.from(article.children).filter((element) => element.tagName === 'P').slice(0, 2);
        const anchor = opening[1] || opening[0];
        if (anchor && anchor.parentElement === article) anchor.insertAdjacentElement('afterend', figure);
        else article.insertBefore(figure, article.firstChild);
    }

    window.TenmeiColumnVisuals = Object.freeze({ clean, mount });
}());