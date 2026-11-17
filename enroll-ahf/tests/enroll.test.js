'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const FORM = require('../src/fields.js');
const P = require('../src/payload.js');
const snapshot = require('../wix/form-snapshot.json');

const wix = {};
snapshot.fields.forEach((f) => { wix[f.target] = f; });
const ours = FORM.allFields();
const TODAY = new Date('2026-11-17T12:00:00Z');

function filled(owners) {
  const v = {
    company_name_a1d8: 'Sunshine Windows LLC',
    business_structure: 'Limited Liability Corporation',
    year_business_started: '2011',
    number_of_locations: '2',
    business_address: { line1: '1200 Main St', line2: 'Suite 4', city: 'Tampa', state: 'FL', zip: '33602' },
    main_company_phone_number: '(813) 555-0142',
    company_website: 'sunshinewindows.com',
    business_email: 'office@sunshinewindows.com',
    e_mail_to_receive_credit_decisions: 'credit@sunshinewindows.com',
    job_title: 'Owner',
    how_many_owners_are_there: String(owners),
    what_products_or_services_do_you_sell: 'Windows & Doors',
    list_the_manufacturer_of_these_products: 'PGT, Andersen',
    does_your_company_install_the_products_they_sell_if_they_require: 'Yes',
    do_you_subcontract: 'No',
    contractor_license_registration_number: 'CGC1500000',
    which_state_do_you_primarily_do_business_in: 'Florida',
    average_annual_residential_sales: '40',
    average_sale_price: '12,500'
  };
  FORM.owners.slice(0, owners).forEach((o, i) => {
    v[o.name] = 'Owner ' + (i + 1);
    v[o.email] = `owner${i + 1}@example.com`;
    v[o.phone] = '813-555-01' + (10 + i);
    v[o.pct] = String(Math.floor(100 / owners));
    v[o.dob] = '1980-05-0' + (i + 1);
    v[o.ssn] = '123-45-678' + i;
    v[o.address] = { line1: (100 + i) + ' Oak Ave', city: 'Tampa', state: 'FL', zip: '33606' };
    v[o.agree] = true;
    v[o.signature] = 'data:image/png;base64,' + 'iVBORw0KGgo'.repeat(800);
  });
  return v;
}

test('every field key exists in the live Wix form', () => {
  ours.forEach((f) => assert.ok(wix[f.t], `${f.t} is not a field of the Wix form`));
});

test('every Wix field a visitor can fill is in the redesign', () => {
  const ourKeys = new Set(ours.map((f) => f.t));
  const shownByRule = new Set(snapshot.rules.flatMap((r) => r.shows));
  snapshot.fields
    .filter((f) => !f.hiddenByDefault || shownByRule.has(f.target))
    .forEach((f) => assert.ok(ourKeys.has(f.target), `Wix field ${f.target} (${f.label}) is missing`));
});

test('dropdown and radio options match the Wix form exactly', () => {
  ours.filter((f) => f.opts).forEach((f) => {
    assert.deepEqual([...f.opts].sort(), [...wix[f.t].options].sort(), f.t);
  });
});

test('fields Wix always requires are required here', () => {
  ours.forEach((f) => {
    if (wix[f.t].required && !wix[f.t].hiddenByDefault) assert.ok(f.req, `${f.t} should be required`);
  });
});

test('owner fields appear exactly as the Wix rules show them', () => {
  for (let n = 1; n <= 4; n++) {
    const rule = snapshot.rules.find((r) => r.when[0].field === 'how_many_owners_are_there' && r.when[0].value === String(n));
    const v = { how_many_owners_are_there: String(n) };
    const shown = ours.filter((f) => f.ownerLabel && FORM.isShown(f, v)).map((f) => f.t).sort();
    assert.deepEqual(shown, rule.shows.filter((t) => t !== 'how_many_owners_are_there').sort(), `${n} owners`);
  }
});

test('owner keys are matched to the right owner by Wix label', () => {
  FORM.owners.forEach((o, i) => {
    ['name', 'email', 'phone', 'pct', 'dob', 'ssn', 'signature'].forEach((k) => {
      assert.match(wix[o[k]].label || '', new RegExp('^Owner ' + (i + 1) + '\\b'), `${o[k]} label ${wix[o[k]].label}`);
    });
  });
});

test('conditional fields follow the Wix rules', () => {
  const pct = ours.find((f) => f.t === 'list_what_percentage_your_business_subcontracts');
  assert.equal(FORM.isShown(pct, { do_you_subcontract: 'No' }), false);
  assert.equal(FORM.isShown(pct, { do_you_subcontract: 'Yes' }), true);
  const fin = ours.find((f) => f.t === 'amount_of_sales_financed_in_months');
  assert.equal(FORM.isShown(fin, {}), false);
  assert.equal(FORM.isShown(fin, { do_you_currently_have_any_financing_programs: 'Yes' }), true);
  const up = ours.find((f) => f.t === 'file_upload');
  assert.equal(FORM.isShown(up, { which_documents_are_you_ready_to_upload: [] }), false);
  assert.equal(FORM.isShown(up, { which_documents_are_you_ready_to_upload: ['Voided Business Check (required)'] }), true);
});

test('the Wix backend accepts exactly the redesigned field keys', () => {
  const src = fs.readFileSync(path.join(__dirname, '../wix/enrollment.web.js'), 'utf8');
  const block = /const ALLOWED = new Set\(\[([\s\S]*?)\]\);/.exec(src)[1];
  const allowed = block.match(/'([^']+)'/g).map((s) => s.slice(1, -1)).sort();
  assert.deepEqual(allowed, ours.map((f) => f.t).sort());
  assert.match(src, new RegExp(FORM.formId));
});

test('a complete application has no errors', () => {
  for (let n = 1; n <= 4; n++) assert.deepEqual(P.validateAll(filled(n), { today: TODAY }), {}, `${n} owners`);
});

test('missing and malformed answers are caught', () => {
  const v = filled(2);
  delete v.company_name_a1d8;
  v.business_email = 'office@';
  v.main_company_phone_number = '555-1234';
  v[FORM.owners[0].ssn] = '000-12-3456';
  v[FORM.owners[1].dob] = '2015-01-01';
  v[FORM.owners[0].pct] = '80';
  v[FORM.owners[1].pct] = '40';
  v[FORM.owners[1].agree] = undefined;
  v.business_address = { line1: '1 Main', city: 'Tampa', state: 'FL', zip: '336' };
  const e = P.validateAll(v, { today: TODAY });
  ['company_name_a1d8', 'business_email', 'main_company_phone_number', FORM.owners[0].ssn, FORM.owners[1].dob,
    FORM.owners[0].pct, FORM.owners[1].agree, 'business_address'].forEach((k) => assert.ok(e[k], k));
});

test('fields for owners that are not shown are ignored', () => {
  const v = filled(1);
  v[FORM.owners[1].name] = 'Leftover';
  assert.deepEqual(P.validateAll(v, { today: TODAY }), {});
  assert.equal(P.buildWixSubmission(v).submissions[FORM.owners[1].name], undefined);
});

test('values are converted to the types the Wix form stores', () => {
  const v = filled(1);
  v.do_you_subcontract = 'Yes';
  v.list_what_percentage_your_business_subcontracts = '30%';
  v.which_documents_are_you_ready_to_upload = ['Voided Business Check (required)'];
  v.file_upload = [{ name: 'check.pdf', size: 1000 }];
  const { formId, submissions: s, uploads } = P.buildWixSubmission(v);
  assert.equal(formId, '5872b652-a4ff-401f-b02b-7f4f0799fc62');
  assert.equal(s.year_business_started, 2011);
  assert.equal(s.number_of_locations, 2);
  assert.equal(s.average_sale_price, 12500);
  assert.equal(s.main_company_phone_number, '+18135550142');
  assert.equal(s.company_website, 'https://sunshinewindows.com');
  assert.equal(s.social_security_number, '123-45-6780');
  assert.equal(s.percentage_of_business_owned_1, 100);
  assert.equal(s.form_field_0510, true);
  assert.deepEqual(s.which_documents_are_you_ready_to_upload, ['Voided Business Check (required)']);
  assert.deepEqual(s.business_address, {
    country: 'US', subdivision: 'US-FL', city: 'Tampa', postalCode: '33602',
    addressLine: '1200 Main St', addressLine2: 'Suite 4', streetAddress: { number: '1200', name: 'Main St' }
  });
  assert.equal(s.list_what_percentage_your_business_subcontracts, '30%');
  assert.equal(s.dba, undefined, 'empty optional fields are left out');
  assert.deepEqual(uploads.map((u) => u.target).sort(), ['file_upload', 'signature_37ce']);
  assert.equal(s.signature_37ce, undefined, 'files are added after upload');
});

test('webhook payload is flat text with labels', () => {
  const flat = P.buildFlatSubmission(filled(1));
  assert.equal(flat.business_address, '1200 Main St, Suite 4, Tampa, FL 33602');
  assert.equal(flat.first_and_last_name_1, 'Owner 1');
  assert.equal(flat._labels.first_and_last_name_1, 'Owner 1: First and last name');
  Object.keys(flat).forEach((k) => { if (k !== '_labels') assert.equal(typeof flat[k], 'string', k); });
});

test('review screen masks SSNs', () => {
  const f = ours.find((x) => x.t === 'social_security_number');
  assert.equal(P.displayValue(f, '123-45-6789'), '•••-••-6789');
});
