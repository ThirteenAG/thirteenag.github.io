/*
 * Image diff compare modes for the .img-comparison cards.
 *
 * Adds the same image diff presentation modes used by GitHub Desktop's image
 * diff viewer: 2-up (hover swap, matching the old behavior), Swipe, Onion Skin
 * and Difference. Controls are overlaid on the image (YouTube-style) and only
 * appear while the mouse is over the image. An expand button opens the high
 * resolution (.png) version of the screenshot in a popup with the same
 * controls.
 */
(function () {
  'use strict';

  var MODES = [
    { key: '2up', label: 'Hover' },
    { key: 'swipe', label: 'Swipe' },
    { key: 'onion', label: 'Onion Skin' },
    { key: 'diff', label: 'Difference' },
  ];

  var EXPAND_SVG =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5h4v1.5H5V7H3.5V3.5zM8.5 3.5h4v3.5H11V5H8.5V3.5zM5 8.5h1.5V11H8v1.5H3.5v-4H5v1.5zM11 8.5h1.5v4H8.5V11H11V8.5z"/></svg>';
  var CLOSE_SVG =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.72 3.72a1 1 0 0 1 1.41 0L8 6.59l2.87-2.87a1 1 0 1 1 1.41 1.41L9.41 8l2.87 2.87a1 1 0 1 1-1.41 1.41L8 9.41l-2.87 2.87a1 1 0 0 1-1.41-1.41L6.59 8 3.72 5.13a1 1 0 0 1 0-1.41z"/></svg>';

  /** Pull the image url out of an inline handler like `this.src='x.jpg';` */
  function extractSrc(attrValue) {
    if (!attrValue) {
      return null;
    }
    var match = /src\s*=\s*(['"])(.*?)\1/.exec(attrValue);
    return match ? match[2] : null;
  }

  function resolveBaseSrc(img) {
    var base =
      img.getAttribute('data-src') ||
      img.getAttribute('src') ||
      extractSrc(img.getAttribute('onmouseout'));
    if (base === window.location.href) {
      base = null;
    }
    return base || extractSrc(img.getAttribute('onmouseout'));
  }

  /** Map a screenshot to its high resolution counterpart (.png). */
  function hiRes(url) {
    if (!url) {
      return url;
    }
    if (/\.png($|\?)/i.test(url)) {
      return url;
    }
    return url.replace(/\.(jpe?g|gif|bmp|webp)($|\?)/i, '.png$2');
  }

  function setSrcWithFallback(img, primary, fallback) {
    var triedFallback = false;
    img.addEventListener('error', function onError() {
      if (!triedFallback && fallback && fallback !== primary) {
        triedFallback = true;
        img.src = fallback;
      } else {
        img.removeEventListener('error', onError);
        img.style.visibility = 'hidden';
      }
    });
    img.src = primary;
  }

  function makeButton(extraClass, title, inner) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'idc-btn' + (extraClass ? ' ' + extraClass : '');
    if (title) {
      button.title = title;
    }
    if (inner) {
      button.innerHTML = inner;
    }
    return button;
  }

  /**
   * Let the user drag across the image to move the swipe divider.
   * Vertical gestures are never intercepted, so the page keeps scrolling on
   * touch devices (CSS touch-action: pan-y handles the vertical direction).
   */
  function setupSwipeDrag(container, swipeRange) {
    var drag = null;

    function update(clientX) {
      var rect = container.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      var pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      container.style.setProperty('--id-split', pct + '%');
      if (swipeRange) {
        swipeRange.value = String(Math.round(pct));
      }
    }

    container.addEventListener('pointerdown', function (e) {
      if (container.dataset.mode !== 'swipe') {
        return;
      }
      if (e.target && e.target.closest && e.target.closest('.idc-controls')) {
        return;
      }
      if (e.pointerType === 'mouse' && e.button !== 0) {
        return;
      }
      drag = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        engaged: e.pointerType === 'mouse',
      };
      if (drag.engaged) {
        // prevent the browser from starting a text/image selection drag
        e.preventDefault();
        try {
          container.setPointerCapture(e.pointerId);
        } catch (err) {
          /* pointer capture unsupported */
        }
        update(e.clientX);
      }
    });

    container.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) {
        return;
      }
      if (!drag.engaged) {
        var dx = e.clientX - drag.startX;
        var dy = e.clientY - drag.startY;
        if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 8) {
          return; // vertical-ish gesture: let the page scroll
        }
        drag.engaged = true;
        try {
          container.setPointerCapture(e.pointerId);
        } catch (err) {
          /* pointer capture unsupported */
        }
      }
      e.preventDefault();
      update(e.clientX);
    });

    function endDrag(e) {
      if (drag && e.pointerId === drag.id) {
        drag = null;
        try {
          container.releasePointerCapture(e.pointerId);
        } catch (err) {
          /* pointer capture unsupported */
        }
      }
    }

    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);
  }

  function buildControls(container, opts) {
    var controls = document.createElement('div');
    controls.className = 'idc-controls';
    controls.setAttribute('aria-label', 'Image comparison controls');

    var modeButtons = [];
    var setMode = function (mode) {
      container.dataset.mode = mode;
      modeButtons.forEach(function (b) {
        b.classList.toggle('idc-active', b.dataset.mode === mode);
      });
    };

    if (opts.top) {
      MODES.forEach(function (m) {
        var b = makeButton('', m.label, m.label);
        b.dataset.mode = m.key;
        b.addEventListener('click', function () {
          setMode(m.key);
        });
        controls.appendChild(b);
        modeButtons.push(b);
      });
      if (modeButtons.length > 0) {
        modeButtons[0].classList.add('idc-active');
      }
    }

    var swipeRange = null;
    if (opts.top) {
      swipeRange = document.createElement('input');
      swipeRange.type = 'range';
      swipeRange.className = 'idc-range idc-range-swipe';
      swipeRange.min = '0';
      swipeRange.max = '100';
      swipeRange.step = '1';
      swipeRange.value = '0';
      swipeRange.setAttribute('aria-label', 'Swipe position');
      swipeRange.addEventListener('input', function () {
        container.style.setProperty('--id-split', swipeRange.value + '%');
      });
      controls.appendChild(swipeRange);

      var onionRange = document.createElement('input');
      onionRange.type = 'range';
      onionRange.className = 'idc-range idc-range-onion';
      onionRange.min = '0';
      onionRange.max = '100';
      onionRange.step = '1';
      onionRange.value = '100';
      onionRange.setAttribute('aria-label', 'Onion skin opacity');
      onionRange.addEventListener('input', function () {
        container.style.setProperty('--id-opacity', onionRange.value / 100);
      });
      controls.appendChild(onionRange);

      setupSwipeDrag(container, swipeRange);
    }

    if (opts.modal) {
      var close = makeButton('idc-icon', 'Close', CLOSE_SVG);
      close.setAttribute('aria-label', 'Close');
      close.addEventListener('click', closeModal);
      controls.appendChild(close);
    } else {
      var expand = makeButton('idc-icon', 'Open in larger view', EXPAND_SVG);
      expand.setAttribute('aria-label', 'Open in larger view');
      expand.addEventListener('click', function () {
        openModal(opts);
      });
      controls.appendChild(expand);
    }

    return controls;
  }

  /** Load the overlay image only once the card is hovered or visible. */
  function lazyLoadTop(container, topImg, topUrl) {
    var loaded = false;
    function load() {
      if (loaded) {
        return;
      }
      loaded = true;
      topImg.src = topUrl;
    }
    container.addEventListener('mouseenter', load, { once: true, passive: true });
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          load();
          observer.disconnect();
        }
      });
      observer.observe(container);
    }
  }

  function upgradeCards() {
    var containers = document.querySelectorAll('.img-comparison');
    Array.prototype.forEach.call(containers, function (container) {
      if (container.classList.contains('idc')) {
        return;
      }
      var img = container.querySelector('img');
      if (!img) {
        return;
      }

      var top = extractSrc(img.getAttribute('onmouseover'));
      var base = resolveBaseSrc(img);
      if (!base) {
        return;
      }

      // The overlay takes over the old inline swap/click handlers.
      img.removeAttribute('onmouseover');
      img.removeAttribute('onmouseout');
      img.removeAttribute('onclick');
      img.classList.add('idc-base');
      img.draggable = false;

      container.classList.add('idc');
      container.dataset.mode = '2up';
      container.style.setProperty('--id-split', '0%');
      container.style.setProperty('--id-opacity', '1');

      if (top) {
        var topImg = document.createElement('img');
        topImg.className = 'idc-top';
        topImg.alt = '';
        topImg.setAttribute('aria-hidden', 'true');
        topImg.draggable = false;
        topImg.addEventListener('error', function () {
          topImg.style.visibility = 'hidden';
        });
        container.appendChild(topImg);
        lazyLoadTop(container, topImg, top);
      }

      var divider = document.createElement('div');
      divider.className = 'idc-divider';
      divider.setAttribute('aria-hidden', 'true');
      container.appendChild(divider);

      container.appendChild(buildControls(container, { top: top, base: base }));
    });
  }

  var modalElement = null;
  var modalInstance = null;
  var modalStage = null;

  function ensureModal() {
    if (modalElement) {
      return;
    }
    modalElement = document.getElementById('imgdiff-modal');
    modalStage = document.getElementById('imgdiff-modal-stage');
  }

  function closeModal() {
    if (modalInstance) {
      modalInstance.hide();
    }
  }

  function openModal(opts) {
    ensureModal();
    if (!modalElement || !modalStage) {
      return;
    }

    modalStage.innerHTML = '';

    var root = document.createElement('div');
    root.className = 'idc idc-modal';
    root.dataset.mode = '2up';
    root.style.setProperty('--id-split', '0%');
    root.style.setProperty('--id-opacity', '1');

    var baseImg = document.createElement('img');
    baseImg.className = 'idc-base';
    baseImg.alt = '';
    baseImg.draggable = false;
    setSrcWithFallback(baseImg, hiRes(opts.base), opts.base);
    root.appendChild(baseImg);

    if (opts.top) {
      var topImg = document.createElement('img');
      topImg.className = 'idc-top';
      topImg.alt = '';
      topImg.setAttribute('aria-hidden', 'true');
      topImg.draggable = false;
      setSrcWithFallback(topImg, hiRes(opts.top), opts.top);
      root.appendChild(topImg);

      var divider = document.createElement('div');
      divider.className = 'idc-divider';
      divider.setAttribute('aria-hidden', 'true');
      root.appendChild(divider);
    }

    root.appendChild(
      buildControls(root, { top: opts.top, base: opts.base, modal: true })
    );
    modalStage.appendChild(root);

    if (!modalInstance) {
      if (window.bootstrap && window.bootstrap.Modal) {
        modalInstance = new window.bootstrap.Modal(modalElement);
      } else {
        // Fallback for when the bootstrap bundle hasn't finished loading yet.
        modalInstance = {
          show: function () {
            modalElement.classList.add('show');
            modalElement.style.display = 'block';
            modalElement.removeAttribute('aria-hidden');
            document.body.classList.add('modal-open');
          },
          hide: function () {
            modalElement.classList.remove('show');
            modalElement.style.display = 'none';
            modalElement.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
          },
        };
      }
    }
    modalInstance.show();
  }

  function init() {
    upgradeCards();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
