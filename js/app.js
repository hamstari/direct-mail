/* Page behavior: load the price sheet, then build → checkout → confirmation. */
(function () {
  'use strict';

  var site = window.MailConfig;
  var C = window.MailCalc;
  var BUILT_IN = window.MailData;
  var TABS = { prices: 'Prices', zips: 'ZIPs', settings: 'Settings', promos: 'Promos' };
  // The first header cell each tab must have, so a missing tab is never read as another one.
  var HEADS = { prices: /option/i, zips: /zip/i, settings: /setting/i, promos: /code/i };
  var HEAD_NAMES = { prices: 'Option', zips: 'ZIP', settings: 'Setting', promos: 'Code' };

  /**
   * Where the price data comes from, in order: the Google Sheet (if linked), else the CSV files
   * in the data folder, else the built-in copy in js/data.js.
   */
  function sources() {
    var link = String(site.googleSheet || '').trim();
    if (link) {
      var m = link.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || link.match(/^([a-zA-Z0-9_-]{20,})$/);
      if (!m) return { error: 'The googleSheet link in js/config.js is not a Google Sheets link.' };
      var base = 'https://docs.google.com/spreadsheets/d/' + m[1] + '/gviz/tq?tqx=out:csv&headers=1&sheet=';
      return {
        name: 'Google Sheet',
        url: function (key) { return base + encodeURIComponent(TABS[key]) + '&t=' + Date.now(); },
        label: function (key) { return 'the "' + TABS[key] + '" tab'; },
        unreadable: 'Is the sheet shared as "Anyone with the link: Viewer"?',
      };
    }
    var folder = String(site.priceFiles || '').trim();
    if (folder) {
      if (!/\/$/.test(folder)) folder += '/';
      return {
        name: 'CSV files (' + folder + ')',
        url: function (key) { return folder + key + '.csv?t=' + Date.now(); },
        label: function (key) { return folder + key + '.csv'; },
        unreadable: 'Check that the file is uploaded next to index.html.',
      };
    }
    return null;
  }

  /** Load the four tables. Resolves { tabs, source, problems }. */
  function loadTabs() {
    var src = sources();
    if (!src) return Promise.resolve({ tabs: BUILT_IN, source: 'built-in prices (js/data.js)', problems: [] });
    if (src.error) return Promise.resolve({ tabs: BUILT_IN, source: 'built-in prices (js/data.js)', problems: [src.error] });
    var problems = [], failed = 0;
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve('timeout'); }, 8000); });
    var jobs = Object.keys(TABS).map(function (key) {
      return fetch(src.url(key), { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function (text) {
          var first = C.parseCSV(text)[0] || [];
          if (/^\s*</.test(text) || !HEADS[key].test(first[0] || '')) {
            problems.push('Could not use ' + src.label(key) + ': its first column should be headed "' + HEAD_NAMES[key] + '". Check the name and row 1.');
            return [key, null];
          }
          return [key, text];
        })
        .catch(function () {
          failed++;
          problems.push('Could not read ' + src.label(key) + '. ' + src.unreadable);
          return [key, null];
        });
    });
    return Promise.race([Promise.all(jobs), timeout]).then(function (res) {
      if (res === 'timeout') return { tabs: BUILT_IN, source: 'built-in prices (' + src.name + ' took too long)', problems: [src.name + ' did not answer within 8 seconds.'] };
      if (failed === res.length) {
        // Nothing could be read at all (for example the page was opened straight from a computer's disk).
        return { tabs: BUILT_IN, source: 'built-in prices (could not read ' + src.name + ')', problems: problems };
      }
      var tabs = {};
      res.forEach(function (kv) { if (kv[1] != null) tabs[kv[0]] = kv[1]; });
      if (tabs.promos == null) tabs.promos = ''; // never turn on the sample promo codes for live data
      return { tabs: tabs, source: src.name, problems: problems };
    });
  }

  loadTabs().then(function (res) {
    var cfg = C.buildData(site, res.tabs, BUILT_IN);
    cfg.problems = res.problems.concat(cfg.problems);
    if (cfg.problems.length && window.console) console.warn('Price data:\n' + cfg.problems.join('\n'));
    start(cfg, res.source);
  });

  function start(cfg, source) {
  var ZIPS = cfg.zips;
    var zipByCode = {};
    ZIPS.forEach(function (z) { zipByCode[z.zip] = z; });
    var counties = [];
    ZIPS.forEach(function (z) { if (counties.indexOf(z.county) < 0) counties.push(z.county); });

    /** A starting selection so the first view shows a real price: ZIPs in list order until 10,000 homes. */
    function starterZips() {
      var out = [], n = 0;
      for (var i = 0; i < ZIPS.length && n < 10000; i++) { out.push(ZIPS[i].zip); n += ZIPS[i].homes; }
      return out;
    }
    var $ = function (id) { return document.getElementById(id); };
    var money = function (n) { return (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var int = function (n) { return Math.round(n).toLocaleString('en-US'); };
    var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

    var state = {
      productId: cfg.defaultProductId,
      sizeId: null,
      zips: starterZips(),
      homes: 0,
      mailings: 1,
      rush: false,
      promo: '',
      inHome: '',
    };
    var files = [];
    var current = null; // last priced order

    /* ---------- drawings ---------- */
    function icon(kind, big) {
      var s = big ? 1.25 : 1;
      var body = {
        bookmark: '<rect x="18" y="4" width="24" height="52" rx="2"/><rect class="fill" x="22" y="9" width="16" height="5" rx="1"/><path d="M22 18h16M22 22h12"/>',
        page: '<rect x="10" y="8" width="40" height="52" rx="2"/><rect class="fill" x="15" y="14" width="28" height="5" rx="1"/><path d="M15 24h28M15 28h18"/>',
        booklet: '<rect x="15" y="5" width="40" height="52" rx="2" class="back"/><rect x="10" y="8" width="40" height="52" rx="2"/><rect class="fill" x="15" y="14" width="28" height="5" rx="1"/><path d="M15 24h28M15 28h18"/>',
        postcard: '<rect x="4" y="16" width="52" height="34" rx="2"/><rect class="fill" x="9" y="21" width="36" height="4" rx="1"/><path d="M9 29h36M9 33h24"/>',
      }[kind];
      return '<svg class="ic" viewBox="0 0 60 64" width="' + 52 * s + '" height="' + 56 * s + '" aria-hidden="true">' + body + '</svg>';
    }
    function sizeShape(size) {
      var max = 58, k = max / Math.max(size.w, size.h);
      var w = Math.round(size.w * k), h = Math.round(size.h * k);
      return '<svg class="ic" viewBox="0 0 ' + (w + 4) + ' ' + (h + 4) + '" width="' + (w + 4) + '" height="' + (h + 4) + '" aria-hidden="true">' +
        '<rect x="2" y="2" width="' + w + '" height="' + h + '" rx="2"/>' +
        '<rect class="fill" x="' + (2 + w * 0.15) + '" y="' + (2 + h * 0.12) + '" width="' + (w * 0.7) + '" height="' + Math.max(4, h * 0.09) + '" rx="1"/>' +
        '<path d="M' + (2 + w * 0.15) + ' ' + (2 + h * 0.3) + 'h' + (w * 0.7) + 'M' + (2 + w * 0.15) + ' ' + (2 + h * 0.38) + 'h' + (w * 0.5) + '"/></svg>';
    }

    /* ---------- ZIP codes ---------- */
    function isChosen(zip) { return state.zips.indexOf(zip) >= 0; }
    function chosenCounties() {
      return counties.filter(function (c) { return state.zips.some(function (z) { return zipByCode[z].county === c; }); });
    }
    function renderZips() {
      var q = $('zip-search').value.trim().toLowerCase();
      var html = counties.map(function (county) {
        var all = ZIPS.filter(function (z) { return z.county === county; });
        var shown = all.filter(function (z) { return !q || z.zip.indexOf(q) === 0 || z.city.toLowerCase().indexOf(q) >= 0 || county.toLowerCase().indexOf(q) >= 0; });
        if (!shown.length) return '';
        var picked = all.filter(function (z) { return isChosen(z.zip); });
        var allOn = picked.length === all.length;
        var homes = all.reduce(function (s, z) { return s + z.homes; }, 0);
        return '<fieldset class="zip-group"><legend><span><b>' + esc(county) + ' County</b> <span class="muted">' + all.length + ' ZIPs · ' + int(homes) + ' homes</span></span>' +
          '<button type="button" class="linkbtn" data-county="' + esc(county) + '" data-on="' + (allOn ? 0 : 1) + '">' + (allOn ? 'Clear county' : 'Select all') + '</button></legend>' +
          '<div class="zip-list">' + shown.map(function (z) {
            return '<label class="zip"><input type="checkbox" value="' + z.zip + '"' + (isChosen(z.zip) ? ' checked' : '') + '>' +
              '<span class="zip-code">' + z.zip + '</span><span class="zip-city">' + esc(z.city) + '</span><span class="zip-homes">' + int(z.homes) + '</span></label>';
          }).join('') + '</div></fieldset>';
      }).join('');
      $('zip-groups').innerHTML = html || '<p class="muted">No ZIP codes in our area match “' + esc(q) + '”.</p>';
    }
    function renderTally() {
      var n = state.zips.length;
      $('zip-tally').innerHTML = n
        ? '<div><b>' + int(state.homes) + '</b> homes</div><div class="muted">' + n + ' ZIP code' + (n > 1 ? 's' : '') + ' · ' + esc(chosenCounties().join(', ')) + '</div>' +
          '<button type="button" class="linkbtn" id="zip-clear">Clear all</button>'
        : '<div><b>0</b> homes</div><div class="muted">No ZIP codes picked yet</div>';
    }

    /* ---------- render: build ---------- */
    function product() {
      var all = cfg.products;
      return all.filter(function (p) { return p.id === state.productId; })[0] ||
        all.filter(function (p) { return p.id === cfg.defaultProductId; })[0] || all[0];
    }

    function renderProducts() {
      $('products').innerHTML = cfg.products.map(function (p) {
        return '<label class="option">' +
          '<input type="radio" name="product" value="' + p.id + '"' + (p.id === state.productId ? ' checked' : '') + '>' +
          icon(p.icon) + '<b>' + esc(p.name) + '</b><span class="muted">' + esc(p.blurb) + '</span>' +
          (p.badge ? '<span class="badge">' + esc(p.badge) + '</span>' : '') + '</label>';
      }).join('');
    }

    function renderSizes() {
      var p = product();
      if (!p.sizes.some(function (s) { return s.id === state.sizeId; })) state.sizeId = p.sizes[0].id;
      $('size-hint').textContent = p.sizes.length === 1 ? 'This option comes in one trim size.' : 'Pick a trim size.';
      $('sizes').innerHTML = p.sizes.map(function (s) {
        return '<label class="option size">' +
          '<input type="radio" name="size" value="' + s.id + '"' + (s.id === state.sizeId ? ' checked' : '') + '>' +
          sizeShape(s) + '<b>' + esc(s.dims) + '</b><span class="muted">' + esc(s.spec) + '</span></label>';
      }).join('');
    }

    function renderStatic() {
      var b = cfg.business;
      $('network').textContent = b.network;
      $('brand').textContent = b.name;
      $('tagline').textContent = b.tagline;
      document.title = b.name;
      $('foot-email').textContent = b.email; $('foot-email').href = 'mailto:' + b.email;
      $('foot-phone').textContent = b.phone; $('foot-phone').href = 'tel:' + b.phone.replace(/[^0-9+]/g, '');

      var br = cfg.breaks.slice(1).map(function (b) { return b >= 1000 ? (b / 1000) + 'k' : b; });
      $('homes-hint').textContent = 'Minimum ' + int(cfg.minHomes) + '. Your price per home drops at ' +
        br.slice(0, -1).join(', ') + ' and ' + br[br.length - 1] + '.';

      $('mailings').innerHTML = cfg.mailings.map(function (m) {
        return '<button type="button" role="radio" data-mailings="' + m.count + '">' + m.count + ' mailing' + (m.count > 1 ? 's' : '') +
          (m.pct ? ' · save ' + m.pct + '%' : '') + '</button>';
      }).join('');
    }

    function linesHtml(order) {
      return order.lines.map(function (l) {
        var cls = 'line ' + l.kind;
        var val = l.kind === 'included' ? 'Included' : money(l.amount);
        return '<div class="' + cls + '"><span>' + esc(l.label) + '</span><span>' + val + '</span></div>';
      }).join('');
    }

    function update() {
      var p = product();
      state.homes = C.homesForZips(ZIPS, state.zips);
      current = C.priceOrder(cfg, state);

      $('postage-note').textContent = '✓ ' + p.postageNote;
      $('spec').innerHTML = sizeShape(current.size) + '<div><b>' + esc(p.name) + ' · ' + esc(current.size.dims) + '</b>' +
        '<span class="muted">' + esc(current.size.spec.charAt(0).toUpperCase() + current.size.spec.slice(1)) + '. Designed by our in-house team.</span></div>';

      renderTally();
      if (state.homes >= cfg.minHomes) $('zip-error').hidden = true;
      Array.prototype.forEach.call($('mailings').children, function (b) { b.setAttribute('aria-checked', +b.dataset.mailings === state.mailings); });
      $('rush').checked = state.rush;

      var summary = p.name + ' · ' + current.size.dims + ' · ' + int(current.homes) + ' homes' +
        (current.mailings > 1 ? ' · ' + current.mailings + ' mailings' : '');
      $('order-name').textContent = summary;
      var notes = state.homes < cfg.minHomes
        ? ['Pick ZIP codes totaling at least ' + int(cfg.minHomes) + ' homes. ' + (state.homes ? 'You have ' + int(state.homes) + ', so this is priced at the minimum.' : 'This is priced at the minimum.')]
        : current.notes;
      $('order-notes').innerHTML = notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
      $('order-lines').innerHTML = linesHtml(current);
      $('order-total').textContent = money(current.total);
      $('per-home').innerHTML = '<b>' + (current.perHome * 100).toFixed(1) + '¢</b> per home reached · ' + int(current.pieces) + ' total pieces';

      var pm = $('promo-msg');
      if (current.promoError) { pm.hidden = false; pm.className = 'field-error'; pm.textContent = current.promoError; }
      else if (current.promo) { pm.hidden = false; pm.className = 'field-ok'; pm.textContent = '✓ ' + current.promo.code + ' applied: ' + current.promo.label; }
      else pm.hidden = true;

      save();
    }

    /* ---------- events: build ---------- */
    $('products').addEventListener('change', function (e) { state.productId = e.target.value; renderSizes(); update(); });
    $('sizes').addEventListener('change', function (e) { state.sizeId = e.target.value; update(); });
    $('zip-search').addEventListener('input', renderZips);
    $('zip-groups').addEventListener('change', function (e) {
      if (e.target.type !== 'checkbox') return;
      var z = e.target.value;
      state.zips = state.zips.filter(function (x) { return x !== z; });
      if (e.target.checked) state.zips.push(z);
      update(); renderZips();
    });
    $('zip-groups').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-county]'); if (!b) return;
      var county = b.dataset.county, on = b.dataset.on === '1';
      var inCounty = ZIPS.filter(function (z) { return z.county === county; }).map(function (z) { return z.zip; });
      state.zips = state.zips.filter(function (x) { return inCounty.indexOf(x) < 0; });
      if (on) state.zips = state.zips.concat(inCounty);
      update(); renderZips();
    });
    $('zip-tally').addEventListener('click', function (e) {
      if (e.target.id !== 'zip-clear') return;
      state.zips = []; update(); renderZips();
    });
    $('mailings').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.mailings = +b.dataset.mailings; update();
    });
    $('rush').addEventListener('change', function (e) { state.rush = e.target.checked; update(); });
    $('in-home').addEventListener('input', function (e) { state.inHome = e.target.value; save(); });
    $('files').addEventListener('change', function (e) {
      files = Array.prototype.slice.call(e.target.files || []);
      $('files-label').innerHTML = files.length
        ? '<span aria-hidden="true">📎</span> ' + files.length + ' file' + (files.length > 1 ? 's' : '') + ' attached: ' + esc(files.map(function (f) { return f.name; }).join(', '))
        : '<span aria-hidden="true">📎</span> Have a logo or photos? Attach them for our designers (optional)';
    });
    $('promo-form').addEventListener('submit', function (e) { e.preventDefault(); state.promo = $('promo').value.trim(); update(); });

    $('to-checkout').addEventListener('click', function () {
      if (state.homes < cfg.minHomes) {
        var ze = $('zip-error');
        ze.hidden = false;
        ze.textContent = state.zips.length
          ? 'Your ZIP codes reach ' + int(state.homes) + ' homes. Add more to reach the ' + int(cfg.minHomes) + '-home minimum.'
          : 'Pick at least one ZIP code so we know where to mail.';
        $('h-homes').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      renderCheckout();
      show('checkout');
    });

    /* ---------- checkout ---------- */
    function renderCheckout() {
      $('co-name').textContent = $('order-name').textContent;
      var facts = [
        ['ZIP codes', state.zips.slice().sort().join(', ')],
        ['Counties', chosenCounties().join(', ')],
        ['In-home date', state.inHome || 'Flexible'],
        ['Rush', state.rush ? 'Yes' : 'No'],
        ['Files', files.length ? files.length + ' attached' : 'None'],
      ];
      $('co-facts').innerHTML = facts.map(function (f) { return '<dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd>'; }).join('');
      $('co-lines').innerHTML = linesHtml(current);
      $('co-total').textContent = money(current.total);
    }

    $('back-build').addEventListener('click', function () { show('build'); });

    $('checkout-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var form = e.target, err = $('checkout-error'), bad = [];
      Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (el) {
        var ok = el.type === 'checkbox' ? el.checked : el.value.trim() !== '';
        if (el.type === 'email' && ok) ok = C.validEmail(el.value);
        el.classList.toggle('invalid', !ok);
        if (!ok) bad.push(el);
      });
      if (bad.length) {
        err.hidden = false;
        err.textContent = bad.some(function (el) { return el.type === 'checkbox'; }) && bad.length === 1
          ? 'Please check the box to confirm.'
          : 'Please fill in the highlighted fields' + (bad.some(function (el) { return el.type === 'email' && el.value.trim(); }) ? ' (check your email address)' : '') + '.';
        bad[0].focus();
        return;
      }
      err.hidden = true;
      submitOrder(form);
    });

    function submitOrder(form) {
      var fd = new FormData(form);
      var customer = {};
      ['name', 'company', 'email', 'phone', 'website', 'services', 'address', 'city', 'state', 'zip', 'payment', 'notes'].forEach(function (k) { customer[k] = (fd.get(k) || '').toString().trim(); });
      var number = C.orderNumber();
      var order = {
        number: number,
        placedAt: new Date().toISOString(),
        customer: customer,
        mailer: {
          option: current.product.name,
          size: current.size.dims,
          spec: current.size.spec,
          homes: current.homes,
          mailings: current.mailings,
          ratePerHome: current.rate,
          rush: state.rush,
          counties: chosenCounties(),
          zips: state.zips.slice().sort().map(function (z) { var r = zipByCode[z]; return { zip: r.zip, city: r.city, county: r.county, homes: r.homes }; }),
          inHomeDate: state.inHome.trim(),
          promo: current.promo ? current.promo.code : '',
        },
        lines: current.lines.map(function (l) { return { label: l.label, amount: l.amount, included: l.kind === 'included' }; }),
        subtotal: current.subtotal,
        tax: current.tax,
        total: current.total,
        files: files.map(function (f) { return f.name; }),
      };

      var btn = $('place-order');
      btn.disabled = true; btn.textContent = 'Placing order…';
      var endpoint = cfg.checkout && cfg.checkout.orderEndpoint;

      var done = function () {
        btn.disabled = false; btn.textContent = 'Place order';
        $('done-number').textContent = number;
        $('done-email').textContent = customer.email;
        $('done-homes').textContent = int(current.homes);
        $('done-summary').innerHTML = '<p class="muted small">' + esc($('order-name').textContent) + '</p>' +
          '<div class="lines">' + linesHtml(current) + '</div>' +
          '<div class="total-row"><span>Total</span><strong>' + money(current.total) + '</strong></div>';
        $('demo-note').hidden = !!endpoint;
        try { localStorage.removeItem('bdd-quote'); } catch (e) { /* ignore */ }
        show('done');
      };

      if (!endpoint) { setTimeout(done, 400); return; }
      var body = new FormData();
      var flat = C.flattenOrder(order);
      Object.keys(flat).forEach(function (k) { body.append(k, flat[k] == null ? '' : flat[k]); });
      body.append('order', JSON.stringify(order));
      files.forEach(function (f) { body.append('files', f, f.name); });
      fetch(endpoint, { method: 'POST', body: body })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); done(); })
        .catch(function () {
          btn.disabled = false; btn.textContent = 'Place order';
          var err = $('checkout-error');
          err.hidden = false;
          err.textContent = 'We could not send your order. Please try again, or call ' + cfg.business.phone + '.';
        });
    }

    $('new-order').addEventListener('click', function () {
      $('checkout-form').reset();
      state.zips = starterZips(); state.inHome = ''; state.promo = ''; state.rush = false; state.mailings = 1;
      $('zip-search').value = ''; renderZips(); $('in-home').value = ''; $('promo').value = '';
      files = []; $('files').value = ''; $('files').dispatchEvent(new Event('change'));
      update();
      show('build');
    });

    /* ---------- views ---------- */
    function show(step) {
      ['build', 'checkout', 'done'].forEach(function (s) { $('view-' + s).hidden = s !== step; });
      Array.prototype.forEach.call(document.querySelectorAll('.steps-nav li'), function (li) {
        if (li.dataset.step === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      window.scrollTo(0, 0);
      tellParent('top');
    }

    /* ---------- when embedded in your website (iframe), tell the page our height ---------- */
    var embedded = window.parent !== window;
    function tellParent(scroll) {
      if (!embedded) return;
      try {
        window.parent.postMessage({ bestDealsDirect: true, height: document.documentElement.scrollHeight, scroll: scroll || null }, '*');
      } catch (e) { /* ignore */ }
    }
    if (embedded) {
      document.documentElement.classList.add('embedded');
      if (window.ResizeObserver) new ResizeObserver(function () { tellParent(); }).observe(document.body);
      window.addEventListener('load', function () { tellParent(); });
    }

    /* ---------- #check: shows what the price sheet loaded, for you after an update ---------- */
    function renderCheck() {
      var box = $('data-check');
      var on = location.hash === '#check';
      box.hidden = !on;
      if (!on) return;
      var sizes = cfg.products.reduce(function (n, p) { return n + p.sizes.length; }, 0);
      var homes = ZIPS.reduce(function (n, z) { return n + z.homes; }, 0);
      box.innerHTML = '<h2>Price data check</h2>' +
        '<p>Loaded from: <b>' + esc(source) + '</b></p>' +
        '<ul class="check-list">' +
        '<li>' + cfg.products.length + ' options, ' + sizes + ' sizes, price breaks at ' + cfg.breaks.map(int).join(', ') + ' homes</li>' +
        '<li>' + ZIPS.length + ' ZIP codes, ' + int(homes) + ' homes in total</li>' +
        '<li>Setup ' + money(cfg.setupFee) + ' · Tax ' + cfg.taxPct + '% · Rush ' + cfg.rushPct + '% · Minimum ' + int(cfg.minHomes) + ' homes</li>' +
        '<li>Mailings: ' + cfg.mailings.map(function (m) { return m.count + (m.pct ? ' (save ' + m.pct + '%)' : ''); }).join(', ') + '</li>' +
        '<li>Promo codes: ' + (Object.keys(cfg.promoCodes).map(esc).join(', ') || 'none') + '</li></ul>' +
        (cfg.problems.length
          ? '<p><b>' + cfg.problems.length + ' thing' + (cfg.problems.length > 1 ? 's' : '') + ' to fix:</b></p><ul class="problems">' + cfg.problems.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>'
          : '<p class="all-good">✓ No problems found.</p>') +
        '<p class="muted small">Customers do not see this panel: it only shows when the address ends in #check. After uploading new CSV files, reload this page. Google Sheets edits can take up to 5 minutes to show.</p>';
    }
    window.addEventListener('hashchange', renderCheck);

    /* ---------- remember the quote on this device ---------- */
    function save() {
      try { localStorage.setItem('bdd-quote', JSON.stringify(state)); } catch (e) { /* ignore */ }
    }
    function restore() {
      try {
        var s = JSON.parse(localStorage.getItem('bdd-quote') || 'null');
        if (s && typeof s === 'object') Object.keys(state).forEach(function (k) { if (k in s) state[k] = s[k]; });
      } catch (e) { /* ignore */ }
      // Keep only ZIPs that are still in the distribution list.
      state.zips = (Array.isArray(state.zips) ? state.zips : []).filter(function (z, i, a) { return zipByCode[z] && a.indexOf(z) === i; });
      if (!state.zips.length) state.zips = starterZips();
      $('in-home').value = state.inHome || '';
      $('promo').value = state.promo || '';
    }

    restore();
    state.productId = product().id;
    renderCheck();
    renderStatic();
    renderProducts();
    renderSizes();
    renderZips();
    update();

  }
})();
