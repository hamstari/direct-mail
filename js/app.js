/* Page behavior: build → checkout → confirmation. */
(function () {
  'use strict';

  var cfg = window.MailConfig;
  var C = window.MailCalc;
  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var int = function (n) { return Math.round(n).toLocaleString('en-US'); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var state = {
    productId: 'fullpage',
    sizeId: null,
    homes: 10000,
    mailings: 1,
    rush: false,
    promo: '',
    counties: '',
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

  /* ---------- homes slider (log scale) ---------- */
  var sMin = cfg.minHomes, sMax = cfg.quickPicks[cfg.quickPicks.length - 1];
  function toSlider(h) { return Math.round(1000 * Math.log(Math.min(sMax, Math.max(sMin, h)) / sMin) / Math.log(sMax / sMin)); }
  function fromSlider(v) {
    var h = sMin * Math.pow(sMax / sMin, v / 1000);
    var step = h < 10000 ? 500 : h < 50000 ? 1000 : 5000;
    return Math.round(h / step) * step;
  }

  /* ---------- render: build ---------- */
  function product() { return cfg.products.filter(function (p) { return p.id === state.productId; })[0] || cfg.products[0]; }

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

    $('homes-range').min = 0; $('homes-range').max = 1000; $('homes-range').step = 1;
    $('quick-picks').innerHTML = cfg.quickPicks.map(function (q) {
      return '<button type="button" data-homes="' + q + '">' + int(q) + '</button>';
    }).join('');
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
    current = C.priceOrder(cfg, state);

    $('postage-note').textContent = '✓ ' + p.postageNote;
    $('spec').innerHTML = sizeShape(current.size) + '<div><b>' + esc(p.name) + ' · ' + esc(current.size.dims) + '</b>' +
      '<span class="muted">' + esc(current.size.spec.charAt(0).toUpperCase() + current.size.spec.slice(1)) + '. Designed by our in-house team.</span></div>';

    if (document.activeElement !== $('homes')) $('homes').value = state.homes;
    $('homes-range').value = toSlider(state.homes);
    $('homes-range').style.setProperty('--pct', ($('homes-range').value / 10) + '%');
    Array.prototype.forEach.call($('quick-picks').children, function (b) { b.setAttribute('aria-pressed', +b.dataset.homes === state.homes); });
    Array.prototype.forEach.call($('mailings').children, function (b) { b.setAttribute('aria-checked', +b.dataset.mailings === state.mailings); });
    $('rush').checked = state.rush;

    var summary = p.name + ' · ' + current.size.dims + ' · ' + int(current.homes) + ' homes' +
      (current.mailings > 1 ? ' · ' + current.mailings + ' mailings' : '');
    $('order-name').textContent = summary;
    $('order-notes').innerHTML = current.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
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
  $('homes-range').addEventListener('input', function (e) { state.homes = fromSlider(+e.target.value); update(); });
  $('homes').addEventListener('input', function (e) {
    var n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
    state.homes = isFinite(n) ? n : 0;
    update();
  });
  $('homes').addEventListener('blur', function () {
    state.homes = C.clampHomes(cfg, state.homes); $('homes').value = state.homes; update();
  });
  $('quick-picks').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    state.homes = +b.dataset.homes; $('homes').value = state.homes; update();
  });
  $('mailings').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    state.mailings = +b.dataset.mailings; update();
  });
  $('rush').addEventListener('change', function (e) { state.rush = e.target.checked; update(); });
  $('counties').addEventListener('input', function (e) {
    state.counties = e.target.value; if (state.counties.trim()) { $('counties-error').hidden = true; e.target.classList.remove('invalid'); } save();
  });
  $('in-home').addEventListener('input', function (e) { state.inHome = e.target.value; save(); });
  $('files').addEventListener('change', function (e) {
    files = Array.prototype.slice.call(e.target.files || []);
    $('files-label').innerHTML = files.length
      ? '<span aria-hidden="true">📎</span> ' + files.length + ' file' + (files.length > 1 ? 's' : '') + ' attached: ' + esc(files.map(function (f) { return f.name; }).join(', '))
      : '<span aria-hidden="true">📎</span> Have a logo or photos? Attach them for our designers (optional)';
  });
  $('promo-form').addEventListener('submit', function (e) { e.preventDefault(); state.promo = $('promo').value.trim(); update(); });

  $('to-checkout').addEventListener('click', function () {
    if (!state.counties.trim()) {
      $('counties-error').hidden = false;
      $('counties').classList.add('invalid');
      $('counties').scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('counties').focus({ preventScroll: true });
      return;
    }
    state.homes = C.clampHomes(cfg, state.homes);
    update();
    renderCheckout();
    show('checkout');
  });

  /* ---------- checkout ---------- */
  function renderCheckout() {
    $('co-name').textContent = $('order-name').textContent;
    var facts = [
      ['Counties', state.counties],
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
        counties: state.counties.trim(),
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
    body.append('order', JSON.stringify(order));
    files.forEach(function (f) { body.append('files', f, f.name); });
    fetch(endpoint, { method: 'POST', body: body, headers: { Accept: 'application/json' } })
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
    state.counties = ''; state.inHome = ''; state.promo = ''; state.rush = false; state.mailings = 1;
    $('counties').value = ''; $('in-home').value = ''; $('promo').value = '';
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
  }

  /* ---------- remember the quote on this device ---------- */
  function save() {
    try { localStorage.setItem('bdd-quote', JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function restore() {
    try {
      var s = JSON.parse(localStorage.getItem('bdd-quote') || 'null');
      if (s && typeof s === 'object') Object.keys(state).forEach(function (k) { if (k in s) state[k] = s[k]; });
    } catch (e) { /* ignore */ }
    $('counties').value = state.counties || '';
    $('in-home').value = state.inHome || '';
    $('promo').value = state.promo || '';
  }

  restore();
  renderStatic();
  renderProducts();
  renderSizes();
  update();
})();
