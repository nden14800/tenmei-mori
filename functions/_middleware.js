const DEVELOPER_NAV_FIX = `
<style id="tenmei-developer-navigation-fix-style">
#view-developer.tenmei-developer-forced-visible {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}
</style>
<script id="tenmei-developer-navigation-fix">
(function () {
  "use strict";

  function forceDeveloperVisible() {
    var target = document.getElementById("view-developer");
    if (!target) return false;

    document.querySelectorAll(".view-section").forEach(function (view) {
      view.classList.remove("active");
      view.style.removeProperty("display");
    });

    target.classList.add("active", "tenmei-developer-forced-visible");
    target.style.setProperty("display", "block", "important");
    target.style.setProperty("visibility", "visible", "important");
    target.style.setProperty("opacity", "1", "important");

    document.querySelectorAll("[aria-current]").forEach(function (item) {
      item.removeAttribute("aria-current");
    });

    window.scrollTo({ top: 0, behavior: "auto" });
    return true;
  }

  function isDeveloperTarget(element) {
    return element &&
      element.textContent &&
      element.textContent.trim() === "開発者について";
  }

  document.addEventListener("click", function (event) {
    var element = event.target && event.target.closest
      ? event.target.closest("a,button,[role=\"button\"],div")
      : null;

    if (!isDeveloperTarget(element)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    var handled = false;
    if (typeof window.showView === "function") {
      try {
        window.showView("developer");
        handled = true;
      } catch (error) {}
    }

    window.setTimeout(function () {
      forceDeveloperVisible();
    }, 0);

    window.setTimeout(function () {
      var target = document.getElementById("view-developer");
      if (!target) return;
      var visible = !!(
        target.offsetWidth ||
        target.offsetHeight ||
        target.getClientRects().length
      );
      if (!handled || !visible || !target.classList.contains("active")) {
        forceDeveloperVisible();
      }
    }, 50);
  }, true);
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
