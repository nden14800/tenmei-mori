(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;

  function q(s, el = document) { return el.querySelector(s); }
  function qa(s, el = document) { return [...el.querySelectorAll(s)]; }

  function classifyArticle(article) {
    if (article.classList.contains("down") || article.classList.contains("down-active")) return "down";
    if (article.classList.contains("degraded")) return "degraded";
    return "up";
  }

  function getState() {
    const articles = qa("main article");
    if (articles.some(a => classifyArticle(a) === "down")) return "down";
    if (articles.some(a => classifyArticle(a) === "degraded")) return "degraded";
    return "up";
  }

  function stateText(state) {
    return state === "down"
      ? ["We're experiencing issues", "一部のサービスで問題が発生しています"]
      : state === "degraded"
        ? ["Some systems are experiencing issues", "一部のサービスの状態が低下しています"]
        : ["We're fully operational", "すべてのシステムが正常に稼働しています"];
  }

  function buildShell() {
    const main = q("main.container");
    if (!main || main.dataset.tmBuilt === "1") return;
    main.dataset.tmBuilt = "1";
    body.classList.add("tm-status-v2");

    const header = q(":scope > header", main);
    if (header) header.classList.add("tm-native-header");

    let hero = q(".tm-hero");
    if (!hero) {
      hero = document.createElement("section");
      hero.className = "tm-hero";
      hero.innerHTML = [
        '<div class="tm-hero-status"><span class="tm-hero-dot"></span><span class="tm-hero-status-text"></span></div>',
        '<h2 class="tm-hero-title"></h2>',
        '<p class="tm-hero-description"></p>'
      ].join("");
      (header || main.firstElementChild)?.insertAdjacentElement("afterend", hero);
    }

    const state = getState();
    const copy = stateText(state);
    hero.dataset.state = state;
    q(".tm-hero-title", hero).textContent = copy[0];
    q(".tm-hero-description", hero).textContent = copy[1];

    qa("main > section").forEach(section => {
      if (section === hero) return;
      const articles = qa(":scope > article", section);
      if (!articles.length) return;

      const hasIncident = articles.some(a =>
        a.classList.contains("down-active") ||
        a.classList.contains("down") ||
        a.classList.contains("degraded")
      );

      section.classList.add(hasIncident ? "tm-incident-section" : "tm-system-section");

      let heading = q(":scope > .tm-v2-heading", section);
      if (!heading) {
        heading = document.createElement("div");
        heading.className = "tm-v2-heading";
        heading.innerHTML = '<h2></h2>';
        section.prepend(heading);
      }

      q("h2", heading).textContent = hasIncident ? "Incidents" : "System status";

      articles.forEach(article => {
        article.classList.add("tm-v2-row");
        const state = classifyArticle(article);
        article.dataset.tmState = state;

        const title = q("h4", article);
        if (title && !q(".tm-row-dot", title)) {
          const dot = document.createElement("span");
          dot.className = "tm-row-dot";
          dot.setAttribute("aria-hidden", "true");
          title.prepend(dot);
        }
      });
    });

    const changed = q(".changed", main);
    if (changed) changed.classList.add("tm-metric-picker");

    const live = q(".live-status", main);
    if (live) live.classList.add("tm-metrics-section");

    const footer = q("footer");
    if (footer) footer.classList.add("tm-v2-footer");
  }

  function enhanceNav() {
    const nav = q("nav");
    if (!nav || nav.dataset.tmBuilt === "1") return;
    nav.dataset.tmBuilt = "1";
    nav.classList.add("tm-v2-nav");

    const container = q(".container", nav);
    if (!container) return;

    const ul = q("ul", container);
    if (!ul) return;

    const brand = document.createElement("li");
    brand.className = "tm-brand";
    brand.innerHTML = '<a href="/" aria-label="運勢・天命乃杜 Status"><span class="tm-brand-mark"></span><span>運勢・天命乃杜</span></a>';
    ul.prepend(brand);
  }

  function run() {
    enhanceNav();
    buildShell();
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      run();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();