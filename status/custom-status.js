(() => {
  "use strict";

  const ROOT_CLASS = "tm-status-enhanced";

  function allArticles() {
    return [...document.querySelectorAll("main article")];
  }

  function stateFromArticles() {
    const articles = allArticles();
    if (articles.some(a => a.classList.contains("down") || a.classList.contains("down-active"))) return "down";
    if (articles.some(a => a.classList.contains("degraded"))) return "degraded";
    return "up";
  }

  function ensureOverview() {
    const main = document.querySelector("main");
    const header = main?.querySelector(":scope > header");
    if (!main || !header) return;

    let overview = document.querySelector(".tm-overview");
    if (!overview) {
      overview = document.createElement("section");
      overview.className = "tm-overview";
      overview.setAttribute("aria-live", "polite");
      overview.innerHTML = [
        '<div class="tm-overview-icon" aria-hidden="true"></div>',
        '<div class="tm-overview-copy">',
        '<div class="tm-overview-title"></div>',
        '<div class="tm-overview-detail"></div>',
        '</div>'
      ].join("");
      header.insertAdjacentElement("afterend", overview);
    }

    const state = stateFromArticles();
    overview.dataset.state = state;

    const title = overview.querySelector(".tm-overview-title");
    const detail = overview.querySelector(".tm-overview-detail");

    if (state === "down") {
      title.textContent = "一部のサービスで障害が発生しています";
      detail.textContent = "現在の障害状況と影響範囲を確認してください。";
    } else if (state === "degraded") {
      title.textContent = "一部のサービスの状態が低下しています";
      detail.textContent = "現在のサービス状況を確認してください。";
    } else {
      title.textContent = "すべてのシステムが正常に稼働しています";
      detail.textContent = "現在、確認されている障害はありません。";
    }
  }

  function enhanceSections() {
    const main = document.querySelector("main");
    if (!main) return;

    const sections = [...main.querySelectorAll(":scope > section")];
    for (const section of sections) {
      const articles = section.querySelectorAll(":scope > article");
      if (!articles.length) continue;
      if (!section.querySelector(":scope > .tm-section-heading")) {
        const heading = document.createElement("div");
        heading.className = "tm-section-heading";
        heading.textContent = "システム状況";
        section.prepend(heading);
      }
      section.classList.add("tm-system-section");
      articles.forEach(article => article.classList.add("tm-component-card"));
    }

    document.querySelectorAll("article").forEach(article => {
      const h = article.querySelector("h4");
      if (h && !h.querySelector(".tm-card-dot")) {
        const dot = document.createElement("span");
        dot.className = "tm-card-dot";
        dot.setAttribute("aria-hidden", "true");
        h.prepend(dot);
      }
    });
  }

  function enhance() {
    if (!document.body) return;
    document.body.classList.add(ROOT_CLASS);
    ensureOverview();
    enhanceSections();
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhance();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();