(function () {
  'use strict';

  const MIN_SECTIONS = 2;
  const MAX_SECTIONS = 6;
  const MAX_SUMMARY_LENGTH = 210;
  const MODES = Object.freeze({
    timeline: 'CHRONOLOGY / 時系列',
    process: 'PROCESS / 手順と流れ',
    comparison: 'COMPARISON / 比較と整理',
    beforeAfter: 'BEFORE → AFTER / 改善の記録',
    hierarchy: 'STRUCTURE / 構造と関係',
    statistics: 'DATA NOTES / 数字で読む',
    decision: 'DECISION / 判断の分岐',
    causal: 'CAUSE & EFFECT / 原因と結果',
    lifecycle: 'LIFECYCLE / 段階と循環',
    editorial: 'EDITORIAL MAP / 論点の見取り図'
  });

  function ensureStylesheet() {
    if (document.querySelector('link[data-column-visuals-plus]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/css/column-editorial-visuals-plus.css';
    link.setAttribute('data-column-visuals-plus', '');
    document.head.appendChild(link);
  }

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
    const headings = Array.from(article.querySelectorAll('h2, h3, h4'));
    const contentNodes = Array.from(article.querySelectorAll('p, li'));
    return headings.map((heading, index) => {
      const nextHeading = headings[index + 1] || null;
      const nodes = contentNodes.filter((node) => {
        const after = heading.compareDocumentPosition(node) & 4;
        const beforeNext = !nextHeading || Boolean(node.compareDocumentPosition(nextHeading) & 4);
        return after && beforeNext && !node.closest('figcaption, .column-native-visual');
      });
      const paragraphs = nodes.filter((node) => node.tagName === 'P').map((node) => normalizeText(node.textContent)).filter(Boolean);
      const listItems = nodes.filter((node) => node.tagName === 'LI').map((node) => summarize(node.textContent, 110)).filter(Boolean).slice(0, 4);
      return {
        index,
        title: normalizeText(heading.textContent),
        summary: summarize(paragraphs.slice(0, 2).join(' '), MAX_SUMMARY_LENGTH) || summarize(listItems.join(' / ')),
        listItems,
        sourceText: normalizeText([heading.textContent, ...paragraphs, ...listItems].join(' '))
      };
    }).filter((section) => section.title && (section.summary || section.listItems.length)).slice(0, MAX_SECTIONS);
  }

  function extractMetrics(article) {
    const text = normalizeText(article.textContent);
    const pattern = /\d+(?:\.\d+)?\s?(?:%|％|件|人|社|県|項目|種類|分|時間|日|回|倍|円|px|MB|GB|年)/g;
    const matches = text.match(pattern) || [];
    const unique = Array.from(new Set(matches));
    return unique.slice(0, 4).map((value) => {
      const position = text.indexOf(value);
      const start = Math.max(0, position - 54);
      const end = Math.min(text.length, position + value.length + 62);
      return { value, context: summarize(text.slice(start, end), 112) };
    }).filter((metric) => metric.context.length > metric.value.length + 4);
  }

  function detectMode(item, article, sections) {
    const title = normalizeText(item.title || '');
    const headings = sections.map((section) => section.title).join(' ');
    const sectionText = sections.map((section) => section.sourceText).join(' ');
    const combined = title + ' ' + headings + ' ' + sectionText;
    const datedSections = sections.filter((section) => /(?:19|20)\d{2}年|(?:1[0-2]|0?[1-9])月\d{1,2}日/.test(section.sourceText)).length;
    const numberedSections = sections.filter((section) => /^(?:第?\s*)?\d+[.．、)\s]|^[①-⑳]/.test(section.title)).length;
    const hasBefore = /従来|以前|旧仕様|旧画面|修正前|変更前/.test(combined);
    const hasAfter = /今回|新仕様|新画面|修正後|変更後|改善後/.test(combined);
    const metrics = extractMetrics(article);

    if (hasBefore && hasAfter && /修正|改善|刷新|変更|移行|統一/.test(title + headings)) return 'beforeAfter';
    if (/比較|違い|対比|比較表|メリット.*デメリット|長所.*短所|AとB|vs\.?|対.*比/i.test(title + ' ' + headings)) return 'comparison';
    if (datedSections >= 2 || (/年表|沿革|歴史|変遷|時系列|経緯|これまでの歩み|履歴/.test(title + headings) && datedSections >= 1)) return 'timeline';
    if (/判断|選び方|どちら|分岐|条件|場合分け|診断|決め方/.test(title + headings) && sections.length >= 3) return 'decision';
    if (/原因|理由|なぜ|影響|結果|背景|要因|つながり/.test(title + headings) && sections.length >= 3) return 'causal';
    if (/段階|フェーズ|ライフサイクル|周期|循環|成長過程/.test(title + headings) && sections.length >= 3) return 'lifecycle';
    if (/手順|使い方|設定方法|進め方|流れ|プロセス|ステップ|導入方法|操作方法/.test(title + headings) || numberedSections >= 3) return 'process';
    if (/階層|体系|構造|分類|区分|種類|役割|仕組み|構成図/.test(title + headings) && sections.length >= 3) return 'hierarchy';
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
    append(header, 'p', MODES[mode], 'column-native-visual__eyebrow');
    append(header, 'h2', item.title || 'この記事の要点', 'column-native-visual__title');
    const descriptions = {
      editorial: '本文の論点を、読み進める順序と関係性に沿って整理しました。',
      statistics: '本文中で意味を確認できる数値だけを抜き出しています。',
      timeline: '本文に登場する出来事を、記載された順序で並べています。',
      comparison: '本文で扱われている選択肢や違いを、左右に分けて整理しています。',
      decision: '条件と判断のポイントを、分岐として整理しています。',
      causal: '本文で説明されている原因・背景・結果のつながりを示しています。',
      lifecycle: '本文で説明されている段階を、流れに沿って配置しています。',
      process: '本文の手順を、順番が追いやすい形に並べています。',
      beforeAfter: '変更前と変更後について、本文に書かれた内容を対比しています。',
      hierarchy: '本文の分類や構成を、段階が見える形に整理しています。'
    };
    append(header, 'p', descriptions[mode], 'column-native-visual__description');
  }

  function renderStoryline(body, sections) {
    const list = append(body, 'ol', null, 'column-visual-storyline');
    sections.slice(0, 5).forEach((section, index) => {
      const chapter = append(list, 'li', null, 'column-visual-storyline__chapter');
      append(chapter, 'span', String(index + 1).padStart(2, '0'), 'column-visual-storyline__number');
      const copy = append(chapter, 'div', null, 'column-visual-storyline__copy');
      append(copy, 'h3', section.title, 'column-visual-storyline__title');
      append(copy, 'p', section.summary, 'column-visual-storyline__summary');
    });
  }

  function renderTimeline(body, sections) {
    const list = append(body, 'ol', null, 'column-visual-timeline');
    sections.slice(0, 5).forEach((section) => {
      const item = append(list, 'li', null, 'column-visual-timeline__item');
      const date = section.sourceText.match(/(?:19|20)\d{2}年|(?:1[0-2]|0?[1-9])月\d{1,2}日/);
      append(item, 'span', date ? date[0] : '●', 'column-visual-timeline__marker');
      const copy = append(item, 'div', null, 'column-visual-timeline__copy');
      append(copy, 'h3', section.title, 'column-visual-timeline__title');
      append(copy, 'p', section.summary, 'column-visual-timeline__summary');
    });
  }

  function renderProcess(body, sections) {
    const list = append(body, 'ol', null, 'column-visual-process');
    sections.slice(0, 5).forEach((section, index) => {
      const step = append(list, 'li', null, 'column-visual-process__step');
      append(step, 'span', 'STEP ' + String(index + 1).padStart(2, '0'), 'column-visual-process__index');
      const copy = append(step, 'div', null, 'column-visual-process__copy');
      append(copy, 'h3', section.title, 'column-visual-process__title');
      append(copy, 'p', section.summary, 'column-visual-process__summary');
      if (section.listItems.length) {
        const details = append(copy, 'ul', null, 'column-visual-process__details');
        section.listItems.slice(0, 3).forEach((entry) => append(details, 'li', entry, ''));
      }
    });
  }

  function renderComparison(body, sections) {
    const grid = append(body, 'div', null, 'column-visual-compare');
    sections.slice(0, 2).forEach((section, index) => {
      const panel = append(grid, 'section', null, 'column-visual-compare__panel');
      append(panel, 'span', index === 0 ? 'A' : 'B', 'column-visual-compare__number');
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

  function renderCausal(body, sections) {
    const grid = append(body, 'div', null, 'column-visual-causal');
    sections.slice(0, 3).forEach((section, index) => {
      const node = append(grid, 'section', null, 'column-visual-causal__node');
      append(node, 'span', ['BACKGROUND', 'CAUSE', 'RESULT'][index], 'column-visual-causal__tag');
      append(node, 'h3', section.title, 'column-visual-causal__title');
      append(node, 'p', section.summary, 'column-visual-causal__summary');
    });
  }

  function renderDecision(body, sections, item) {
    const root = append(body, 'div', null, 'column-visual-decision');
    append(root, 'div', item.title || 'どの条件に当てはまるか', 'column-visual-decision__question');
    const branches = append(root, 'div', null, 'column-visual-decision__branches');
    sections.slice(0, 4).forEach((section, index) => {
      const branch = append(branches, 'section', null, 'column-visual-decision__branch');
      append(branch, 'span', 'CONDITION ' + String(index + 1).padStart(2, '0'), 'column-visual-decision__condition');
      append(branch, 'h3', section.title, 'column-visual-decision__title');
      append(branch, 'p', section.summary, 'column-visual-decision__summary');
    });
  }

  function renderLifecycle(body, sections) {
    const list = append(body, 'ol', null, 'column-visual-lifecycle');
    sections.slice(0, 4).forEach((section, index) => {
      const phase = append(list, 'li', null, 'column-visual-lifecycle__phase');
      append(phase, 'span', '0' + (index + 1), 'column-visual-lifecycle__number');
      append(phase, 'h3', section.title, 'column-visual-lifecycle__title');
      append(phase, 'p', section.summary, 'column-visual-lifecycle__summary');
    });
  }

  function renderHierarchy(body, sections) {
    const stack = append(body, 'ol', null, 'column-visual-hierarchy');
    sections.slice(0, 5).forEach((section, index) => {
      const level = append(stack, 'li', null, 'column-visual-hierarchy__level');
      level.style.setProperty('--level', Math.min(index, 3));
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
      append(card, 'span', 'SOURCE VALUE ' + String(index + 1).padStart(2, '0'), 'column-visual-stats__index');
      append(card, 'strong', metric.value, 'column-visual-stats__value');
      append(card, 'p', metric.context, 'column-visual-stats__context');
    });
  }

  function createVisual(item, article, sections) {
    const mode = detectMode(item, article, sections);
    const figure = document.createElement('figure');
    figure.className = 'column-native-visual column-native-visual--' + mode;
    figure.setAttribute('aria-label', '記事本文の論点を整理したインフォグラフィック');
    makeHeader(figure, item, mode);
    const body = append(figure, 'div', null, 'column-native-visual__body');

    if (mode === 'timeline') renderTimeline(body, sections);
    else if (mode === 'process') renderProcess(body, sections);
    else if (mode === 'comparison') renderComparison(body, sections);
    else if (mode === 'beforeAfter') renderBeforeAfter(body, sections);
    else if (mode === 'hierarchy') renderHierarchy(body, sections);
    else if (mode === 'statistics') renderStatistics(body, article);
    else if (mode === 'decision') renderDecision(body, sections, item);
    else if (mode === 'causal') renderCausal(body, sections);
    else if (mode === 'lifecycle') renderLifecycle(body, sections);
    else renderStoryline(body, sections);

    append(figure, 'figcaption', '本文に記載された見出し・説明・数値をもとに構成しています。本文にない事実や数値は追加していません。', 'column-native-visual__caption');
    figure.dataset.visualMode = mode;
    return figure;
  }

  function mount(item, container) {
    if (!item || !container || !Number.isFinite(Number(item.id))) return;
    ensureStylesheet();
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

  window.TenmeiColumnVisuals = Object.freeze({ clean, mount, detectMode, collectSections });
}());
