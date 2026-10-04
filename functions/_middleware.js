const DEVELOPER_NAV_FIX = `
<script id="tenmei-developer-navigation-fix">
(function () {
  "use strict";

  function openDeveloper() {
    var target = document.getElementById("view-developer");
    if (!target) return false;

    if (typeof window.showView === "function") {
      try {
        window.showView("developer");
      } catch (error) {}
    }

    window.setTimeout(function () {
      var current = document.getElementById("view-developer");
      if (!current) return;

      var visible = !!(
        current.offsetWidth ||
        current.offsetHeight ||
        current.getClientRects().length
      );

      if (!visible || !current.classList.contains("active")) {
        document.querySelectorAll(".view-section").forEach(function (view) {
          view.classList.remove("active");
        });
        current.classList.add("active");
      }

      window.scrollTo({ top: 0, behavior: "auto" });
    }, 0);

    return true;
  }

  function forceOpenView(viewName) {
    var target = document.getElementById("view-" + viewName);
    if (!target) return false;

    if (typeof window.showView === "function") {
      try {
        window.showView(viewName);
      } catch (error) {}
    }

    window.setTimeout(function () {
      var current = document.getElementById("view-" + viewName);
      if (!current) return;

      var visible = !!(
        current.offsetWidth ||
        current.offsetHeight ||
        current.getClientRects().length
      );

      if (!visible || !current.classList.contains("active")) {
        document.querySelectorAll(".view-section").forEach(function (view) {
          view.classList.remove("active");
        });
        current.classList.add("active");
      }

      window.scrollTo({ top: 0, behavior: "auto" });
    }, 0);

    return true;
  }

  function bind() {
    var nav = document.getElementById("nav-developer");
    if (nav && nav.dataset.tenmeiDeveloperNavigationFixed !== "true") {
      nav.dataset.tenmeiDeveloperNavigationFixed = "true";
      nav.addEventListener("click", function (event) {
        event.preventDefault();
        forceOpenView("developer");
      });
    }

    document.addEventListener("click", function (event) {
      var target = event.target && event.target.closest
        ? event.target.closest('[onclick*="showView(\'history\')"], [onclick*="showView(\"history\")"]')
        : null;

      if (!target) return;

      event.preventDefault();
      forceOpenView("history");
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
}());
</script>
`;

export async function onRequestGet(context) {
  const response = await context.next();
  const url = new URL(context.request.url);
  const contentType = response.headers.get("content-type") || "";

  if (url.pathname !== "/" || !contentType.includes("text/html")) {
    return response;
  }

  return new HTMLRewriter()
    .on("body", {
      element(element) {
        element.append(DEVELOPER_NAV_FIX, { html: true });
      }
    })
    .transform(response);
}
