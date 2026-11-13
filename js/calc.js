/*
 * Direct mail pricing math. Pure functions, no DOM.
 * Works as a browser global (window.MailCalc) and as a CommonJS module (for tests).
 */
(function (root) {
  'use strict';

  function num(v) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  /** Index of the highest tier the quantity reaches (quantities under the first tier use the first). */
  function tierIndex(tiers, qty) {
    var idx = 0;
    for (var i = 0; i < tiers.length; i++) if (qty >= tiers[i]) idx = i;
    return idx;
  }

  function dropDiscountPct(cfg, drops) {
    var pct = 0;
    (cfg.dropDiscounts || []).forEach(function (d) { if (drops >= d.minDrops) pct = d.pct; });
    return pct;
  }

  /** The cheapest delivery method allowed for a size, used when the chosen one is not allowed. */
  function allowedDelivery(size, method) {
    if (size.kind === 'shared') return 'shared';
    if (method === 'eddm' && !size.eddm) return 'targeted';
    return method || (size.eddm ? 'eddm' : 'targeted');
  }

  function minimumFor(cfg, size, method) {
    if (size.kind === 'shared') return cfg.minimums.shared;
    if (method === 'eddm') return cfg.minimums.eddm;
    return cfg.minimums.solo;
  }

  /**
   * Price one ad.
   * sel: { sizeId, qty, delivery, stock, finish, sides, design, turnaround, drops }
   * Returns { lines: [{label, amount}], perDrop, oneTime, discount, total, perPiece, qty, drops, notes, error }
   */
  function priceItem(cfg, sel) {
    var size = byId(cfg.sizes, sel.sizeId);
    var qty = Math.max(0, Math.round(num(sel.qty)));
    var drops = Math.min(cfg.maxDrops || 12, Math.max(1, Math.round(num(sel.drops) || 1)));
    var method = allowedDelivery(size, sel.delivery);
    var design = byId(cfg.design, sel.design);
    var turn = byId(cfg.turnaround, sel.turnaround);
    var notes = [];
    var lines = [];
    var min = minimumFor(cfg, size, method);

    if (method !== sel.delivery && sel.delivery && size.kind !== 'shared') {
      notes.push(size.dims + ' is too small for Every Door Direct Mail, so it is priced as a targeted mailing.');
    }

    var billedQty = Math.max(qty, min);
    if (qty < min) notes.push('Minimum is ' + min.toLocaleString('en-US') + (size.kind === 'shared' ? ' homes' : ' pieces') + ' per drop; priced at the minimum.');

    var printing = 0; // the part that rush and multi-drop discounts apply to
    var perPieceRate = 0;

    if (size.kind === 'shared') {
      printing = size.perThousand * billedQty / 1000;
      lines.push({ label: 'Ad space, ' + size.name + ' (' + billedQty.toLocaleString('en-US') + ' homes @ $' + size.perThousand + '/1,000, printing + postage included)', amount: printing });
    } else {
      var stock = byId(cfg.stocks, sel.stock);
      var finish = byId(cfg.finishes, sel.finish);
      var sides = byId(cfg.sides, sel.sides);
      var base = size.print[tierIndex(cfg.tiers, billedQty)];
      perPieceRate = base * stock.mult * finish.mult * sides.mult;
      printing = perPieceRate * billedQty;
      lines.push({ label: 'Printing (' + billedQty.toLocaleString('en-US') + ' @ $' + perPieceRate.toFixed(3) + ')', amount: printing });

      var d = cfg.delivery[method];
      if (method === 'eddm') {
        lines.push({ label: 'EDDM postage (@ $' + size.postage.eddm.toFixed(3) + ')', amount: size.postage.eddm * billedQty });
        lines.push({ label: 'Bundling and route prep', amount: d.prepPerPiece * billedQty });
      } else if (method === 'targeted') {
        lines.push({ label: 'Mailing list (' + billedQty.toLocaleString('en-US') + ' records)', amount: Math.max(d.listMinimum, d.listPerRecord * billedQty) });
        lines.push({ label: 'Addressing and presort', amount: d.addressingPerPiece * billedQty });
        lines.push({ label: 'Postage (@ $' + size.postage.targeted.toFixed(3) + ')', amount: size.postage.targeted * billedQty });
      } else if (method === 'own') {
        lines.push({ label: 'List cleanup (address check)', amount: d.listCleanFlat });
        lines.push({ label: 'Addressing and presort', amount: d.addressingPerPiece * billedQty });
        lines.push({ label: 'Postage (@ $' + size.postage.targeted.toFixed(3) + ')', amount: size.postage.targeted * billedQty });
      } else if (method === 'ship') {
        lines.push({ label: 'Shipping to you', amount: d.shipFlat + d.shipPerPiece * billedQty });
      }
    }

    if (turn.pct) lines.push({ label: 'Rush (' + turn.pct + '% of printing)', amount: printing * turn.pct / 100 });

    lines = lines.map(function (l) { return { label: l.label, amount: round2(l.amount) }; });
    var perDrop = round2(lines.reduce(function (s, l) { return s + l.amount; }, 0));

    var discPct = drops > 1 ? dropDiscountPct(cfg, drops) : 0;
    var discount = round2(printing * discPct / 100 * drops);
    var oneTime = round2(design.price);
    var total = round2(perDrop * drops - discount + oneTime);

    return {
      size: size,
      method: method,
      qty: billedQty,
      drops: drops,
      lines: lines,
      perDrop: perDrop,
      discountPct: discPct,
      discount: discount,
      design: design,
      oneTime: oneTime,
      total: total,
      perPiece: billedQty ? round2((total - oneTime) / (billedQty * drops) * 1000) / 1000 : 0,
      perPieceRate: perPieceRate,
      notes: notes,
    };
  }

  /** Totals for a cart of priced items: { subtotal, tax, total, deposit, dueLater } */
  function cartTotals(cfg, items) {
    var subtotal = round2(items.reduce(function (s, it) { return s + it.total; }, 0));
    var tax = round2(subtotal * num(cfg.taxPct) / 100);
    var total = round2(subtotal + tax);
    var depPct = num(cfg.checkout && cfg.checkout.depositPct);
    var deposit = depPct > 0 ? round2(total * depPct / 100) : total;
    return { subtotal: subtotal, tax: tax, total: total, deposit: deposit, dueLater: round2(total - deposit) };
  }

  /** Short readable order number like DM-251113-4F7Q. */
  function orderNumber(date, rand) {
    var d = date || new Date();
    var r = rand || Math.random;
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code = '';
    for (var i = 0; i < 4; i++) code += chars[Math.floor(r() * chars.length)];
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'DM-' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + code;
  }

  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); }

  var api = {
    priceItem: priceItem,
    cartTotals: cartTotals,
    tierIndex: tierIndex,
    dropDiscountPct: dropDiscountPct,
    allowedDelivery: allowedDelivery,
    minimumFor: minimumFor,
    orderNumber: orderNumber,
    validEmail: validEmail,
    round2: round2,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MailCalc = api;
})(typeof window !== 'undefined' ? window : this);
