const DEVELOPER_NAV_FIX = `
<script id="tenmei-developer-navigation-fix">
(function () {
  "use strict";

  function fallbackOpenDeveloper() {
    var target = document.getElementById("view-developer");
    if (!target) return false;

    document.querySelectorAll(".view-section").forEach(function (view) {
      view.classList.remove("active");
    });
    target.classList.add("active");

    document.querySelectorAll("[aria-current]").forEach(function (item) {
      item.removeAttribute("aria-current");
    });

    window.scrollTo({ top: 0, behavior: "auto" });
    return true;
  }

  document.addEventListener("click", function (event) {
    var element = event.target && event.target.closest
      ? event.target.closest("a,button,[role=\"button\"]")
      : null;
    if (!element || element.dataset.tenmeiDeveloperNavFixed === "true") return;

    if (element.textContent.trim() !== "開発者について") return;

    element.dataset.tenmeiDeveloperNavFixed = "true";
    event.preventDefault();

    var handled = false;
    if (typeof window.showView === "function") {
      try {
        window.showView("developer");
        handled = true;
      } catch (error) {}
    }

    window.setTimeout(function () {
      var target = document.getElementById("view-developer");
      if (!target) return;

      var visible = !!(target.offsetWidth || target.offsetHeight || target.getClientRects().length);
      if (!visible || !target.classList.contains("active")) {
        fallbackOpenDeveloper();
      } else if (handled) {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    }, 0);
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
