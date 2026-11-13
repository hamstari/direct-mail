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
   * Parse CSV or tab-separated text (as pasted from a spreadsheet or exported by Google Sheets)
   * into rows of trimmed cells. Handles quoted cells with commas, quotes and line breaks.
   */
  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, '');
    // Each line uses tabs if it has any (pasted from a spreadsheet), otherwise commas.
    // Excel in some countries saves with semicolons instead of commas.
    var sepAt = function (i) {
      var end = text.indexOf('\n', i), line = text.slice(i, end < 0 ? text.length : end);
      return line.indexOf('\t') >= 0 ? '\t' : (line.indexOf(';') >= 0 && line.indexOf(',') < 0 ? ';' : ',');
    };
    var sep = sepAt(0);
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"' && cell.trim() === '') { q = true; cell = ''; }
      else if (ch === sep) { row.push(cell.trim()); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell.trim()); cell = '';
        if (row.some(function (c) { return c !== ''; })) rows.push(row);
        row = [];
        sep = sepAt(i + 1);
      } else cell += ch;
    }
    row.push(cell.trim());
    if (row.some(function (c) { return c !== ''; })) rows.push(row);
    return rows;
  }

  /** Rows that start with a 5-digit ZIP become { zip, city, county, homes }. Later duplicates win. */
  function zipsFromRows(rows, problems) {
    var map = {};
    rows.forEach(function (parts, i) {
      var zip = String(parts[0] || '').trim();
      // Excel drops leading zeros (01902 becomes 1902), so put them back.
      if (/^\d{3,4}$/.test(zip)) zip = ('00000' + zip).slice(-5);
      zip = zip.replace(/-\d{4}$/, '');
      if (!/^\d{5}$/.test(zip)) {
        if (i > 0 && problems) problems.push('ZIPs row ' + (i + 1) + ': "' + parts[0] + '" is not a 5-digit ZIP, skipped.');
        return;
      }
      var homes = Math.max(0, Math.round(num(parts.slice(3).join(''))));
      if (!homes && problems) problems.push('ZIPs row ' + (i + 1) + ': ZIP ' + zip + ' has no homes count, skipped.');
      if (!homes) return;
      if (map[zip] && problems) problems.push('ZIP ' + zip + ' is listed twice; using the later row.');
      map[zip] = { zip: zip, city: parts[1] || '', county: parts[2] || 'Other', homes: homes };
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return a.county.localeCompare(b.county) || a.zip.localeCompare(b.zip); });
  }

  /** Parse a distribution list (one "zip, city, county, homes" per line, commas or tabs). */
  function parseZips(text) { return zipsFromRows(parseCSV(text)); }

  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x'; }

  /** "8.375" x 10.875"" → { dims: '8.375" × 10.875"', w, h } */
  function parseSize(text) {
    var nums = String(text).match(/\d+(?:\.\d+)?/g) || [];
    var w = parseFloat(nums[0]) || 8.5, h = parseFloat(nums[1]) || 11;
    return { dims: String(text).replace(/\s*[x×X]\s*/, ' × ').trim(), w: w, h: h };
  }

  /**
   * Build the full price config from the site settings (config.js) plus the four sheet tabs
   * (CSV text: prices, zips, settings, promos). Tabs that are missing or unusable fall back to
   * the matching tab in `fallback`. Returns a config for priceOrder, with .zips and .problems.
   */
  function buildData(site, tabs, fallback) {
    var problems = [];
    var out = {};
    Object.keys(site).forEach(function (k) { out[k] = site[k]; });
    tabs = tabs || {};

    function rowsFor(name, check) {
      var rows = tabs[name] != null ? parseCSV(tabs[name]) : null;
      var why = rows == null ? 'not loaded' : check(rows);
      if (why === true) return rows;
      if (fallback && fallback !== tabs) {
        problems.push(name.charAt(0).toUpperCase() + name.slice(1) + ' tab ' + why + '; using the built-in ' + name + '.');
        return parseCSV(fallback[name]);
      }
      problems.push(name + ' tab ' + why + '.');
      return rows || [];
    }

    // Prices: header row = Option, Size, Paper, then break quantities.
    var priceRows = rowsFor('prices', function (rows) {
      if (rows.length < 2) return 'is empty';
      var breaks = rows[0].slice(3).map(num).filter(function (n) { return n > 0; });
      return breaks.length ? true : 'has no price-break columns (numbers like 2500, 5000 after Paper)';
    });
    var header = priceRows[0] || [];
    var breakCols = [];
    header.forEach(function (h, i) { if (i >= 3 && num(h) > 0) breakCols.push({ i: i, qty: Math.round(num(h)) }); });
    breakCols.sort(function (a, b) { return a.qty - b.qty; });
    out.breaks = breakCols.map(function (b) { return b.qty; });

    var products = [], byName = {};
    priceRows.slice(1).forEach(function (r, idx) {
      var name = r[0], sizeText = r[1];
      if (!name || !sizeText) { problems.push('Prices row ' + (idx + 2) + ': needs an Option and a Size, skipped.'); return; }
      var rates = breakCols.map(function (b) { return num(r[b.i]); });
      if (rates.some(function (x) { return !(x > 0); })) { problems.push('Prices row ' + (idx + 2) + ' (' + name + ', ' + sizeText + '): every price-break column needs a price, skipped.'); return; }
      for (var k = 1; k < rates.length; k++) {
        if (rates[k] > rates[k - 1]) problems.push('Prices row ' + (idx + 2) + ' (' + name + ', ' + sizeText + '): price goes up at ' + breakCols[k].qty.toLocaleString('en-US') + ' homes. Check it.');
      }
      var p = byName[name];
      if (!p) {
        var look = (site.options && site.options[name]) || {};
        p = byName[name] = {
          id: slug(name), name: name, blurb: look.blurb || '', icon: look.icon || 'page', badge: look.badge || '',
          postageNote: look.postageNote || 'Postage included.', sizes: [],
        };
        products.push(p);
      }
      var sz = parseSize(sizeText);
      p.sizes.push({ id: slug(name + '-' + sizeText), dims: sz.dims, w: sz.w, h: sz.h, spec: r[2] || '', rates: rates });
    });
    out.products = products;

    // Settings: Setting, Value rows.
    var settingRows = rowsFor('settings', function (rows) { return rows.length > 1 ? true : 'is empty'; });
    var setting = {};
    var mailings = [{ count: 1, pct: 0 }];
    settingRows.forEach(function (r) {
      var key = String(r[0] || '').toLowerCase();
      var m = key.match(/^(\d+)\s*mailings?/);
      if (m && +m[1] > 1) mailings.push({ count: +m[1], pct: num(r[1]) });
      else if (key) setting[key] = r[1];
    });
    mailings.sort(function (a, b) { return a.count - b.count; });
    function pick(re, dflt, label) {
      for (var k in setting) if (re.test(k)) return num(setting[k]);
      problems.push('Settings tab has no "' + label + '" row; using ' + dflt + '.');
      return dflt;
    }
    out.setupFee = pick(/setup/, 49, 'Setup & prepress fee');
    out.taxPct = pick(/tax/, 0, 'Sales tax %');
    out.rushPct = pick(/rush/, 15, 'Rush production %');
    out.minHomes = pick(/minimum/, 2500, 'Minimum homes');
    out.mailings = mailings;

    // Promos: Code, Discount ("10%" or "$49"), Description.
    var promoRows = tabs.promos != null || !fallback ? parseCSV(tabs.promos) : parseCSV(fallback.promos);
    out.promoCodes = {};
    promoRows.forEach(function (r, i) {
      var code = String(r[0] || '').trim().toUpperCase().replace(/\s+/g, '');
      if (!code || code === 'CODE') return;
      var d = String(r[1] || '');
      var entry = /%/.test(d) ? { pct: num(d) } : { amount: num(d) };
      if (!(entry.pct || entry.amount)) { problems.push('Promos row ' + (i + 1) + ' (' + code + '): discount should look like 10% or $49, skipped.'); return; }
      entry.label = r[2] || (entry.pct ? entry.pct + '% off your ad' : '$' + entry.amount + ' off');
      out.promoCodes[code] = entry;
    });

    // ZIPs.
    var zipRows = rowsFor('zips', function (rows) {
      return zipsFromRows(rows).length ? true : 'has no rows with a 5-digit ZIP and a homes count';
    });
    out.zips = zipsFromRows(zipRows, problems);

    if (!products.length && fallback && fallback !== tabs) {
      problems.push('No usable rows in the Prices tab; using the built-in prices.');
      var fb = buildData(site, { prices: fallback.prices, settings: tabs.settings, promos: tabs.promos, zips: tabs.zips }, fallback);
      out.products = fb.products; out.breaks = fb.breaks;
    }
    var def = (site.defaultOption && out.products.filter(function (p) { return p.name === site.defaultOption; })[0]) || out.products[0];
    out.defaultProductId = def ? def.id : null;
    out.problems = problems;
    return out;
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

  /**
   * One-level fields for webhooks (Zapier, Make, sheets): easy to map, no nested JSON.
   * order: the object built at checkout.
   */
  function flattenOrder(order) {
    var c = order.customer || {}, m = order.mailer || {};
    var money2 = function (n) { return (Math.round(n * 100) / 100).toFixed(2); };
    var fee = function (re) {
      var l = (order.lines || []).filter(function (x) { return re.test(x.label); })[0];
      return l ? money2(l.amount) : '0.00';
    };
    return {
      order_number: order.number,
      placed_at: order.placedAt,
      customer_name: c.name, company: c.company, customer_email: c.email, customer_phone: c.phone,
      website: c.website, services: c.services,
      billing_address: c.address, billing_city: c.city, billing_state: c.state, billing_zip: c.zip,
      payment_method: c.payment, notes: c.notes,
      mail_option: m.option, ad_size: m.size, paper: m.spec,
      homes: String(m.homes), mailings: String(m.mailings), total_pieces: String(m.homes * m.mailings),
      zip_codes: (m.zips || []).map(function (z) { return z.zip; }).join(', '),
      zip_detail: (m.zips || []).map(function (z) { return z.zip + ' ' + z.city + ' (' + z.county + ') ' + z.homes; }).join('; '),
      counties: (m.counties || []).join(', '),
      in_home_date: m.inHomeDate, rush: m.rush ? 'Yes' : 'No', promo_code: m.promo,
      rate_per_home: String(m.ratePerHome),
      setup_fee: fee(/^Setup/), rush_fee: fee(/^Rush/),
      subtotal: money2(order.subtotal), sales_tax: money2(order.tax), total: money2(order.total),
      file_names: (order.files || []).join(', '),
      line_items: (order.lines || []).map(function (l) { return l.label + ': ' + (l.included ? 'Included' : money2(l.amount)); }).join('\n'),
    };
  }

  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); }

  var api = {
    priceOrder: priceOrder,
    breakIndex: breakIndex,
    mailingPct: mailingPct,
    findPromo: findPromo,
    clampHomes: clampHomes,
    parseZips: parseZips,
    parseCSV: parseCSV,
    buildData: buildData,
    homesForZips: homesForZips,
    orderNumber: orderNumber,
    validEmail: validEmail,
    flattenOrder: flattenOrder,
    round2: round2,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MailCalc = api;
})(typeof window !== 'undefined' ? window : this);
