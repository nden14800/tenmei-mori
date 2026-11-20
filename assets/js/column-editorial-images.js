(function () {
    'use strict';

    const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
    const CACHE_PREFIX = 'tenmei-column-editorial-image-v1:';
    const CACHE_TTL = 24 * 60 * 60 * 1000;
    const pending = new Map();

    const TOPIC_TERMS = [
        [/氏神|産土神|鎮守|崇敬神社|神社|神道|鳥居|神無月|神在月|神迎/, 'Japanese shrine torii forest'],
        [/おみくじ|神籤|御神籤/, 'omikuji Japanese fortune paper shrine'],
        [/初詣|正月|新年|元日/, 'Hatsumode Japanese New Year shrine'],
        [/祭|神事|例大祭|秋祭|夏祭/, 'Japanese matsuri shrine festival'],
        [/七五三/, 'Shichi Go San Japanese shrine'],
        [/節分|豆まき/, 'Setsubun Japanese festival beans'],
        [/稲荷|狐/, 'Inari shrine fox statue Japan'],
        [/出雲|神在/, 'Izumo Taisha shrine Japan'],
        [/御守|お守り/, 'Japanese omamori amulet shrine'],
        [/参拝|手水|拝礼/, 'Japanese shrine worship purification basin']
    ];

    function clean(content) {
        return String(content || '').replace(
            /<figure\s+class="article-visual article-visual--overview article-visual--ai-generated">[\s\S]*?<\/figure>/gi,
            ''
        );
    }

    function buildQuery(item) {
        const title = String(item && item.title || '').replace(/[【】「」『』——？?！!：:]/g, ' ');
        const matched = TOPIC_TERMS.filter(([pattern]) => pattern.test(title)).map(([, term]) => term);
        return matched.length ? [...new Set(matched)].slice(0, 2).join(' ') : 'Japanese shrine traditional culture Japan';
    }

    function decodeMetadata(value) {
        const text = String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const decoder = document.createElement('textarea');
        decoder.innerHTML = text;
        return decoder.value.trim();
    }

    function allowedLicense(value) {
        const license = String(value || '').trim();
        if (/\b(?:NC|ND)\b/i.test(license)) return false;
        return /^(?:CC BY(?:-SA)?(?:\s|$)|CC0(?:\s|$)|Public domain|PDM(?:\s|$))/i.test(license);
    }

    function dimensionsAreSuitable(width, height) {
        const ratio = width / height;
        return width >= 1200 && height >= 675 && ratio >= 1.35 && ratio <= 2.15;
    }

    function scoreImage(width, height) {
        const ratio = width / height;
        return Math.min(width * height / 1000000, 12) - Math.abs(ratio - 16 / 9) * 2;
    }

    async function requestJson(url) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 9000);
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) throw new Error('Wikimedia Commons returned ' + response.status);
            return await response.json();
        } finally {
            window.clearTimeout(timeout);
        }
    }

    async function searchCommons(query) {
        const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            origin: '*',
            generator: 'search',
            gsrsearch: 'filetype:bitmap ' + query,
            gsrnamespace: '6',
            gsrlimit: '25',
            prop: 'imageinfo',
            iiprop: 'url|size|extmetadata',
            iiurlwidth: '1600'
        });
        const data = await requestJson(COMMONS_API + '?' + params.toString());
        const pages = Object.values(data.query && data.query.pages || {});
        const candidates = pages.map((page, index) => {
            const info = page.imageinfo && page.imageinfo[0];
            const meta = info && info.extmetadata || {};
            const license = decodeMetadata(meta.LicenseShortName && meta.LicenseShortName.value);
            if (!info || !allowedLicense(license) || !dimensionsAreSuitable(info.width, info.height) || !info.thumburl) return null;
            try {
                const imageHost = new URL(info.thumburl);
                if (imageHost.protocol !== 'https:' || imageHost.hostname !== 'upload.wikimedia.org') return null;
            } catch (error) { return null; }
            const licenseUrl = decodeMetadata(meta.LicenseUrl && meta.LicenseUrl.value);
            const author = decodeMetadata(meta.Artist && meta.Artist.value) || '作者情報なし';
            const fileTitle = String(page.title || '');
            const pageUrl = 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(fileTitle.replace(/ /g, '_'));
            return {
                src: info.thumburl,
                width: info.width,
                height: info.height,
                title: fileTitle.replace(/^File:/, ''),
                author,
                license,
                licenseUrl: /^https:\/\//i.test(licenseUrl) ? licenseUrl : pageUrl,
                pageUrl,
                score: Math.max(0, 20 - index) + scoreImage(info.width, info.height) * 0.1
            };
        }).filter(Boolean);
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0] || null;
    }

    async function findImage(item) {
        const query = buildQuery(item);
        const cacheKey = CACHE_PREFIX + String(item.id) + ':' + query;
        try {
            const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
            if (cached && Date.now() - cached.savedAt < CACHE_TTL) return cached.image || null;
        } catch (error) {}
        if (pending.has(cacheKey)) return pending.get(cacheKey);
        const task = (async () => {
            let image = null;
            try { image = await searchCommons(query); }
            catch (error) { console.warn('[ColumnImages] Commons search failed:', error); }
            try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), image })); } catch (error) {}
            return image;
        })();
        pending.set(cacheKey, task);
        try { return await task; } finally { pending.delete(cacheKey); }
    }

    function appendText(parent, tag, text, className) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        parent.appendChild(node);
        return node;
    }

    function createFigure(image, item) {
        const figure = document.createElement('figure');
        figure.className = 'article-visual column-editorial-visual';
        figure.setAttribute('aria-label', '記事内容に関連する資料画像');

        const link = document.createElement('a');
        link.href = image.pageUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', '画像の原典を新しいタブで開く: ' + image.title);

        const img = document.createElement('img');
        img.src = image.src;
        img.alt = String(item.title || '記事に関連する資料画像') + 'に関連する資料画像。' + image.title;
        img.width = 1600;
        img.height = Math.round(1600 * image.height / image.width);
        img.loading = 'lazy';
        img.decoding = 'async';
        img.referrerPolicy = 'no-referrer';
        img.addEventListener('error', () => figure.remove(), { once: true });
        link.appendChild(img);
        figure.appendChild(link);

        const attribution = document.createElement('figcaption');
        attribution.className = 'column-editorial-attribution';
        const icon = document.createElement('span');
        icon.className = 'column-editorial-attribution__icon';
        icon.setAttribute('aria-hidden', 'true');
        const glyph = document.createElement('i');
        glyph.className = 'bi bi-image';
        icon.appendChild(glyph);
        attribution.appendChild(icon);
        appendText(attribution, 'span', 'Wikimedia Commons', '');
        appendText(attribution, 'span', image.author, '');
        const licenseLink = document.createElement('a');
        licenseLink.href = image.licenseUrl || image.pageUrl;
        licenseLink.target = '_blank';
        licenseLink.rel = 'noopener noreferrer';
        licenseLink.textContent = image.license;
        attribution.appendChild(licenseLink);
        const sourceLink = document.createElement('a');
        sourceLink.href = image.pageUrl;
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceLink.textContent = '原典';
        attribution.appendChild(sourceLink);
        figure.appendChild(attribution);
        return figure;
    }

    async function mount(item, container) {
        if (!item || !container || !Number.isFinite(Number(item.id))) return;
        const article = container.querySelector('.column-reader-body .article-content .article-content')
            || container.querySelector('.column-reader-body .article-content');
        if (!article || article.querySelector('.column-editorial-visual')) return;

        const placeholder = document.createElement('div');
        placeholder.className = 'column-editorial-loading';
        placeholder.setAttribute('role', 'status');
        placeholder.textContent = '記事に関連する資料画像を確認しています…';
        article.insertBefore(placeholder, article.firstChild);

        try {
            const image = await findImage(item);
            if (!placeholder.isConnected || !article.isConnected) return;
            placeholder.remove();
            if (!image) return;
            article.insertBefore(createFigure(image, item), article.firstChild);
        } catch (error) {
            placeholder.remove();
            console.warn('[ColumnImages] No suitable editorial image:', error);
        }
    }

    window.TenmeiColumnImages = Object.freeze({ clean, mount });
}());
