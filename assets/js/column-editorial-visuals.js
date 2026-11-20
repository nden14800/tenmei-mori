(function () {
    'use strict';

    const MIN_SECTIONS = 2;
    const MAX_SECTIONS = 4;
    const MAX_SUMMARY_LENGTH = 116;

    function clean(content) {
        return String(content || '').replace(
            /<figure\b[^>]*class=["'][^"']*article-visual--ai-generated[^"']*["'][^>]*>[\s\S]*?<\/figure>/gi,
            ''
        );
    }

    function normalizeText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function summarizeParagraph(value) {
        const text = normalizeText(value);
        if (!text) return '';
        if (text.length <= MAX_SUMMARY_LENGTH) return text;
        return text.slice(0, MAX_SUMMARY_LENGTH).replace(/[、。,:：；;・\s]+$/g, '') + '…';
    }

    function collectSections(article) {
        return Array.from(article.querySelectorAll('h2, h3, h4')).map((heading) => {
            let next = heading.nextElementSibling;
            while (next && next.tagName !== 'P') next = next.nextElementSibling;
            return { title: normalizeText(heading.textContent), summary: summarizeParagraph(next && next.textContent) };
        }).filter((section) => section.title && section.summary).slice(0, MAX_SECTIONS);
    }

    function appendText(parent, tagName, value, className) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        element.textContent = value;
        parent.appendChild(element);
        return element;
    }

    function createVisual(item, sections) {
        const figure = document.createElement('figure');
        figure.className = 'column-native-visual';
        figure.setAttribute('aria-labelledby', 'column-native-visual-title-' + item.id);
        appendText(figure, 'p', 'ARTICLE GUIDE', 'column-native-visual__eyebrow');
        appendText(figure, 'h2', 'この記事の見取り図', 'column-native-visual__title').id = 'column-native-visual-title-' + item.id;
        appendText(figure, 'p', '本文の見出しと説明をもとに、主な論点を整理しています。', 'column-native-visual__description');

        const list = document.createElement('ol');
        list.className = 'column-native-visual__list';
        sections.forEach((section, index) => {
            const row = document.createElement('li');
            row.className = 'column-native-visual__item';
            appendText(row, 'span', String(index + 1).padStart(2, '0'), 'column-native-visual__number');
            appendText(row, 'h3', section.title, 'column-native-visual__item-title');
            appendText(row, 'p', section.summary, 'column-native-visual__item-summary');
            list.appendChild(row);
        });
        figure.appendChild(list);
        appendText(figure, 'figcaption', '記事本文から構成した要点案内です。本文の内容を省略・置換するものではありません。', 'column-native-visual__caption');
        return figure;
    }

    function mount(item, container) {
        if (!item || !container || !Number.isFinite(Number(item.id))) return;
        const article = container.querySelector('.column-reader-body .article-content .article-content')
            || container.querySelector('.column-reader-body .article-content');
        if (!article || article.querySelector('.column-native-visual')) return;
        const sections = collectSections(article);
        if (sections.length < MIN_SECTIONS) return;

        const figure = createVisual(item, sections);
        const opening = Array.from(article.children).filter((element) => element.tagName === 'P').slice(0, 2);
        const anchor = opening[1] || opening[0];
        if (anchor && anchor.parentElement === article) anchor.insertAdjacentElement('afterend', figure);
        else article.insertBefore(figure, article.firstChild);
    }

    window.TenmeiColumnVisuals = Object.freeze({ clean, mount });
}());