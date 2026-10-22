// SmartPrompt AI — showcase site behaviour.
// Three small jobs: a gentle scroll reveal, a trial request that really
// reaches the maintainer, and a mail-client fallback for people whose
// browser blocks the request.

(function () {
  "use strict";

  var CONTACT = "codevaultpht@gmail.com";

  /* The trial request is POSTed to a form relay that emails the maintainer.
     FormSubmit needs no account: the recipient address is the endpoint, and
     the first request triggers a one-time activation email.
     Swap this for a Formspree/Basin endpoint, or your own handler, without
     touching anything else. */
  var ENDPOINT = "https://formsubmit.co/ajax/" + CONTACT;

  var SUBJECT_PREFIX = "SmartPrompt AI trial request";

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
    var submitButton = form.querySelector('button[type="submit"]');

    /* The first real interaction, used to spot a bot that fills the form
       faster than a person can type. Autofill does not fire input events,
       so a visitor who pastes their details is never treated as a bot. */
    var firstInputAt = null;
    form.addEventListener("input", function () {
      if (firstInputAt === null) { firstInputAt = Date.now(); }
    });

    var mailtoLink = function (name, email, use, message) {
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

      return (
        "mailto:" + CONTACT +
        "?subject=" + encodeURIComponent(SUBJECT_PREFIX + " — " + name) +
        "&body=" + encodeURIComponent(body)
      );
    };

    var showFallback = function (reason, href) {
      status.classList.add("is-error");
      status.innerHTML =
        reason + " You can still send it from your own mail client: " +
        '<a href="' + href + '">' + CONTACT + "</a>.";
    };

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      status.classList.remove("is-error");
      status.textContent = "";

      var data = new FormData(form);
      var name = String(data.get("name") || "").trim();
      var email = String(data.get("email") || "").trim();
      var use = String(data.get("use") || "").trim();
      var message = String(data.get("message") || "").trim();
      var honey = String(data.get("company") || "").trim();

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

      var href = mailtoLink(name, email, use, message);

      // A hidden field that only a bot would fill, and a form filled in
      // faster than a person can type.
      var typedTooFast = firstInputAt !== null && (Date.now() - firstInputAt) < 1200;
      if (honey || typedTooFast) {
        status.textContent = "Request sent. We will reply by email.";
        return;
      }

      var payload = {
        _subject: SUBJECT_PREFIX + " — " + name,
        _template: "table",
        _captcha: "false",
        name: name,
        email: email,
        use: use,
        message: message,
        company: honey
      };

      if (submitButton) { submitButton.disabled = true; }
      status.textContent = "Sending your request…";

      fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; });
        })
        .then(function (result) {
          if (submitButton) { submitButton.disabled = false; }

          // The relay answers with a JSON string, not a boolean.
          var delivered = result &&
            (result.success === true || result.success === "true");

          if (delivered) {
            status.textContent =
              "Request sent. We will reply to " + email + " with a build and setup notes.";
            form.reset();
            return;
          }

          showFallback(
            "The request could not be delivered automatically.",
            href
          );
        })
        .catch(function () {
          if (submitButton) { submitButton.disabled = false; }
          showFallback("The request could not be delivered automatically.", href);
        });
    });
  }
})();
