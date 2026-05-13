(function () {
  'use strict';

  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  var sections = links
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (item) { item.classList.add('is-visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      } else {
        entry.target.classList.remove('is-visible');
      }
    });
  }, {
    rootMargin: '-8% 0px -12% 0px',
    threshold: 0.16
  });

  items.forEach(function (item) { observer.observe(item); });

  if (sections.length) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          link.classList.toggle('is-current', link.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, {
      rootMargin: '-42% 0px -46% 0px',
      threshold: 0.01
    });

    sections.forEach(function (section) { navObserver.observe(section); });
  }
})();
