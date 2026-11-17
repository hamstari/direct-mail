/*
 * AHF enrollment: validation and conversion to Wix submission values.
 * Pure functions: shared by the page and by tests/enroll.test.js.
 */
(function (root) {
  'use strict';

  var FORM = (typeof module !== 'undefined' && module.exports) ? require('./fields.js') : root.AHF_FORM;
  var MAX_FILE_BYTES = 10 * 1024 * 1024;

  function str(v) { return v == null ? '' : String(v).trim(); }
  function digits(v) { return str(v).replace(/\D/g, ''); }
  function isEmpty(f, v) {
    if (f.type === 'address') return !v || !str(v.line1) && !str(v.city) && !str(v.zip) && !str(v.state);
    if (f.type === 'checks' || f.type === 'file') return !v || !v.length;
    if (f.type === 'agree') return v !== true;
    return str(v) === '';
  }

  function phoneDigits(v) {
    var d = digits(v);
    if (d.length === 11 && d[0] === '1') d = d.slice(1);
    return d;
  }
  function money(v) { return str(v).replace(/[$,\s]/g, ''); }
  function ssnOk(d) {
    if (!/^\d{9}$/.test(d)) return false;
    var a = d.slice(0, 3), g = d.slice(3, 5), s = d.slice(5);
    return a !== '000' && a !== '666' && a[0] !== '9' && g !== '00' && s !== '0000';
  }
  function parseDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(v));
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
  }
  function ageOn(dob, today) {
    var a = today.getUTCFullYear() - dob.getUTCFullYear();
    var md = (today.getUTCMonth() - dob.getUTCMonth()) || (today.getUTCDate() - dob.getUTCDate());
    return md < 0 ? a - 1 : a;
  }
  function stateNames() {
    var m = {};
    FORM.states.forEach(function (s) { m[s[0]] = s[1]; });
    return m;
  }

  /**
   * Returns an error message for one field, or '' when it is fine.
   * Hidden fields are never validated.
   */
  function validate(f, v, values, opts) {
    opts = opts || {};
    var today = opts.today || new Date();
    if (!FORM.isShown(f, values)) return '';
    if (isEmpty(f, v)) {
      if (!f.req) return '';
      if (f.type === 'agree') return 'Please check the box to agree.';
      if (f.type === 'signature') return 'Please sign here.';
      if (f.type === 'file') return 'Please add at least one document, or uncheck the documents above.';
      if (f.type === 'select' || f.type === 'segment') return 'Please choose an option.';
      if (f.type === 'address') return 'Please enter the street address, city, state and ZIP.';
      return 'This field is required.';
    }
    switch (f.type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str(v)) ? '' : 'Enter a valid email, like name@company.com.';
      case 'tel':
        return /^[2-9]\d{9}$/.test(phoneDigits(v)) ? '' : 'Enter a 10-digit US phone number.';
      case 'url':
        return /^(https?:\/\/)?[^\s.\/]+(\.[^\s.\/]+)+(\/\S*)?$/i.test(str(v)) ? '' : 'Enter a web address, like www.example.com.';
      case 'year': {
        var y = +str(v), max = Math.min(today.getFullYear(), 2026);
        return /^\d{4}$/.test(str(v)) && y >= 1900 && y <= max ? '' : 'Enter a year between 1900 and ' + max + '.';
      }
      case 'int':
        return /^\d+$/.test(str(v).replace(/,/g, '')) && +str(v).replace(/,/g, '') >= (f.min || 0) ? '' : 'Enter a whole number' + (f.min ? ' of at least ' + f.min : '') + '.';
      case 'money':
        return /^\d+(\.\d{1,2})?$/.test(money(v)) ? '' : 'Enter a dollar amount, like 12,500.';
      case 'percent': {
        var p = +str(v).replace('%', '');
        if (!/^\d+(\.\d+)?$/.test(str(v).replace('%', '')) || p < 1 || p > 100) return 'Enter a percentage from 1 to 100.';
        var total = FORM.owners.slice(0, parseInt(values.how_many_owners_are_there, 10) || 0)
          .reduce(function (sum, o) { return sum + (+str(values[o.pct]).replace('%', '') || 0); }, 0);
        return total > 100 ? 'Ownership adds up to ' + total + '%. It can’t be more than 100%.' : '';
      }
      case 'dob': {
        var d = parseDate(v);
        if (!d) return 'Enter a valid date.';
        var age = ageOn(d, today);
        if (age < 18) return 'Owners must be at least 18.';
        if (age > 120) return 'Check the year.';
        return '';
      }
      case 'ssn':
        return ssnOk(digits(v)) ? '' : 'Enter a valid 9-digit Social Security number.';
      case 'address': {
        if (!str(v.line1) || !str(v.city) || !str(v.state) || !str(v.zip)) return 'Please enter the street address, city, state and ZIP.';
        if (!stateNames()[v.state]) return 'Choose a state.';
        return /^\d{5}(-?\d{4})?$/.test(str(v.zip)) ? '' : 'Enter a 5-digit ZIP code.';
      }
      case 'select':
      case 'segment':
        return f.opts.indexOf(v) >= 0 ? '' : 'Please choose an option.';
      case 'checks':
        return v.every(function (x) { return f.opts.indexOf(x) >= 0; }) ? '' : 'Please choose from the list.';
      case 'file':
        if (v.length > (f.max || 5)) return 'Up to ' + (f.max || 5) + ' files.';
        for (var i = 0; i < v.length; i++) {
          if (v[i].size > MAX_FILE_BYTES) return v[i].name + ' is larger than 10 MB.';
        }
        return '';
      case 'signature':
        return /^data:image\/png;base64,/.test(str(v)) ? '' : 'Please sign here.';
      case 'agree':
        return '';
      default:
        return str(v).length > 2000 ? 'Please keep this under 2,000 characters.' : '';
    }
  }

  function validateStep(stepIndex, values, opts) {
    var errors = {};
    FORM.allFields().forEach(function (f) {
      if (f.step !== stepIndex) return;
      var e = validate(f, values[f.t], values, opts);
      if (e) errors[f.t] = e;
    });
    return errors;
  }

  function validateAll(values, opts) {
    var errors = {};
    FORM.steps.forEach(function (s, i) { Object.assign(errors, validateStep(i, values, opts)); });
    return errors;
  }

  function normalizeUrl(v) {
    v = str(v);
    return /^https?:\/\//i.test(v) ? v : 'https://' + v;
  }

  function wixAddress(a) {
    var line1 = str(a.line1), out = {
      country: 'US',
      subdivision: 'US-' + a.state,
      city: str(a.city),
      postalCode: str(a.zip),
      addressLine: line1
    };
    var m = /^(\d+[A-Za-z]?(?:-\d+)?)\s+(.+)$/.exec(line1);
    if (m) out.streetAddress = { number: m[1], name: m[2] };
    if (str(a.line2)) out.addressLine2 = str(a.line2);
    return out;
  }

  function addressText(a) {
    if (!a) return '';
    var city = [str(a.city), [str(a.state), str(a.zip)].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return [str(a.line1), str(a.line2), city].filter(Boolean).join(', ');
  }

  /** Converts one shown, non-empty field to its Wix submission value. */
  function wixValue(f, v) {
    switch (f.type) {
      case 'tel': return '+1' + phoneDigits(v);
      case 'url': return normalizeUrl(v);
      case 'year': case 'int': return parseInt(str(v).replace(/,/g, ''), 10);
      case 'money': return parseFloat(money(v));
      case 'percent': return parseFloat(str(v).replace('%', ''));
      case 'ssn': { var d = digits(v); return d.slice(0, 3) + '-' + d.slice(3, 5) + '-' + d.slice(5); }
      case 'address': return wixAddress(v);
      case 'checks': return v.slice();
      case 'agree': return true;
      default: return str(v);
    }
  }

  /**
   * Builds the submission for the Wix form.
   * Returns { formId, submissions, uploads } where uploads lists the file
   * and signature fields that still have to be uploaded to Wix Media;
   * their file objects are added to `submissions` once uploaded.
   * Hidden and empty fields are left out, as the Wix form expects.
   */
  function buildWixSubmission(values) {
    var submissions = {}, uploads = [];
    FORM.allFields().forEach(function (f) {
      var v = values[f.t];
      if (!FORM.isShown(f, values) || isEmpty(f, v)) return;
      if (f.type === 'file') uploads.push({ target: f.t, kind: 'document', items: v });
      else if (f.type === 'signature') uploads.push({ target: f.t, kind: 'image', items: [v] });
      else submissions[f.t] = wixValue(f, v);
    });
    return { formId: FORM.formId, submissions: submissions, uploads: uploads };
  }

  /** Human-readable text for a value (review screen and webhook mode). */
  function displayValue(f, v) {
    if (isEmpty(f, v)) return '';
    switch (f.type) {
      case 'tel': { var d = phoneDigits(v); return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6); }
      case 'ssn': return '•••-••-' + digits(v).slice(-4);
      case 'address': return addressText(v);
      case 'checks': return v.join('; ');
      case 'file': return v.map(function (x) { return x.name; }).join(', ');
      case 'signature': return 'Signed';
      case 'agree': return 'Yes';
      case 'money': return '$' + Number(money(v)).toLocaleString('en-US');
      case 'percent': return str(v).replace('%', '') + '%';
      case 'url': return normalizeUrl(v);
      default: return str(v);
    }
  }

  /**
   * Flat fields for a Zapier/Make webhook (alternative to Wix):
   * one key per Wix field, values as plain text, plus `_labels`.
   * SSNs are sent in full here: only use this with a webhook you trust.
   */
  function buildFlatSubmission(values) {
    var out = {}, labels = {};
    FORM.allFields().forEach(function (f) {
      var v = values[f.t];
      if (!FORM.isShown(f, values) || isEmpty(f, v) || f.type === 'file' || f.type === 'signature') return;
      var w = wixValue(f, v);
      out[f.t] = f.type === 'address' ? addressText(v) : Array.isArray(w) ? w.join('; ') : String(w);
      labels[f.t] = f.ownerLabel || f.label;
    });
    out._labels = labels;
    return out;
  }

  var api = {
    validate: validate,
    validateStep: validateStep,
    validateAll: validateAll,
    buildWixSubmission: buildWixSubmission,
    buildFlatSubmission: buildFlatSubmission,
    displayValue: displayValue,
    isEmpty: isEmpty,
    MAX_FILE_BYTES: MAX_FILE_BYTES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AHF_PAYLOAD = api;
})(this);
