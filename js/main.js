document.addEventListener("DOMContentLoaded", function () {
  emailjs.init("EP-hfSXZ05nhzr9ZJ");
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.querySelector(".global-nav");
  var header = document.querySelector(".site-header");
  var pcScaleRoot = document.querySelector(".pc-scale-root");
  var desktopMedia = window.matchMedia("(min-width: 900px)");

  var getLayoutScale = function () {
    if (!desktopMedia.matches || !pcScaleRoot || !pcScaleRoot.offsetWidth) return 1;
    return pcScaleRoot.getBoundingClientRect().width / pcScaleRoot.offsetWidth;
  };

  var setMenuState = function (opened) {
    if (!toggle || !nav) return;
    nav.classList.toggle("is-open", opened);
    toggle.classList.toggle("is-open", opened);
    toggle.setAttribute("aria-expanded", opened ? "true" : "false");
    document.body.classList.toggle("nav-open", opened);
  };

  var closeMenu = function () {
    setMenuState(false);
  };

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenuState(!nav.classList.contains("is-open"));
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    window.addEventListener("resize", function () {
      if (desktopMedia.matches) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href");
      if (!href || href === "#") return;

      var targetId = href.slice(1);
      var target = document.getElementById(targetId);
      if (!target) return;

      event.preventDefault();
      var offset = header ? header.offsetHeight * getLayoutScale() + 8 : 0;
      var position = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: position, behavior: "smooth" });
    });
  });

  // ===== 先輩社員 1日のスケジュール ポップアップ =====
  var scheduleCards = document.querySelectorAll(".step-day-card[data-popup]");
  var lastTrigger = null;

  var openModal = function (id, trigger) {
    var dlg = document.getElementById(id);
    if (!dlg || typeof dlg.showModal !== "function") return;
    lastTrigger = trigger || null;
    dlg.showModal();
    document.body.classList.add("modal-open");
  };

  scheduleCards.forEach(function (card) {
    card.addEventListener("click", function () {
      openModal(card.dataset.popup, card);
    });
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openModal(card.dataset.popup, card);
      }
    });
  });

  // ===== Floating CTA: フォーム到達で非表示 =====
  var floatingCta = document.querySelector(".floating-cta");
  var ctaTarget = document.getElementById("reserve");
  if (floatingCta && ctaTarget) {
    document.body.classList.add("has-floating-cta");
    floatingCta.classList.remove("is-hidden");

    var checkFloatingCta = function () {
      var rect = ctaTarget.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      // フォームの上端が画面下から30%地点に達したら非表示
      var shouldHide = rect.top < vh * 0.7 && rect.bottom > 0;
      floatingCta.classList.toggle("is-hidden", shouldHide);
    };

    window.addEventListener("scroll", checkFloatingCta, { passive: true });
    window.addEventListener("resize", checkFloatingCta, { passive: true });
    window.addEventListener("load", checkFloatingCta);
    checkFloatingCta();
  }

  // ===== UTM パラメータ取得 & 隠しフィールドへ反映 =====
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  try {
    var search = new URLSearchParams(window.location.search);
    UTM_KEYS.forEach(function (key) {
      var v = search.get(key);
      if (v) {
        try { sessionStorage.setItem(key, v); } catch (e) {}
      }
    });
  } catch (e) {}

  UTM_KEYS.forEach(function (key) {
    var v = "";
    try { v = sessionStorage.getItem(key) || ""; } catch (e) {}
    document.querySelectorAll('input[name="' + key + '"]').forEach(function (input) {
      if (!input.value) input.value = v;
    });
  });

  // ===== エントリーフォーム送信 =====
  var entryForm = document.getElementById("entry-form");
  if (entryForm) {
    var submitBtn = entryForm.querySelector(".entry-form-submit");
    var errorBox  = entryForm.querySelector(".entry-form-error");

    var showError = function (msg) {
      if (!errorBox) return;
      errorBox.textContent = msg;
      errorBox.hidden = false;
    };
    var clearError = function () {
      if (!errorBox) return;
      errorBox.textContent = "";
      errorBox.hidden = true;
    };

    entryForm.addEventListener("submit", function (event) {
      event.preventDefault();
      clearError();

      if (!entryForm.checkValidity()) {
        entryForm.reportValidity();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = "送信中...";
      }

      var templateParams = {
        name: entryForm.querySelector('[name="name"]').value,
        age: entryForm.querySelector('[name="age"]').value,
        tel: entryForm.querySelector('[name="tel"]').value,
        email: entryForm.querySelector('[name="email"]').value,
        currentJob: entryForm.querySelector('[name="currentJob"]').value,
        message: entryForm.querySelector('[name="message"]').value,
        utm_source: entryForm.querySelector('[name="utm_source"]').value,
        utm_medium: entryForm.querySelector('[name="utm_medium"]').value,
        utm_campaign: entryForm.querySelector('[name="utm_campaign"]').value,
        utm_content: entryForm.querySelector('[name="utm_content"]').value,
        utm_term: entryForm.querySelector('[name="utm_term"]').value
      };

      emailjs.send("service_vnyk47y", "template_t0nvy1j", templateParams)
        .then(function () {
          window.location.href = "./thanks.html";
        })
        .catch(function () {
          showError("送信に失敗しました。お手数ですが時間をおいて再度お試しください。");
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText || "応募する";
          }
        });
    });
  }

  document.querySelectorAll("dialog.schedule-modal").forEach(function (dlg) {
    // CLOSEボタン
    dlg.querySelectorAll("[data-modal-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        dlg.close();
      });
    });
    // 背景（::backdrop領域）クリックで閉じる
    dlg.addEventListener("click", function (event) {
      if (event.target === dlg) dlg.close();
    });
    // 閉じる時のクリーンアップ（CLOSE/背景/ESC共通）
    dlg.addEventListener("close", function () {
      document.body.classList.remove("modal-open");
      if (lastTrigger && typeof lastTrigger.focus === "function") {
        lastTrigger.focus();
        lastTrigger = null;
      }
    });
  });
});
