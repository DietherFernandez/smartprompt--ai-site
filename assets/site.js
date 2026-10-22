// SmartPrompt AI — showcase site behaviour.
// Two small jobs: a gentle scroll reveal, and a trial request that hands the
// message to the visitor's mail client addressed to the address below.

(function () {
  "use strict";

  var CONTACT = "Diether.fernandez82@gmail.com";

  /* ------------------------------ header ------------------------------ */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* --------------------------- scroll reveal --------------------------- */
  var revealTargets = document.querySelectorAll(
    ".rail, .stage, .console, .mode, .assurances li, .model-figure, .route, .ticks li, .trial-form, .faq details, .specstrip-inner > div"
  );

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach(function (el) { el.classList.add("reveal", "is-visible"); });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    revealTargets.forEach(function (el, index) {
      el.classList.add("reveal");
      el.style.transitionDelay = Math.min(index % 4, 3) * 60 + "ms";
      observer.observe(el);
    });
  }

  /* --------------------------- trial request --------------------------- */
  var form = document.getElementById("trial-form");
  var status = document.getElementById("form-status");

  if (form && status) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      status.classList.remove("is-error");

      var data = new FormData(form);
      var name = String(data.get("name") || "").trim();
      var email = String(data.get("email") || "").trim();
      var use = String(data.get("use") || "").trim();
      var message = String(data.get("message") || "").trim();

      if (!name || !email) {
        status.classList.add("is-error");
        status.textContent = "Please add your name and email address.";
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.classList.add("is-error");
        status.textContent = "That email address does not look right yet.";
        return;
      }

      var body = [
        "Hello SmartPrompt AI,",
        "",
        "I would like to request a trial build.",
        "",
        "Name: " + name,
        "Email: " + email,
        "Use case: " + use,
        message ? "Notes: " + message : "Notes: -"
      ].join("\n");

      var subject = "SmartPrompt AI trial request — " + name;
      var href =
        "mailto:" + CONTACT +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      status.innerHTML =
        "Your mail client should open with the request ready to send to " +
        '<a href="' + href + '">' + CONTACT + "</a>" +
        ". If nothing opened, copy the address and send the message yourself.";

      window.location.href = href;
    });
  }
})();
