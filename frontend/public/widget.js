/* QuotientIQ embed widget loader.
 * Usage: <script src="/widget.js" data-quotientiq-token="TOKEN" defer></script>
 *
 * Creates a floating chat button bottom-right. When clicked, opens an
 * iframe pointing to /embed/<TOKEN>. Listens for postMessage qiq:close.
 */
(function () {
  var script = document.currentScript || document.querySelector("script[data-quotientiq-token]");
  if (!script) return;
  var token = script.getAttribute("data-quotientiq-token");
  if (!token) return;
  var origin = new URL(script.src).origin;

  var btn = document.createElement("button");
  btn.setAttribute("aria-label", "Open chat");
  btn.style.cssText =
    "position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:9999px;background:#000;color:#fff;border:none;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:2147483646;display:grid;place-items:center;font-family:system-ui,sans-serif;transition:transform .15s ease";
  btn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  btn.onmouseover = function () { btn.style.transform = "scale(1.05)"; };
  btn.onmouseout = function () { btn.style.transform = "scale(1)"; };

  var panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;bottom:96px;right:24px;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 120px);background:#fff;border:1px solid #e5e5e5;border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,.18);overflow:hidden;z-index:2147483647;display:none";

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/embed/" + encodeURIComponent(token);
  iframe.style.cssText = "border:0;width:100%;height:100%;display:block";
  iframe.setAttribute("title", "QuotientIQ chat");
  panel.appendChild(iframe);

  var open = false;
  btn.addEventListener("click", function () {
    open = !open;
    panel.style.display = open ? "block" : "none";
  });
  window.addEventListener("message", function (e) {
    if (e && e.data && e.data.type === "qiq:close") {
      open = false;
      panel.style.display = "none";
    }
  });

  document.body.appendChild(panel);
  document.body.appendChild(btn);
})();
