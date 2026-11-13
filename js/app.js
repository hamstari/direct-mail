/* UI wiring for the direct mail calculator and checkout. */
(function () {
  'use strict';
  var cfg = window.MailConfig;
  var C = window.MailCalc;
  var $ = function (id) { return document.getElementById(id); };
  var fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  var fmt0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  var n0 = new Intl.NumberFormat('en-US');
  var money = function (v) { return fmt.format(v); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // ---------- storage (never required) ----------
  var KEY = 'dm-calc-v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ sel: sel, cart: cart })); } catch (e) { /* ignore */ } }

  var defaults = {
    kind: 'solo', sizeId: 'pc-625x11', qty: 5000, delivery: 'eddm', area: '',
    stock: cfg.stocks[0].id, finish: cfg.finishes[0].id, sides: cfg.sides[0].id,
    design: cfg.design[0].id, turnaround: cfg.turnaround[0].id, drops: 1,
  };
  var saved = load();
  var sel = Object.assign({}, defaults, saved.sel || {});
  var cart = Array.isArray(saved.cart) ? saved.cart : [];
  var editingId = null;

  function sizeOf(id) { return cfg.sizes.filter(function (s) { return s.id === id; })[0] || cfg.sizes[0]; }

  // ---------- shapes ----------
  /** A rectangle for a size, scaled to fit a box. Shared ads are drawn on their full sheet. */
  function shapeHTML(size, boxW, boxH, label) {
    if (size.kind === 'shared') {
      var sh = cfg.sharedSheet;
      var k = Math.min(boxW / sh.w, boxH / sh.h);
      var inner = label
        ? '<div class="ad" style="width:' + size.w * k + 'px;height:' + size.h * k + 'px">' + esc(label) + '</div>'
        : '<i style="width:' + size.w * k + 'px;height:' + size.h * k + 'px;border:2px solid var(--accent)"></i>';
      return '<div class="sheet" style="width:' + sh.w * k + 'px;height:' + sh.h * k + 'px">' + inner + '</div>';
    }
    var s = Math.min(boxW / size.w, boxH / size.h);
    if (label) return '<div class="ad" style="width:' + size.w * s + 'px;height:' + size.h * s + 'px">' + esc(label) + '</div>';
    return '<i style="width:' + size.w * s + 'px;height:' + size.h * s + 'px"></i>';
  }

  function fromPrice(size) {
    if (size.kind === 'shared') return 'from ' + fmt0.format(size.perThousand) + ' per 1,000 homes';
    var low = size.print[size.print.length - 1] + (size.eddm ? size.postage.eddm : size.postage.targeted);
    return 'from ~' + Math.round(low * 100) + '¢ each mailed';
  }

  // ---------- quote form ----------
  function renderSizes() {
    var list = cfg.sizes.filter(function (s) { return s.kind === sel.kind; });
    if (sizeOf(sel.sizeId).kind !== sel.kind) sel.sizeId = list[0].id;
    $('sizes').innerHTML = list.map(function (s) {
      return '<label class="size"><input type="radio" name="size" value="' + s.id + '"' + (s.id === sel.sizeId ? ' checked' : '') + '>' +
        '<span class="shape">' + shapeHTML(s, 96, 60) + '</span>' +
        '<b>' + esc(s.name) + '</b><span class="dims">' + esc(s.dims) + '</span>' +
        (s.eddm ? '<span class="tag">EDDM ready</span>' : '') +
        '<span class="from">' + fromPrice(s) + '</span></label>';
    }).join('');
    $('size-note').textContent = sel.kind === 'shared'
      ? 'Your ad shares an ' + cfg.sharedSheet.w + '" × ' + cfg.sharedSheet.h + '" mailer with other local businesses (no competitors in your category). Printing and postage included. Minimum ' + n0.format(cfg.minimums.shared) + ' homes.'
      : 'EDDM ready sizes can go to every home on a mail route without buying a list.';
  }

  function renderDelivery() {
    var size = sizeOf(sel.sizeId);
    $('delivery-wrap').hidden = size.kind === 'shared';
    $('paper-card').hidden = size.kind === 'shared';
    $('s4n').textContent = size.kind === 'shared' ? '3' : '4';
    if (size.kind === 'shared') return;
    if (sel.delivery === 'eddm' && !size.eddm) sel.delivery = 'targeted';
    $('delivery').innerHTML = Object.keys(cfg.delivery).map(function (key) {
      var d = cfg.delivery[key];
      var off = key === 'eddm' && !size.eddm;
      return '<label class="radio' + (off ? ' disabled' : '') + '"><input type="radio" name="delivery" value="' + key + '"' +
        (sel.delivery === key ? ' checked' : '') + (off ? ' disabled' : '') + '><span><b>' + esc(d.name) + '</b><small>' +
        esc(off ? 'Needs a larger size (at least 6.25" × 11" or a flyer).' : d.note) + '</small></span></label>';
    }).join('');
  }

  function fillSelect(id, list, value, labelFn) {
    $(id).innerHTML = list.map(function (o) {
      return '<option value="' + o.id + '"' + (o.id === value ? ' selected' : '') + '>' + esc(labelFn ? labelFn(o) : o.name) + '</option>';
    }).join('');
  }

  function renderOptions() {
    fillSelect('stock', cfg.stocks, sel.stock);
    fillSelect('finish', cfg.finishes, sel.finish, function (o) { return o.name + (o.mult > 1 ? ' (+' + Math.round((o.mult - 1) * 100) + '%)' : ''); });
    fillSelect('sides', cfg.sides, sel.sides);
    fillSelect('turnaround', cfg.turnaround, sel.turnaround, function (o) { return o.name + (o.pct ? ' (+' + o.pct + '%)' : ''); });
    var drops = [];
    for (var i = 1; i <= cfg.maxDrops; i++) {
      var p = C.dropDiscountPct(cfg, i);
      drops.push({ id: String(i), name: (i === 1 ? 'Once' : i + ' times') + (i > 1 && p ? ' (save ' + p + '%)' : '') });
    }
    fillSelect('drops', drops, String(sel.drops));
    $('design').innerHTML = cfg.design.map(function (d) {
      return '<label class="radio"><input type="radio" name="design" value="' + d.id + '"' + (sel.design === d.id ? ' checked' : '') +
        '><span><b>' + esc(d.name) + '</b></span><span class="price">' + (d.price ? fmt0.format(d.price) : 'Free') + '</span></label>';
    }).join('');
    var tiers = cfg.dropDiscounts.map(function (d) { return d.minDrops + '+ times: ' + d.pct + '% off'; }).join(' · ');
    $('drops-note').textContent = 'Mailing the same ad again builds recognition. ' + tiers + ' (on printing / ad space).';
  }

  function renderQty() {
    var size = sizeOf(sel.sizeId);
    var homes = size.kind === 'shared' || sel.delivery === 'eddm';
    $('qty-label').textContent = homes ? 'How many homes (per mailing)' : 'How many pieces (per mailing)';
    $('qty').value = sel.qty;
    var picks = size.kind === 'shared' ? [5000, 10000, 20000, 40000] : [500, 1000, 2500, 5000, 10000];
    $('qty-chips').innerHTML = picks.map(function (q) {
      return '<button type="button" data-q="' + q + '" aria-pressed="' + (Number(sel.qty) === q) + '">' + n0.format(q) + '</button>';
    }).join('');
    $('area').value = sel.area || '';
  }

  function describe(s, r) {
    var size = r.size;
    var bits = [size.dims, n0.format(r.qty) + (size.kind === 'shared' || r.method === 'eddm' ? ' homes' : ' pieces')];
    if (size.kind !== 'shared') bits.push(cfg.delivery[r.method].name);
    if (r.drops > 1) bits.push('mailed ' + r.drops + '×');
    return bits.join(' · ');
  }

  function updateSummary() {
    var r = C.priceItem(cfg, sel);
    var size = r.size;
    $('preview').innerHTML = shapeHTML(size, 150, 96, size.kind === 'shared' ? size.name.replace(' ad', '') : 'YOUR AD');
    $('sum-h').textContent = size.name + ' · ' + size.dims;
    $('sum-sub').textContent = describe(sel, r).split(' · ').slice(1).join(' · ');

    var rows = r.lines.map(function (l) { return '<tr><td>' + esc(l.label) + '</td><td>' + money(l.amount) + '</td></tr>'; });
    if (r.drops > 1) {
      rows.push('<tr class="sub"><td>Each mailing</td><td>' + money(r.perDrop) + '</td></tr>');
      rows.push('<tr><td>× ' + r.drops + ' mailings</td><td>' + money(r.perDrop * r.drops) + '</td></tr>');
    }
    if (r.discount) rows.push('<tr class="disc"><td>Repeat mailing discount (' + r.discountPct + '%)</td><td>−' + money(r.discount) + '</td></tr>');
    if (r.oneTime) rows.push('<tr><td>' + esc(r.design.name) + ' (one time)</td><td>' + money(r.oneTime) + '</td></tr>');
    $('lines').innerHTML = rows.join('');
    $('total').textContent = money(r.total);
    $('per').textContent = r.qty ? '≈ ' + (r.perPiece * 100).toFixed(1) + '¢ per home reached' + (r.oneTime ? ', before design' : '') : '';
    $('notes').innerHTML = r.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
    $('add').textContent = editingId ? 'Update order' : 'Add to order · ' + money(r.total);
    $('cancel-edit').hidden = !editingId;
    save();
  }

  function renderQuote() {
    document.querySelector('input[name=kind][value=' + sel.kind + ']').checked = true;
    renderSizes();
    renderDelivery();
    renderOptions();
    renderQty();
    updateSummary();
  }

  // events
  document.querySelectorAll('input[name=kind]').forEach(function (el) {
    el.addEventListener('change', function () {
      sel.kind = el.value;
      if (sel.kind === 'shared' && sel.qty < cfg.minimums.shared) sel.qty = 10000;
      renderSizes(); renderDelivery(); renderQty(); updateSummary();
    });
  });
  $('sizes').addEventListener('change', function (e) {
    if (e.target.name !== 'size') return;
    sel.sizeId = e.target.value;
    renderDelivery(); renderQty(); updateSummary();
  });
  $('delivery').addEventListener('change', function (e) {
    if (e.target.name !== 'delivery') return;
    sel.delivery = e.target.value;
    renderQty(); updateSummary();
  });
  $('design').addEventListener('change', function (e) { if (e.target.name === 'design') { sel.design = e.target.value; updateSummary(); } });
  $('qty').addEventListener('input', function () {
    sel.qty = Math.max(0, parseInt($('qty').value, 10) || 0);
    $('qty-chips').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.q) === sel.qty)); });
    updateSummary();
  });
  $('qty-chips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    sel.qty = Number(b.dataset.q); renderQty(); updateSummary();
  });
  $('area').addEventListener('input', function () { sel.area = $('area').value; save(); });
  ['stock', 'finish', 'sides', 'turnaround', 'drops'].forEach(function (id) {
    $(id).addEventListener('change', function () { sel[id] = id === 'drops' ? Number($(id).value) : $(id).value; updateSummary(); });
  });

  $('add').addEventListener('click', function () {
    var item = { id: editingId || String(Date.now()), sel: Object.assign({}, sel) };
    if (editingId) cart = cart.map(function (c) { return c.id === editingId ? item : c; });
    else cart.push(item);
    editingId = null;
    save();
    location.hash = '#cart';
  });
  $('cancel-edit').addEventListener('click', function () {
    editingId = null; sel = Object.assign({}, defaults); location.hash = '#cart';
  });

  // ---------- cart ----------
  function priced() {
    return cart.map(function (c) { return { item: c, r: C.priceItem(cfg, c.sel) }; });
  }

  function totalsHTML(t) {
    var h = '<div class="row"><span>Subtotal</span><span>' + money(t.subtotal) + '</span></div>';
    if (cfg.taxPct) h += '<div class="row"><span>Sales tax (' + cfg.taxPct + '%)</span><span>' + money(t.tax) + '</span></div>';
    h += '<div class="row grand"><span>Total</span><span>' + money(t.total) + '</span></div>';
    if (t.dueLater > 0) h += '<div class="row muted small-text"><span>Due today (' + cfg.checkout.depositPct + '% deposit)</span><span>' + money(t.deposit) + '</span></div>' +
      '<div class="row muted small-text"><span>Due before mailing</span><span>' + money(t.dueLater) + '</span></div>';
    return h;
  }

  function renderCartBadge() {
    $('cart-count').textContent = cart.length;
    $('cart-count').classList.toggle('zero', !cart.length);
  }

  function renderCart() {
    var p = priced();
    $('cart-empty').hidden = p.length > 0;
    $('cart-full').hidden = p.length === 0;
    $('cart-items').innerHTML = p.map(function (x) {
      var r = x.r;
      return '<li class="card cart-item" data-id="' + x.item.id + '">' +
        '<div class="thumb">' + shapeHTML(r.size, 60, 48, ' ') + '</div>' +
        '<div><h3>' + esc(r.size.name) + '</h3><p class="meta">' + esc(describe(x.item.sel, r)) +
        (r.oneTime ? ' · ' + esc(r.design.name) : '') + (x.item.sel.area ? '<br>Area: ' + esc(x.item.sel.area) : '') + '</p>' +
        '<div class="btns"><button class="linkbtn" data-act="edit">Edit</button><button class="linkbtn" data-act="dup">Duplicate</button><button class="linkbtn danger" data-act="del">Remove</button></div></div>' +
        '<div class="amt">' + money(r.total) + '</div></li>';
    }).join('');
    $('cart-totals').innerHTML = totalsHTML(C.cartTotals(cfg, p.map(function (x) { return x.r; })));
  }

  $('cart-items').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var id = b.closest('[data-id]').dataset.id;
    var item = cart.filter(function (c) { return c.id === id; })[0];
    if (b.dataset.act === 'del') cart = cart.filter(function (c) { return c.id !== id; });
    if (b.dataset.act === 'dup') cart.splice(cart.indexOf(item) + 1, 0, { id: String(Date.now()), sel: Object.assign({}, item.sel) });
    if (b.dataset.act === 'edit') { editingId = id; sel = Object.assign({}, defaults, item.sel); save(); location.hash = '#quote'; return; }
    save(); renderCart(); renderCartBadge();
  });
  $('add-another').addEventListener('click', function () { editingId = null; });

  // ---------- checkout ----------
  function renderCheckout() {
    var p = priced();
    $('co-items').innerHTML = p.map(function (x) {
      return '<li><span>' + esc(x.r.size.name) + '<small>' + esc(describe(x.item.sel, x.r)) + '</small></span><span>' + money(x.r.total) + '</span></li>';
    }).join('');
    $('co-totals').innerHTML = totalsHTML(C.cartTotals(cfg, p.map(function (x) { return x.r; })));
    // earliest mail date: 7 business days out, 3 for rush-only orders
    var rush = p.length && p.every(function (x) { return x.item.sel.turnaround === 'rush'; });
    var d = new Date(), add = rush ? 3 : 7;
    while (add > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) add--; }
    var iso = d.toISOString().slice(0, 10);
    var md = $('mail-date');
    md.min = iso;
    if (!md.value || md.value < iso) md.value = iso;
  }

  var form = $('checkout-form');
  function clearInvalid(e) {
    e.target.classList.remove('invalid');
    if (!form.querySelector('.invalid')) $('form-error').hidden = true;
  }
  form.addEventListener('input', clearInvalid);
  form.addEventListener('change', clearInvalid);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('form-error');
    err.hidden = true;
    var bad = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      var ok = el.checkValidity();
      if (el.name === 'email') ok = ok && C.validEmail(el.value);
      el.classList.toggle('invalid', !ok);
      if (!ok) bad.push(el);
    });
    if (!cart.length) { err.textContent = 'Your order is empty.'; err.hidden = false; return; }
    if (bad.length) {
      err.textContent = bad.some(function (el) { return el.name === 'agree'; }) && bad.length === 1
        ? 'Please check the proof approval box.' : 'Please fill in the highlighted fields.';
      err.hidden = false;
      bad[0].focus();
      return;
    }

    var fd = new FormData(form);
    var p = priced();
    var totals = C.cartTotals(cfg, p.map(function (x) { return x.r; }));
    var order = {
      number: C.orderNumber(),
      createdAt: new Date().toISOString(),
      customer: {
        name: fd.get('name'), company: fd.get('company'), email: fd.get('email'), phone: fd.get('phone'),
        address: { street: fd.get('street'), city: fd.get('city'), state: fd.get('state'), zip: fd.get('zip') },
      },
      mailDate: fd.get('mailDate'),
      notes: fd.get('notes'),
      payment: fd.get('payment'),
      items: p.map(function (x) {
        return {
          adSize: x.r.size.name + ' (' + x.r.size.dims + ')',
          description: describe(x.item.sel, x.r),
          area: x.item.sel.area || '',
          options: x.item.sel,
          lines: x.r.lines, perMailing: x.r.perDrop, mailings: x.r.drops,
          discount: x.r.discount, design: x.r.design.name, designPrice: x.r.oneTime, total: x.r.total,
        };
      }),
      totals: totals,
      files: fd.getAll('files').filter(function (f) { return f && f.name; }).map(function (f) { return f.name; }),
    };

    var btn = $('place');
    btn.disabled = true; btn.textContent = 'Placing order…';

    var endpoint = cfg.checkout.orderEndpoint;
    var send = endpoint
      ? (function () {
          var body = new FormData();
          body.append('order', JSON.stringify(order));
          body.append('_subject', 'New direct mail order ' + order.number);
          body.append('email', order.customer.email);
          fd.getAll('files').forEach(function (f) { if (f && f.name) body.append('files', f, f.name); });
          return fetch(endpoint, { method: 'POST', body: body, headers: { Accept: 'application/json' } })
            .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); });
        })()
      : Promise.resolve();

    send.then(function () {
      try { sessionStorage.setItem('dm-last-order', JSON.stringify({ order: order, demo: !endpoint })); } catch (x) { /* ignore */ }
      lastOrder = { order: order, demo: !endpoint };
      cart = []; save(); renderCartBadge(); form.reset();
      location.hash = '#done';
    }).catch(function () {
      err.textContent = "We couldn't send your order. Please try again, or call us at " + cfg.business.phone + '.';
      err.hidden = false;
    }).then(function () { btn.disabled = false; btn.textContent = 'Place order'; });
  });

  // ---------- confirmation ----------
  var lastOrder = null;
  function renderDone() {
    if (!lastOrder) { try { lastOrder = JSON.parse(sessionStorage.getItem('dm-last-order')); } catch (e) { /* ignore */ } }
    if (!lastOrder) { location.hash = '#quote'; return; }
    var o = lastOrder.order;
    $('done-num').textContent = o.number;
    $('done-demo').hidden = !lastOrder.demo;
    var payUrl = cfg.checkout.paymentUrl;
    var due = o.totals.deposit;
    if (o.payment === 'card' && payUrl) {
      var link = $('pay-link');
      link.href = payUrl.replace('{total}', due.toFixed(2)).replace('{order}', encodeURIComponent(o.number));
      link.textContent = 'Pay ' + money(due) + ' now';
      link.hidden = false;
      $('done-msg').textContent = 'Thanks, ' + o.customer.name + '! Finish by paying on our secure payment page. We will email a proof to ' + o.customer.email + ' before anything prints.';
    } else {
      $('pay-link').hidden = true;
      $('done-msg').textContent = 'Thanks, ' + o.customer.name + '! We will email a proof' + (o.payment === 'invoice' ? ' and an invoice' : ' and a payment link') + ' to ' + o.customer.email + ' within one business day.';
    }
    $('done-summary').innerHTML = '<ul class="co-items">' + o.items.map(function (it) {
      return '<li><span>' + esc(it.adSize) + '<small>' + esc(it.description) + '</small></span><span>' + money(it.total) + '</span></li>';
    }).join('') + '</ul><div id="done-totals">' + totalsHTML(o.totals) + '</div>' +
      '<p class="muted small-text">Earliest mail date: ' + esc(o.mailDate) + '</p>';
    $('done-totals').querySelectorAll('.row').forEach(function (r) { r.style.display = 'flex'; r.style.justifyContent = 'space-between'; });
  }

  // ---------- router ----------
  var views = ['quote', 'cart', 'checkout', 'done'];
  function route() {
    var v = (location.hash || '#quote').slice(1);
    if (views.indexOf(v) < 0) v = 'quote';
    if (v === 'checkout' && !cart.length) { location.hash = '#cart'; return; }
    views.forEach(function (name) { $('view-' + name).hidden = name !== v; });
    if (v === 'quote') renderQuote();
    if (v === 'cart') renderCart();
    if (v === 'checkout') renderCheckout();
    if (v === 'done') renderDone();
    renderCartBadge();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  $('brand').textContent = cfg.business.name;
  document.title = cfg.business.name + ' · Direct Mail Pricing';
  $('foot').innerHTML = esc(cfg.business.name) + ' · <a href="mailto:' + esc(cfg.business.email) + '">' + esc(cfg.business.email) + '</a> · ' + esc(cfg.business.phone) +
    '<br>Prices are estimates until your proof and mailing routes are confirmed. Postage follows current USPS rates.';
  route();
})();
