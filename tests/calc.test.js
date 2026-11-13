const test = require('node:test');
const assert = require('node:assert/strict');
const site = require('../js/config.js');
const D = require('../js/data.js');
const C = require('../js/calc.js');
const cfg = C.buildData(site, D, D);

const close = (a, b, eps = 0.006) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const fullPage = cfg.products.find((p) => p.name === 'Full Page Pop Out Insert');
const base = { productId: fullPage.id, sizeId: fullPage.sizes[0].id, homes: 10000, mailings: 1, rush: false, promo: '' };
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

test('built-in sheet loads with no problems', () => {
  assert.deepEqual(cfg.problems, []);
  assert.deepEqual(cfg.breaks, [2500, 5000, 10000, 25000, 50000, 100000]);
  assert.equal(cfg.products.length, 4);
  assert.equal(cfg.defaultProductId, fullPage.id);
  assert.equal(fullPage.sizes[0].dims, '8.375" × 10.875"');
  assert.ok(cfg.zips.length > 5 && cfg.zips.every((z) => z.homes > 0 && z.county));
});

test('Google Sheets CSV export (all cells quoted, formatted numbers) reads the same', () => {
  const gviz = {
    prices: '"Option","Size","Paper","2,500","10,000"\n"Full Page","8 x 10","70# gloss, 2-sided","$0.229","$0.187"\n"Bad Row","5 x 7","","0.2",""',
    zips: '"ZIP","City","County","Homes"\n"33004","Dania Beach","Broward","6,200"\n"3300","Typo","Broward","10"',
    settings: '"Setting","Value"\n"Setup & prepress fee","$59"\n"Sales tax %","6.5"\n"Rush production %","20"\n"Minimum homes","5,000"\n"4 mailings discount %","8"',
    promos: '"Code","Discount","Description"\n"spring 25","$25","Spring deal"\n"HALF","50%",""',
  };
  const c = C.buildData(site, gviz, D);
  assert.deepEqual(c.breaks, [2500, 10000]);
  assert.equal(c.products.length, 1);
  assert.equal(c.products[0].sizes[0].spec, '70# gloss, 2-sided');
  assert.deepEqual(c.products[0].sizes[0].rates, [0.229, 0.187]);
  assert.equal(c.setupFee, 59); assert.equal(c.taxPct, 6.5); assert.equal(c.rushPct, 20); assert.equal(c.minHomes, 5000);
  assert.deepEqual(c.mailings, [{ count: 1, pct: 0 }, { count: 4, pct: 8 }]);
  assert.deepEqual(c.promoCodes.SPRING25, { amount: 25, label: 'Spring deal' });
  assert.equal(c.promoCodes.HALF.pct, 50);
  assert.deepEqual(c.zips.map((z) => z.homes), [6200]);
  assert.ok(c.problems.some((p) => /Bad Row/.test(p)));
  assert.ok(c.problems.some((p) => /"3300"/.test(p)));
});

test('a missing tab falls back to the built-in one and says so', () => {
  const c = C.buildData(site, { prices: D.prices, settings: D.settings, promos: D.promos }, D);
  assert.equal(c.zips.length, cfg.zips.length);
  assert.ok(c.problems.some((p) => /Zips tab not loaded; using the built-in zips/.test(p)));
});

test('price that goes up at a bigger quantity is flagged', () => {
  const c = C.buildData(site, { ...D, prices: 'Option,Size,Paper,2500,5000\nX,4 x 6,,0.20,0.25' }, D);
  assert.ok(c.problems.some((p) => /goes up at 5,000/.test(p)));
});

test('webhook fields are flat and complete', () => {
  const r = C.priceOrder(cfg, { ...base, mailings: 3, rush: true });
  const order = {
    number: 'BD-1', placedAt: 'now', files: ['logo.png'],
    customer: { name: 'Pat', company: 'Roofs Inc', email: 'p@r.co', phone: '555', payment: 'invoice', address: '1 St', city: 'X', state: 'FL', zip: '33000' },
    mailer: { option: 'Full Page Pop Out Insert', size: '8.375" × 10.875"', homes: 10000, mailings: 3, rush: true, counties: ['Broward'],
      zips: [{ zip: '33004', city: 'Dania Beach', county: 'Broward', homes: 6200 }, { zip: '33009', city: 'Hallandale Beach', county: 'Broward', homes: 3800 }] },
    lines: r.lines.map((l) => ({ label: l.label, amount: l.amount, included: l.kind === 'included' })),
    subtotal: r.subtotal, tax: r.tax, total: r.total,
  };
  const f = C.flattenOrder(order);
  assert.equal(f.zip_codes, '33004, 33009');
  assert.equal(f.total_pieces, '30000');
  assert.equal(f.total, r.total.toFixed(2));
  assert.equal(f.setup_fee, '49.00');
  assert.equal(f.rush, 'Yes');
  assert.ok(Object.values(f).every((v) => v === undefined || typeof v === 'string'));
});
