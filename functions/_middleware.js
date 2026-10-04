const DEVELOPER_NAV_FIX = `
<script id="tenmei-developer-navigation-fix">
(function () {
  "use strict";

  function forceOpenView(viewName) {
    var target = document.getElementById("view-" + viewName);
    if (!target) return false;

    document.querySelectorAll(".view-section").forEach(function (view) {
      view.classList.remove("active");
      view.setAttribute("aria-hidden", "true");
    });

    target.classList.add("active");
    target.removeAttribute("hidden");
    target.setAttribute("aria-hidden", "false");

    if (typeof window.showView === "function") {
      try { window.showView(viewName); } catch (error) {}
    }

    window.setTimeout(function () {
      var current = document.getElementById("view-" + viewName);
      if (!current) return;
      current.classList.add("active");
      current.removeAttribute("hidden");
      current.setAttribute("aria-hidden", "false");
      window.scrollTo({ top: 0, behavior: "auto" });
    }, 0);

    return true;
  }

  function bind() {
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest) return;

      var control = target.closest("#nav-developer");
      var viewName = control ? "developer" : null;

      if (!viewName) {
        var node = target;
        while (node && node !== document) {
          if (node.getAttribute) {
            var onclick = node.getAttribute("onclick") || "";
            var match = onclick.match(/showView\(\s*['"]([^'"]+)['"]\s*\)/);
            if (match && (match[1] === "developer" || match[1] === "history")) {
              control = node;
              viewName = match[1];
              break;
            }
          }
          node = node.parentElement;
        }
      }

      if (!viewName) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      forceOpenView(viewName);
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

  if (url.pathname !== "/" || !contentType.includes("text/html")) return response;

  return new HTMLRewriter()
    .on("body", {
      element(element) {
        element.append(DEVELOPER_NAV_FIX, { html: true });
      }
    })
    .transform(response);
}
