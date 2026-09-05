/*
 * Feature feed — animated multi-line feature list for the wfp.html cards.
 *
 * Each card's notes area is a <ul class="ff-lines"> whose <li> items are all
 * inline in the HTML. The script:
 *
 *  - measures how many lines actually fit between the card header and the
 *    download/screenshots buttons (so the card never grows past the 367px
 *    screenshot column on the left);
 *  - if every item fits, just shows them statically;
 *  - if there are more items than lines, the visible lines cycle through all
 *    of them, each line refreshing with the same slide-up/fade pop animation
 *    used by the old ticker, staggered top to bottom.
 *
 * No fetching, no data files — the HTML is the source of truth.
 */
(function () {
  'use strict';

  var LINE_HEIGHT = 21; // px, matches .ff-line in the injected css
  var MAX_LINES = 6; // hard cap so the card never outgrows the screenshot
  var SCREENSHOT_HEIGHT = 367; // every card uses a 652x367 screenshot
  var ROTATE_MS = 3400;
  var CASCADE_MS = 120; // stagger between lines
  var EASE_MS = 700;
  var FALLBACK_LINES = 5; // provisional value while the card is hidden/unmeasured

  var feeds = [];

  function prefersReducedMotion() {
    try {
      return (
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    } catch (err) {
      return false;
    }
  }

  var CSS = [
    // min-width:0 down the whole chain so long nowrap lines can never blow
    // out the column's min-content and wrap the card-body row (the GTA IV
    // card broke like this).
    '.panel-primary{min-width:0;}',
    '.ff-feed{min-width:0;}',
    '.ff-feed .ff-lines{list-style:none;margin:0;padding:0;min-width:0;}',
    '.ff-feed .ff-line{display:flex;align-items:center;gap:7px;min-width:0;',
    'height:' + LINE_HEIGHT + 'px;line-height:' + LINE_HEIGHT + 'px;',
    'font-size:13px;color:#212529;box-sizing:border-box;}',
    // Single unified marker: the real icon text is hidden and replaced with
    // a chevron rendered via ::before. The span is itself a flex container
    // so the glyph centers exactly on the 21px text line.
    '.ff-feed .ff-line-icon{flex:0 0 auto;width:16px;height:' + LINE_HEIGHT + 'px;',
    'display:flex;align-items:center;justify-content:center;',
    'font-size:0;color:transparent;}',
    '.ff-feed .ff-line-icon::before{content:"›";font-size:15px;line-height:1;',
    'color:var(--ff-accent,#337ab7);font-weight:700;}',
    // Bold text like the old Notes section, ellipsized on one line.
    '.ff-feed .ff-line-text{white-space:nowrap;overflow:hidden;',
    'text-overflow:ellipsis;min-width:0;font-weight:700;}',
    '.ff-feed .ff-line-text b{font-weight:700;color:#000;}',
    // Truncated lines sit still with an ellipsis until hovered, then
    // their text scrolls back and forth (marquee) without changing the
    // card's layout.
    '.ff-inner{display:inline-block;white-space:nowrap;}',
    '.ff-feed .ff-line.ff-marq .ff-inner{display:block;width:100%;',
    'overflow:hidden;text-overflow:ellipsis;}',
    '.ff-feed .ff-line.ff-marq:hover .ff-inner{display:inline-block;',
    'width:max-content;overflow:visible;text-overflow:clip;',
    'animation:ff-marq var(--ff-dur,6s) linear infinite alternate;}',
    '@keyframes ff-marq{',
    '0%,15%{transform:translateX(0);}',
    '60%,100%{transform:translateX(var(--ff-shift,0));}}',
    '@media (prefers-reduced-motion: reduce){',
    '.ff-feed .ff-line.ff-marq:hover .ff-inner{animation:none;}}',
    '.ff-feed .ff-line.ff-anim{animation:ff-line-pop .45s cubic-bezier(.2,.9,.3,1);}',
    '@keyframes ff-line-pop{',
    'from{opacity:0;transform:translateY(60%);}',
    'to{opacity:1;transform:none;}}',
    // The installation note sits above the Download button group in the
    // markup; flex order renders it right below the button instead.
    '.panel-primary > .text-center{display:flex;flex-direction:column;}',
    '.panel-primary > .text-center > .btn-group{order:1;}',
    '.panel-primary > .text-center > .ff-install{order:2;}',
    '.ff-install{display:block;width:100%;padding:3px 0 4px;font-size:12px;',
    'color:#6c757d;}',
    // Below 1200px the screenshot column stacks above the card body, so
    // the height budget doesn't exist there. Force the stack explicitly:
    // the .col's min-width:0 (required to stop long nowrap feed lines
    // from blowing out the side-by-side desktop row) drops its min-content
    // to 0, which would otherwise let it "fit" beside the image on one
    // flex line and collapse into a few-pixel sliver on phones. Also
    // never clip the list on small screens even if the JS measurement is
    // late.
    '@media (max-width: 1199.98px){',
    '.ff-feed .ff-lines{height:auto !important;overflow:visible !important;}',
    // Stacked layout has no height budget: let every line wrap fully.
    '.ff-feed .ff-line{height:auto !important;min-height:' + LINE_HEIGHT + 'px;}',
    '.ff-feed .ff-line-text{white-space:normal !important;overflow:visible !important;',
    'text-overflow:clip !important;overflow-wrap:break-word;}',
    // Kill the desktop hover marquee on stacked layout: the mobile
    // line-text reset alone isn't enough, because .ff-marq still turns
    // .ff-inner into a max-content inline-block that scrolls past the
    // card border (text-overflow/overflow are visible there).
    '.ff-feed .ff-line .ff-inner{display:inline !important;width:auto !important;',
    'overflow:visible !important;text-overflow:clip !important;',
    'white-space:normal !important;animation:none !important;transform:none !important;}',
    '.card-body.row>.img-comparison{display:block;flex:0 1 100%;max-width:100%;}',
    '.card-body.row>.col{flex:0 0 100%;max-width:100%;}',
    '.card-body.row>.img-comparison>img{width:100%;}',
    '}',
  ].join('');

  function injectCss() {
    if (document.getElementById('ff-style')) {
      return;
    }
    var style = document.createElement('style');
    style.id = 'ff-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /** Read one <li> back into { icon, title, text }. */
  function readItem(li) {
    var icon = li.querySelector('.ff-line-icon');
    var txt = li.querySelector('.ff-line-text');
    var b = txt ? txt.querySelector('b') : null;
    var title = b ? b.textContent : '';
    var full = txt ? txt.textContent : '';
    var text = title ? full.slice(title.length).replace(/^\s*[—–-]\s*/, '') : full;
    return { icon: icon ? icon.textContent : '✦', title: title, text: text };
  }

  /** Write an item into a line, optionally with the pop animation. */
  function renderInto(li, item, animate) {
    var icon = li.querySelector('.ff-line-icon');
    var txt = li.querySelector('.ff-line-text');
    if (icon) {
      icon.textContent = item.icon;
    }
    if (txt) {
      var inner = document.createElement('span');
      inner.className = 'ff-inner';
      if (item.title) {
        var b = document.createElement('b');
        b.textContent = item.title;
        inner.appendChild(b);
        inner.appendChild(document.createTextNode(' — '));
      }
      inner.appendChild(document.createTextNode(item.text));
      txt.replaceChildren(inner);
    }
    markTruncated(li);
    if (animate) {
      li.classList.remove('ff-anim');
      void li.offsetWidth;
      li.classList.add('ff-anim');
    }
  }

  /**
   * Flag a line whose text is cut off and set up its hover marquee scroll.
   * Measurement uses the inner wrapper's full content width, which is
   * reported correctly even while the idle ellipsis style is applied.
   */
  function markTruncated(li) {
    var txt = li.querySelector('.ff-line-text');
    if (!txt) {
      return;
    }
    var inner = txt.querySelector('.ff-inner');
    var contentWidth =
      inner && typeof inner.scrollWidth === 'number'
        ? inner.scrollWidth
        : typeof txt.scrollWidth === 'number'
          ? txt.scrollWidth
          : 0;
    var slotWidth = typeof txt.clientWidth === 'number' ? txt.clientWidth : 0;
    if (!slotWidth || contentWidth <= slotWidth + 1) {
      li.classList.remove('ff-marq');
      return;
    }
    // Extra 12px so the end of the text pauses with a little breathing room.
    var shift = slotWidth - contentWidth - 12;
    var duration = Math.min(12, Math.max(4, 2 + contentWidth / 150));
    if (txt.style && typeof txt.style.setProperty === 'function') {
      txt.style.setProperty('--ff-shift', shift + 'px');
      txt.style.setProperty('--ff-dur', duration + 's');
    }
    li.classList.add('ff-marq');
  }

  /**
   * How many 21px lines fit between the header and the bottom buttons?
   *
   * The fixed height is the sum of the panel's other children (header,
   * release-info strip, download/screenshots buttons) plus whatever else
   * the feed's wrapper contains. This is robust: it doesn't rely on the
   * panel's own height (which is stretched to the image, or 0 while the
   * card sits in a hidden tab), and it uses the known 367px screenshot
   * height as the budget until the image is measurable.
   */
  function computeVisibleLines(feed) {
    var panel = feed.closest ? feed.closest('.panel-primary') : null;
    if (!panel) {
      return FALLBACK_LINES;
    }
    var img = null;
    if (panel.parentElement) {
      img = panel.parentElement.querySelector('.img-comparison img');
    }
    var budget =
      img && img.offsetHeight >= 120 ? img.offsetHeight : SCREENSHOT_HEIGHT;

    var wrapper = feed.parentElement;
    var fixed = 0;
    var measured = false;
    for (var i = 0; i < panel.children.length; i++) {
      var child = panel.children[i];
      if (child === wrapper) {
        continue;
      }
      var childHeight = child.offsetHeight || 0;
      fixed += childHeight;
      if (childHeight) {
        measured = true;
      }
    }
    if (wrapper) {
      var wrapperHeight = wrapper.offsetHeight || 0;
      var feedHeight = feed.offsetHeight || 0;
      fixed += Math.max(0, wrapperHeight - feedHeight);
      if (wrapperHeight) {
        measured = true;
      }
    }
    // Hidden tab pane: every measurement is 0, use a provisional value and
    // re-measure once the card becomes visible (see setupFeed).
    if (!measured) {
      return FALLBACK_LINES;
    }

    var available = budget - fixed - 2; // small safety margin
    if (available < LINE_HEIGHT * 1.5) {
      return 1;
    }
    return Math.min(MAX_LINES, Math.max(1, Math.floor(available / LINE_HEIGHT)));
  }

  /**
   * Is the card body stacked below the screenshot (mobile/tablet)?
   *
   * Below 1200px the image column sits above the panel instead of beside
   * it, so the side-by-side 367px height budget no longer applies. In that
   * layout we show every line statically and skip clipping/rotation.
   */
  function isStackedLayout(feed) {
    // Below 1200px our injected CSS forces the image column above the
    // panel, so the viewport alone decides. Relying on the image rect
    // here breaks on mobile while the lazy screenshot hasn't loaded yet
    // (offsetHeight 0 -> "not stacked" -> desktop rotation runs and the
    // first visible lines get overwritten by other items).
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(max-width: 1199.98px)').matches
    ) {
      return true;
    }
    var panel = feed.closest ? feed.closest('.panel-primary') : null;
    if (!panel || !panel.parentElement) {
      return false;
    }
    var img = panel.parentElement.querySelector('.img-comparison img');
    if (
      !img ||
      !img.offsetHeight ||
      typeof img.getBoundingClientRect !== 'function'
    ) {
      return false;
    }
    var imgRect = img.getBoundingClientRect();
    var panelRect = panel.getBoundingClientRect();
    if (!imgRect.height || !panelRect.height) {
      // Hidden tab pane: the observer re-checks once it's visible.
      return false;
    }
    return panelRect.top + 1 >= imgRect.bottom;
  }

  function layoutFeed(state) {
    var ul = state.ul;
    if (state.stacked || state.pool.length <= state.n) {
      // Stacked mobile layout or everything fits: static, natural height.
      state.animating = false;
      state.offset = 0;
      ul.style.height = '';
      ul.style.overflow = '';
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
      // Rotation writes other items into the first lines in place; put
      // the original content back so no entry appears duplicated.
      state.lis.forEach(function (li, i) {
        if (state.pool[i]) {
          renderInto(li, state.pool[i], false);
        }
      });
      return;
    }
    state.animating = true;
    ul.style.height = state.n * LINE_HEIGHT + 'px';
    ul.style.overflow = 'hidden';
    if (prefersReducedMotion()) {
      return;
    }
    if (!state.timer) {
      state.timer = setTimeout(function () {
        tick(state);
      }, ROTATE_MS + Math.random() * 2500);
    }
  }

  function tick(state) {
    if (state.paused || document.hidden) {
      state.timer = setTimeout(function () {
        tick(state);
      }, ROTATE_MS);
      return;
    }
    state.offset = (state.offset + 1) % state.pool.length;
    var lines = Math.min(state.n, state.lis.length, state.pool.length);
    for (var i = 0; i < lines; i++) {
      setTimeout(
        function (index) {
          if (state.paused) {
            return;
          }
          renderInto(
            state.lis[index],
            state.pool[(state.offset + index) % state.pool.length],
            true
          );
        }.bind(null, i),
        i * CASCADE_MS
      );
    }
    state.timer = setTimeout(function () {
      tick(state);
    }, ROTATE_MS + EASE_MS);
  }

  function setupFeed(feed) {
    var ul = feed.querySelector('.ff-lines');
    if (!ul) {
      return;
    }
    var lis = Array.prototype.slice.call(ul.children);
    if (!lis.length) {
      return;
    }
    var card = feed.closest ? feed.closest('.card') : null;
    if (card && card.style && card.style.borderColor) {
      card.style.setProperty('--ff-accent', card.style.borderColor);
    }
    var state = {
      feed: feed,
      ul: ul,
      lis: lis,
      n: computeVisibleLines(feed),
      stacked: isStackedLayout(feed),
      pool: lis.map(readItem),
      offset: 0,
      paused: false,
      timer: null,
      animating: false,
    };
    feeds.push(state);
    layoutFeed(state);

    // Normalize every line into the inner wrapper used by the marquee and
    // flag the truncated ones so their text slowly scrolls back and forth.
    lis.forEach(function (li) {
      renderInto(li, readItem(li), false);
    });

    feed.addEventListener('mouseenter', function () {
      state.paused = true;
    });
    feed.addEventListener('mouseleave', function () {
      state.paused = false;
    });

    // Cards in inactive tabs measure as 0 at setup; re-measure when the
    // feed actually becomes visible (tab switch or scroll into view).
    if ('IntersectionObserver' in window) {
      var lastReMeasure = 0;
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          var now = Date.now();
          if (now - lastReMeasure < 600) {
            return;
          }
          lastReMeasure = now;
          var n = computeVisibleLines(state.feed);
          var stacked = isStackedLayout(state.feed);
          if (n !== state.n || stacked !== state.stacked) {
            state.stacked = stacked;
            state.n = n;
            layoutFeed(state);
          }
          state.lis.forEach(markTruncated);
        });
      }).observe(feed);
    }
  }

  function reMeasure() {
    feeds.forEach(function (state) {
      var n = computeVisibleLines(state.feed);
      var stacked = isStackedLayout(state.feed);
      if (n !== state.n || stacked !== state.stacked) {
        state.stacked = stacked;
        state.n = n;
        layoutFeed(state);
      }
      state.lis.forEach(markTruncated);
    });
  }

  function boot() {
    var nodes = document.querySelectorAll('.ff-feed');
    if (!nodes.length) {
      return;
    }
    injectCss();
    Array.prototype.forEach.call(nodes, setupFeed);
    // Once the screenshots have loaded we can measure precisely.
    if (window.addEventListener) {
      window.addEventListener('load', reMeasure);
      window.addEventListener('resize', reMeasure);
    }
  }

  if (typeof document !== 'undefined' && document.body) {
    boot();
  }

  /* Exports for the node-based tests. */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      setupFeed: setupFeed,
      computeVisibleLines: computeVisibleLines,
      isStackedLayout: isStackedLayout,
      layoutFeed: layoutFeed,
      markTruncated: markTruncated,
      readItem: readItem,
      renderInto: renderInto,
      LINE_HEIGHT: LINE_HEIGHT,
      MAX_LINES: MAX_LINES,
      CSS: CSS,
      feeds: feeds,
    };
  }
})();
