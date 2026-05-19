document.addEventListener("DOMContentLoaded", function () {
  if (typeof Swiper === "undefined") return;

  var interviewEl = document.querySelector(".interview-swiper");
  if (!interviewEl) return;

  var interviewPagination = document.querySelector(".interview-swiper-pagination");
  var slideCount = interviewEl.querySelectorAll(".swiper-slide").length;
  var desktopSlidesPerView = Math.min(5, slideCount);
  var enableInterviewLoop = slideCount > 1;
  var interviewSwiper = null;
  var desktopMedia = window.matchMedia("(min-width: 900px)");
  var tabletMedia = window.matchMedia("(min-width: 640px)");

  var normalizeIndex = function (index, total) {
    if (total <= 0) return 0;
    return ((index % total) + total) % total;
  };

  var buildPagination = function (paginationEl, total) {
    if (!paginationEl) return;
    paginationEl.innerHTML = "";

    for (var i = 0; i < total; i += 1) {
      var line = document.createElement("span");
      line.className = "interview-swiper-line";
      if (i === 0) line.classList.add("is-active");
      paginationEl.appendChild(line);
    }
  };

  var updatePaginationState = function (paginationEl, activeIndex) {
    if (!paginationEl) return;

    var lines = paginationEl.querySelectorAll(".interview-swiper-line");
    lines.forEach(function (line, index) {
      line.classList.toggle("is-active", index === activeIndex);
    });
  };

  buildPagination(interviewPagination, slideCount);

  var syncPagination = function () {
    if (!interviewSwiper || !interviewPagination) return;
    var activeIndex = normalizeIndex(interviewSwiper.realIndex, slideCount);
    updatePaginationState(interviewPagination, activeIndex);
  };

  var createInterviewSwiper = function (initialSlide) {
    interviewSwiper = new Swiper(interviewEl, {
      loop: enableInterviewLoop,
      initialSlide: initialSlide || 0,
      slidesPerView: "auto",
      centeredSlides: true,
      roundLengths: true,
      spaceBetween: 20,
      autoHeight: true,
      navigation: {
        nextEl: ".interview-swiper-next",
        prevEl: ".interview-swiper-prev"
      },
      watchOverflow: true,
      breakpoints: {
        900: {
          slidesPerView: desktopSlidesPerView,
          centeredSlides: false,
          spaceBetween: 16,
          allowTouchMove: false
        }
      },
      on: {
        imagesReady: function () {
          this.update();
        }
      }
    });

    interviewSwiper.on("slideChange", syncPagination);
    syncPagination();
  };

  var rebuildInterviewSwiper = function () {
    var currentIndex = interviewSwiper ? normalizeIndex(interviewSwiper.realIndex, slideCount) : 0;
    if (interviewSwiper) {
      interviewSwiper.destroy(true, true);
      interviewSwiper = null;
    }
    createInterviewSwiper(currentIndex);
  };

  createInterviewSwiper(0);

  var bindMediaChange = function (mediaQuery, handler) {
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handler);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handler);
    }
  };

  bindMediaChange(desktopMedia, rebuildInterviewSwiper);
  bindMediaChange(tabletMedia, rebuildInterviewSwiper);

  // Instagram埋め込みがiframeに置換された後、Swiperの高さを再計算
  if ("MutationObserver" in window) {
    var observer = new MutationObserver(function () {
      if (interviewSwiper) interviewSwiper.update();
    });
    observer.observe(interviewEl, { childList: true, subtree: true });
  }
  // embed.js 読み込み完了後にも明示的にupdate（保険）
  window.addEventListener("load", function () {
    setTimeout(function () {
      if (interviewSwiper) interviewSwiper.update();
    }, 1500);
  });
});
