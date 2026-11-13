const test = require('node:test');
const assert = require('node:assert/strict');
const cfg = require('../js/config.js');
const C = require('../js/calc.js');

const close = (a, b, eps = 0.006) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = { productId: 'fullpage', sizeId: 'fp-8375x10875', homes: 10000, mailings: 1, rush: false, promo: '' };
const amt = (r, kind, re) => r.lines.find((l) => l.kind === kind && (!re || re.test(l.label)));

test('matches the live quote: full page, 10,000 homes', () => {
  const r = C.priceOrder(cfg, base);
  assert.equal(amt(r, 'item').amount, 1870);
  assert.equal(amt(r, 'fee', /Setup/).amount, 49);
  assert.equal(r.tax, 134.33);
  assert.equal(r.total, 2053.33);
  assert.equal(r.pieces, 10000);
  close(r.perHome * 100, 20.53, 0.01);
  assert.equal(r.lines.filter((l) => l.kind === 'included').length, 2);
});

test('price per home drops at each break', () => {
  assert.equal(C.breakIndex(cfg.breaks, 2500), 0);
  assert.equal(C.breakIndex(cfg.breaks, 4999), 0);
  assert.equal(C.breakIndex(cfg.breaks, 15000), 2);
  assert.equal(C.breakIndex(cfg.breaks, 100000), 5);
  assert.equal(C.priceOrder(cfg, { ...base, homes: 15000 }).rate, 0.187);
  assert.equal(C.priceOrder(cfg, { ...base, homes: 25000 }).rate, 0.169);
});

test('below the minimum is priced at the minimum', () => {
  const r = C.priceOrder(cfg, { ...base, homes: 1000 });
  assert.equal(r.homes, 2500);
  assert.ok(r.notes[0].includes('Minimum'));
});

test('multiple mailings discount the ad price', () => {
  const r = C.priceOrder(cfg, { ...base, mailings: 6 });
  assert.equal(amt(r, 'item').amount, 1870 * 6);
  assert.equal(amt(r, 'discount').amount, -1122);
  close(r.subtotal, 11220 - 1122 + 49);
  assert.equal(r.pieces, 60000);
});

test('rush is a percent of the discounted ad price', () => {
  const r = C.priceOrder(cfg, { ...base, mailings: 3, rush: true });
  const adNet = 1870 * 3 * 0.95;
  close(amt(r, 'fee', /Rush/).amount, adNet * 0.15);
});

test('promo codes: percent, dollars, invalid', () => {
  const p = C.priceOrder(cfg, { ...base, promo: 'welcome10' });
  close(p.subtotal, 1870 * 0.9 + 49);
  const s = C.priceOrder(cfg, { ...base, promo: 'SETUPFREE' });
  close(s.subtotal, 1870);
  const bad = C.priceOrder(cfg, { ...base, promo: 'NOPE' });
  assert.equal(bad.promoError, 'That code is not valid.');
  assert.equal(bad.total, 2053.33);
});

test('order numbers and email check', () => {
  assert.match(C.orderNumber(new Date(2026, 10, 13), () => 0), /^BD-261113-AAAA$/);
  assert.ok(C.validEmail('a@b.co'));
  assert.ok(!C.validEmail('nope@'));
});

test('distribution ZIP list parses commas, tabs, header and duplicates', () => {
  const thousands = C.parseZips('33004, Dania Beach, Broward, 6,200');
  assert.equal(thousands[0].homes, 6200);
  const list = C.parseZips('zip,city,county,homes\n33004, Dania Beach, Broward, 6,200\n\n33401\tWest Palm\tPalm Beach\t7600\nbad line\n33004,Dania,Broward,6300');
  assert.equal(list.length, 2);
  assert.deepEqual(list.map((z) => z.zip), ['33004', '33401']);
  assert.equal(list[0].homes, 6300);
  assert.equal(C.homesForZips(list, ['33004', '33401', '99999']), 13900);
});

test('sample distribution list loads', () => {
  const list = C.parseZips(require('../js/zips.js'));
  assert.ok(list.length > 5);
  assert.ok(list.every((z) => z.homes > 0 && z.county));
});
