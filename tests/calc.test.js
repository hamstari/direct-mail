const test = require('node:test');
const assert = require('node:assert/strict');
const cfg = require('../js/config.js');
const C = require('../js/calc.js');

const close = (a, b, eps = 0.006) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = { sizeId: 'pc-625x11', qty: 5000, delivery: 'eddm', stock: '14pt', finish: 'uv', sides: '2', design: 'none', turnaround: 'std', drops: 1 };

test('tier index picks the highest break reached', () => {
  assert.equal(C.tierIndex(cfg.tiers, 100), 0);
  assert.equal(C.tierIndex(cfg.tiers, 1000), 2);
  assert.equal(C.tierIndex(cfg.tiers, 2499), 2);
  assert.equal(C.tierIndex(cfg.tiers, 99999), cfg.tiers.length - 1);
});

test('EDDM jumbo postcard: printing + postage + prep', () => {
  const r = C.priceItem(cfg, base);
  // 5000 tier: 0.135 print, 0.25 postage, 0.02 prep
  close(r.total, 5000 * (0.135 + 0.25 + 0.02));
  assert.equal(r.method, 'eddm');
  assert.equal(r.notes.length, 0);
});

test('small postcard cannot use EDDM and falls back to targeted', () => {
  const r = C.priceItem(cfg, { ...base, sizeId: 'pc-4x6', qty: 1000 });
  assert.equal(r.method, 'targeted');
  assert.ok(r.notes[0].includes('too small'));
  // print 0.16 + list max(75, 50) + addressing 0.035 + postage 0.39
  close(r.total, 160 + 75 + 35 + 390);
});

test('paper, finish and sides multiply the print price only', () => {
  const plain = C.priceItem(cfg, { ...base, delivery: 'ship' });
  const fancy = C.priceItem(cfg, { ...base, delivery: 'ship', stock: '16pt', finish: 'soft', sides: '1' });
  close(fancy.lines[0].amount, plain.lines[0].amount * 1.12 * 1.18 * 0.85);
  close(fancy.lines[1].amount, plain.lines[1].amount);
});

test('quantities under the minimum are priced at the minimum', () => {
  const r = C.priceItem(cfg, { ...base, sizeId: 'sh-4', qty: 1000 });
  assert.equal(r.qty, cfg.minimums.shared);
  close(r.total, 80 * 5);
  assert.ok(r.notes.some((n) => n.includes('Minimum')));
});

test('shared mailer ad is priced per thousand homes', () => {
  const r = C.priceItem(cfg, { ...base, sizeId: 'sh-2', qty: 20000 });
  close(r.total, 145 * 20);
  close(r.perPiece, 0.145);
});

test('rush adds a percent of printing; design is charged once', () => {
  const r = C.priceItem(cfg, { ...base, turnaround: 'rush', design: 'custom', drops: 2 });
  const perDrop = 5000 * (0.135 * 1.25 + 0.25 + 0.02);
  close(r.perDrop, perDrop);
  close(r.total, perDrop * 2 + 249);
});

test('repeat-mailing discount applies to printing on every drop', () => {
  const r = C.priceItem(cfg, { ...base, drops: 6 });
  assert.equal(r.discountPct, 10);
  close(r.discount, 5000 * 0.135 * 0.10 * 6);
  close(r.total, 5000 * 0.405 * 6 - r.discount);
});

test('cart totals with tax and deposit', () => {
  const c2 = { ...cfg, taxPct: 8, checkout: { ...cfg.checkout, depositPct: 50 } };
  const t = C.cartTotals(c2, [{ total: 1000 }, { total: 500 }]);
  close(t.subtotal, 1500); close(t.tax, 120); close(t.total, 1620); close(t.deposit, 810); close(t.dueLater, 810);
});

test('order numbers and email check', () => {
  assert.match(C.orderNumber(new Date(2026, 10, 13), () => 0), /^DM-261113-AAAA$/);
  assert.ok(C.validEmail('a@b.co'));
  assert.ok(!C.validEmail('nope@'));
});
