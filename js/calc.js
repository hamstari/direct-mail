/*
 * Pricing math. Pure functions, no DOM.
 * Works as a browser global (window.MailCalc) and as a CommonJS module (for tests).
 */
(function (root) {
  'use strict';

  function num(v) {
    var n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : 0;
  }
  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }
  function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }

  /** Index of the highest price break the quantity reaches. */
  function breakIndex(breaks, homes) {
    var idx = 0;
    for (var i = 0; i < breaks.length; i++) if (homes >= breaks[i]) idx = i;
    return idx;
  }

  function mailingPct(cfg, count) {
    var pct = 0;
    cfg.mailings.forEach(function (m) { if (count >= m.count) pct = m.pct; });
    return pct;
  }

  function findPromo(cfg, code) {
    var key = String(code || '').trim().toUpperCase();
    if (!key) return null;
    var p = cfg.promoCodes && cfg.promoCodes[key];
    return p ? { code: key, pct: p.pct || 0, amount: p.amount || 0, label: p.label || key } : null;
  }

  /** Clamp a homes count into the allowed range. */
  function clampHomes(cfg, homes) {
    var n = Math.round(num(homes));
    return Math.min(cfg.maxHomes, Math.max(cfg.minHomes, n));
  }

  /**
   * Price an order.
   * sel: { productId, sizeId, homes, mailings, rush, promo }
   * Returns { product, size, homes, mailings, rate, lines, subtotal, tax, total, perHome, pieces, promo, promoError, notes }
   *   lines: [{ label, amount, kind }]  kind: 'item' | 'included' | 'discount' | 'fee'
   */
  function priceOrder(cfg, sel) {
    var product = byId(cfg.products, sel.productId);
    var size = byId(product.sizes, sel.sizeId);
    var notes = [];
    var rawHomes = Math.round(num(sel.homes));
    var homes = clampHomes(cfg, rawHomes);
    if (rawHomes < cfg.minHomes) notes.push('Minimum is ' + fmtInt(cfg.minHomes) + ' homes; priced at the minimum.');
    if (rawHomes > cfg.maxHomes) notes.push('For more than ' + fmtInt(cfg.maxHomes) + ' homes, call us for a custom quote.');

    var mailings = Math.max(1, Math.round(num(sel.mailings) || 1));
    var rate = size.rates[breakIndex(cfg.breaks, homes)];
    var perMailing = round2(rate * homes);
    var name = product.name + ' · ' + size.dims + ' · ' + fmtInt(homes) + ' homes';
    var lines = [];

    var ad = round2(perMailing * mailings);
    lines.push({ label: name + (mailings > 1 ? ' × ' + mailings + ' mailings' : ''), amount: ad, kind: 'item' });

    var mPct = mailings > 1 ? mailingPct(cfg, mailings) : 0;
    var mDisc = round2(ad * mPct / 100);
    if (mDisc) lines.push({ label: mailings + ' mailings (save ' + mPct + '%)', amount: -mDisc, kind: 'discount' });
    var adNet = ad - mDisc;

    var promo = findPromo(cfg, sel.promo);
    var promoError = sel.promo && String(sel.promo).trim() && !promo ? 'That code is not valid.' : '';
    var promoPctDisc = promo && promo.pct ? round2(adNet * promo.pct / 100) : 0;
    adNet -= promoPctDisc;

    lines.push({ label: 'Postage', amount: 0, kind: 'included' });
    lines.push({ label: 'Ad design (in-house team)', amount: 0, kind: 'included' });

    if (sel.rush) lines.push({ label: 'Rush production (' + cfg.rushPct + '%)', amount: round2(adNet * cfg.rushPct / 100), kind: 'fee' });
    lines.push({ label: 'Setup & prepress', amount: round2(cfg.setupFee), kind: 'fee' });

    var before = lines.reduce(function (s, l) { return s + l.amount; }, 0) - promoPctDisc;
    var promoAmtDisc = promo && promo.amount ? round2(Math.min(promo.amount, before)) : 0;
    var promoDisc = round2(promoPctDisc + promoAmtDisc);
    if (promoDisc) lines.push({ label: 'Promo ' + promo.code + ' (' + promo.label + ')', amount: -promoDisc, kind: 'discount' });

    var subtotal = round2(lines.reduce(function (s, l) { return s + l.amount; }, 0));
    var tax = round2(subtotal * cfg.taxPct / 100);
    lines.push({ label: 'Sales tax (' + cfg.taxPct + '%)', amount: tax, kind: 'fee' });
    var total = round2(subtotal + tax);
    var pieces = homes * mailings;

    return {
      product: product,
      size: size,
      name: name,
      homes: homes,
      mailings: mailings,
      rate: rate,
      perMailing: perMailing,
      lines: lines,
      subtotal: subtotal,
      tax: tax,
      total: total,
      pieces: pieces,
      perHome: pieces ? total / pieces : 0,
      promo: promo,
      promoError: promoError,
      notes: notes,
    };
  }

  /**
   * Parse the distribution list (one "zip, city, county, homes" per line, commas or tabs).
   * Skips blank lines, a header row and lines without a 5-digit ZIP. Later duplicates win.
   */
  function parseZips(text) {
    var map = {};
    String(text || '').split(/\r?\n/).forEach(function (line) {
      var parts = line.split(/\t|,/).map(function (s) { return s.trim(); });
      var zip = (parts[0] || '').replace(/[^0-9]/g, '');
      if (!/^\d{5}$/.test(zip)) return;
      map[zip] = { zip: zip, city: parts[1] || '', county: parts[2] || 'Other', homes: Math.max(0, Math.round(num(parts.slice(3).join('')))) };
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return a.county.localeCompare(b.county) || a.zip.localeCompare(b.zip); });
  }

  /** Total homes in the chosen ZIPs (unknown ZIPs count as 0). */
  function homesForZips(list, chosen) {
    var set = {};
    (chosen || []).forEach(function (z) { set[z] = true; });
    return list.reduce(function (s, z) { return s + (set[z.zip] ? z.homes : 0); }, 0);
  }

  /** Short readable order number like BD-261113-4F7Q. */
  function orderNumber(date, rand) {
    var d = date || new Date();
    var r = rand || Math.random;
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 4; i++) code += chars[Math.floor(r() * chars.length)];
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'BD-' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + code;
  }

  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); }

  var api = {
    priceOrder: priceOrder,
    breakIndex: breakIndex,
    mailingPct: mailingPct,
    findPromo: findPromo,
    clampHomes: clampHomes,
    parseZips: parseZips,
    homesForZips: homesForZips,
    orderNumber: orderNumber,
    validEmail: validEmail,
    round2: round2,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MailCalc = api;
})(typeof window !== 'undefined' ? window : this);
