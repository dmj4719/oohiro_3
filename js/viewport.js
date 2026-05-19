(function () {
  var DESKTOP_BREAKPOINT = "(min-width: 900px)";
  var DESKTOP_BASE_WIDTH = 1360;

  var meta = document.querySelector("meta[name='viewport']");
  if (!meta) return;

  // Keep a true device viewport. Layout scaling is handled by CSS breakpoints.
  meta.setAttribute("content", "width=device-width,initial-scale=1.0,minimum-scale=1.0,user-scalable=no,shrink-to-fit=yes");

  var initScaleSync = function () {
    var shell = document.querySelector(".pc-scale-shell");
    var root = document.querySelector(".pc-scale-root");
    if (!shell || !root) return;

    var desktopMedia = window.matchMedia(DESKTOP_BREAKPOINT);

    var getDesktopScale = function () {
      return Math.min(window.innerWidth / DESKTOP_BASE_WIDTH, 1);
    };

    var syncScale = function () {
      if (!desktopMedia.matches) {
        root.style.setProperty("--pc-scale", "1");
        shell.style.height = "";
        return;
      }

      root.style.setProperty("--pc-scale", String(getDesktopScale()));
      shell.style.height = root.getBoundingClientRect().height + "px";
    };

    if ("ResizeObserver" in window) {
      var observer = new ResizeObserver(syncScale);
      observer.observe(root);
    }

    window.addEventListener("resize", syncScale);
    window.addEventListener("load", syncScale);
    requestAnimationFrame(syncScale);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScaleSync, { once: true });
  } else {
    initScaleSync();
  }
})();
