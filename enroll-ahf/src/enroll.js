/* AHF contractor enrollment: page behavior. */
(function () {
  'use strict';

  var FORM = window.AHF_FORM, P = window.AHF_PAYLOAD, CFG = window.AHF_CONFIG || {};
  var form = document.getElementById('enroll');
  var values = {};
  var errors = {};
  var touched = {};
  var current = 0;
  var furthest = 0;
  var passed = {};
  var submitting = false;
  var submitted = false;
  var embedded = window.parent !== window;
  var mode = CFG.mode || 'demo';
  var fields = FORM.allFields();
  var byTarget = {};
  fields.forEach(function (f) { byTarget[f.t] = f; });

  // ---------- small DOM helpers ----------
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function id(t, suffix) { return 'f-' + t + (suffix != null && suffix !== '' ? '-' + suffix : ''); }
  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

  // ---------- input formatting ----------
  function formatPhone(v) {
    var d = String(v).replace(/\D/g, '');
    if (d.length === 11 && d[0] === '1') d = d.slice(1);
    d = d.slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  }
  function formatSsn(v) {
    var d = String(v).replace(/\D/g, '').slice(0, 9);
    if (d.length < 4) return d;
    if (d.length < 6) return d.slice(0, 3) + '-' + d.slice(3);
    return d.slice(0, 3) + '-' + d.slice(3, 5) + '-' + d.slice(5);
  }
  function formatMoney(v) {
    var s = String(v).replace(/[^\d.]/g, '');
    if (!s) return '';
    var parts = s.split('.');
    var whole = parts[0].replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? whole + '.' + parts[1].slice(0, 2) : whole;
  }

  // ---------- field renderers ----------
  function labelFor(f, forId, tag) {
    return el(tag || 'label', { class: 'lbl', for: tag ? null : forId, id: id(f.t, 'lbl') },
      [f.label, f.req ? null : el('span', { class: 'opt', text: ' (optional)' })]);
  }

  function describedBy(f) { return id(f.t, 'help') + ' ' + id(f.t, 'err'); }

  function textInput(f) {
    var types = { email: 'email', tel: 'tel', url: 'url', dob: 'date' };
    var modes = { tel: 'tel', year: 'numeric', int: 'numeric', money: 'decimal', percent: 'decimal', ssn: 'numeric' };
    var auto = { email: 'email', tel: 'tel', url: 'url' };
    var input = el('input', {
      class: 'input', id: id(f.t), name: f.t,
      type: f.type === 'ssn' ? 'password' : (types[f.type] || 'text'),
      inputmode: modes[f.type], placeholder: f.placeholder || (f.type === 'tel' ? '(555) 555-5555' : f.type === 'ssn' ? '123-45-6789' : null),
      autocomplete: f.type === 'ssn' ? 'off' : (f.autocomplete || auto[f.type] || null),
      maxlength: f.type === 'year' ? 4 : f.type === 'ssn' ? 11 : f.type === 'tel' ? 14 : f.type === 'percent' ? 5 : null,
      max: f.type === 'dob' ? new Date().toISOString().slice(0, 10) : null,
      'aria-describedby': describedBy(f),
      'aria-required': f.req ? 'true' : null,
      spellcheck: f.type === 'text' ? null : 'false'
    });
    input.addEventListener('input', function () {
      var v = input.value;
      if (f.type === 'tel') { v = formatPhone(v); input.value = v; }
      if (f.type === 'ssn') { v = formatSsn(v); input.value = v; }
      if (f.type === 'year' || f.type === 'int') { v = v.replace(/[^\d]/g, ''); input.value = v; }
      if (f.type === 'percent') { v = v.replace(/[^\d.]/g, ''); input.value = v; }
      setValue(f.t, v);
    });
    input.addEventListener('blur', function () {
      if (f.type === 'money' && input.value) { input.value = formatMoney(input.value); setValue(f.t, input.value); }
      touch(f.t);
    });

    if (f.type === 'money' || f.type === 'percent') {
      return el('div', { class: 'affix ' + (f.type === 'money' ? 'has-pre' : 'has-post') }, [
        f.type === 'money' ? el('span', { class: 'pre', text: '$' }) : null,
        input,
        f.type === 'percent' ? el('span', { class: 'post', text: '%' }) : null
      ]);
    }
    if (f.type === 'ssn') {
      var btn = el('button', { type: 'button', class: 'reveal', 'aria-controls': id(f.t), text: 'Show' });
      btn.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.textContent = show ? 'Hide' : 'Show';
        btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      });
      return el('div', { class: 'affix ssn' }, [input, btn]);
    }
    return input;
  }

  function selectInput(f) {
    var s = el('select', { class: 'input', id: id(f.t), name: f.t, 'aria-describedby': describedBy(f), 'aria-required': f.req ? 'true' : null },
      [el('option', { value: '', text: 'Select…' })].concat(f.opts.map(function (o) { return el('option', { value: o, text: o }); })));
    s.addEventListener('change', function () { setValue(f.t, s.value); touch(f.t); });
    return s;
  }

  function segmentInput(f) {
    var box = el('div', { class: 'seg', role: 'radiogroup', 'aria-labelledby': id(f.t, 'lbl'), 'aria-describedby': describedBy(f) });
    f.opts.forEach(function (o, i) {
      var r = el('input', { type: 'radio', name: f.t, value: o, id: id(f.t, i) });
      r.addEventListener('change', function () { setValue(f.t, o); touch(f.t); });
      box.appendChild(el('label', { for: id(f.t, i) }, [r, o]));
    });
    return box;
  }

  function checksInput(f) {
    var box = el('div', { class: 'checks', role: 'group', 'aria-labelledby': id(f.t, 'lbl') });
    f.opts.forEach(function (o, i) {
      var c = el('input', { type: 'checkbox', name: f.t, value: o, id: id(f.t, i) });
      c.addEventListener('change', function () {
        var list = (values[f.t] || []).filter(function (x) { return x !== o; });
        if (c.checked) list.push(o);
        list.sort(function (a, b) { return f.opts.indexOf(a) - f.opts.indexOf(b); });
        setValue(f.t, list);
      });
      box.appendChild(el('label', { class: 'check', for: id(f.t, i) }, [c, el('span', { text: o })]));
    });
    return box;
  }

  function textareaInput(f) {
    var t = el('textarea', { class: 'input', id: id(f.t), name: f.t, rows: 3, maxlength: 2000, 'aria-describedby': describedBy(f), 'aria-required': f.req ? 'true' : null });
    t.addEventListener('input', function () { setValue(f.t, t.value); });
    t.addEventListener('blur', function () { touch(f.t); });
    return t;
  }

  function addressInput(f) {
    var val = values[f.t] = values[f.t] || { line1: '', line2: '', city: '', state: '', zip: '' };
    var home = !!f.ownerLabel;
    function part(key, label, cls, attrs, node) {
      var input = node || el('input', Object.assign({ class: 'input', id: id(f.t, key), name: f.t + '.' + key }, attrs));
      var ev = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(ev, function () {
        if (key === 'zip') input.value = input.value.replace(/[^\d-]/g, '').slice(0, 10);
        val[key] = input.value; setValue(f.t, val);
      });
      input.addEventListener('blur', function () { touch(f.t); });
      return el('div', { class: cls }, [el('label', { class: 'sub', for: id(f.t, key), text: label }), input]);
    }
    var ac = home ? 'off' : 'section-biz ';
    var stateSel = el('select', { class: 'input', id: id(f.t, 'state'), name: f.t + '.state', autocomplete: home ? 'off' : 'section-biz address-level1' },
      [el('option', { value: '', text: 'State' })].concat(FORM.states.map(function (s) { return el('option', { value: s[0], text: s[1] }); })));
    return el('div', { class: 'addr', role: 'group', 'aria-labelledby': id(f.t, 'lbl'), 'aria-describedby': describedBy(f) }, [
      part('line1', 'Street address', 'a-line1', { autocomplete: home ? 'off' : ac + 'address-line1', maxlength: 150 }),
      part('line2', 'Suite / unit (optional)', 'a-line2', { autocomplete: home ? 'off' : ac + 'address-line2', maxlength: 50 }),
      part('city', 'City', 'a-city', { autocomplete: home ? 'off' : ac + 'address-level2', maxlength: 50 }),
      part('state', 'State', 'a-state', null, stateSel),
      part('zip', 'ZIP', 'a-zip', { inputmode: 'numeric', autocomplete: home ? 'off' : ac + 'postal-code', maxlength: 10 })
    ]);
  }

  function fileInput(f) {
    var list = el('ul', { class: 'files', 'aria-live': 'polite' });
    var input = el('input', { type: 'file', id: id(f.t), name: f.t, multiple: true, accept: f.accept, 'aria-describedby': describedBy(f) });
    var drop = el('label', { class: 'drop', for: id(f.t) }, [
      el('span', { html: '<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="#006ca8" d="M12 3 7 8h3v6h4V8h3l-5-5ZM5 17v2h14v-2H5Z"/></svg>' }),
      el('span', {}, [el('strong', { text: 'Choose files' }), ' or drag them here']),
      el('span', { class: 'help', text: f.help }),
      input
    ]);
    function add(fileList) {
      var cur = (values[f.t] || []).slice();
      Array.prototype.forEach.call(fileList, function (file) {
        if (!cur.some(function (x) { return x.name === file.name && x.size === file.size; })) cur.push(file);
      });
      setValue(f.t, cur); touch(f.t); draw();
    }
    function draw() {
      list.innerHTML = '';
      (values[f.t] || []).forEach(function (file, i) {
        var rm = el('button', { type: 'button', class: 'linkbtn', 'aria-label': 'Remove ' + file.name, text: 'Remove' });
        rm.addEventListener('click', function () {
          var cur = values[f.t].slice(); cur.splice(i, 1); setValue(f.t, cur); draw();
        });
        list.appendChild(el('li', {}, [el('span', { class: 'fname', text: file.name }), el('span', { class: 'fsize', text: fmtSize(file.size) }), rm]));
      });
    }
    input.addEventListener('change', function () { add(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (ev) { if (ev.dataTransfer) add(ev.dataTransfer.files); });
    return el('div', {}, [drop, list]);
  }

  function agreeInput(f) {
    var c = el('input', { type: 'checkbox', id: id(f.t), name: f.t, 'aria-describedby': id(f.t, 'err') });
    c.addEventListener('change', function () { setValue(f.t, c.checked ? true : undefined); touch(f.t); });
    return el('label', { class: 'agree', for: id(f.t) }, [c, el('span', { text: f.label })]);
  }

  function signatureInput(f) {
    var canvas = el('canvas', { class: 'sigpad', id: id(f.t), tabindex: '0', role: 'img', 'aria-label': (f.ownerLabel || 'Signature') + ' pad. Draw with your mouse, finger or stylus.', 'aria-describedby': id(f.t, 'err') });
    var wrap = el('div', { class: 'sigwrap' }, [canvas, el('span', { class: 'sigline' }), el('span', { class: 'sighint', text: 'Sign above with your mouse or finger' })]);
    var clear = el('button', { type: 'button', class: 'linkbtn sigclear', text: 'Clear' });
    wrap.appendChild(clear);
    var ctx, drawing = false, last = null, inked = false;

    function setup() {
      var r = canvas.getBoundingClientRect();
      if (!r.width) return;
      var dpr = Math.max(1, window.devicePixelRatio || 1);
      var prev = inked ? canvas.toDataURL() : null;
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b1a33';
      if (prev) { var img = new Image(); img.onload = function () { ctx.drawImage(img, 0, 0, r.width, r.height); }; img.src = prev; }
    }
    function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    canvas.addEventListener('pointerdown', function (e) {
      if (!ctx) setup();
      drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId);
      ctx.beginPath(); ctx.arc(last.x, last.y, 1, 0, Math.PI * 2); ctx.fillStyle = '#0b1a33'; ctx.fill();
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var p = pos(e);
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p; inked = true;
    });
    function end() {
      if (!drawing) return;
      drawing = false; inked = true; wrap.classList.add('signed');
      setValue(f.t, exportSignature()); touch(f.t);
    }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    clear.addEventListener('click', function () {
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      inked = false; wrap.classList.remove('signed'); setValue(f.t, undefined);
    });
    // White background PNG so the signature reads in any viewer.
    function exportSignature() {
      var out = document.createElement('canvas');
      out.width = canvas.width; out.height = canvas.height;
      var o = out.getContext('2d');
      o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height); o.drawImage(canvas, 0, 0);
      return out.toDataURL('image/png');
    }
    canvas._ahfSetup = setup;
    window.addEventListener('resize', function () { if (ctx) setup(); });
    return wrap;
  }

  function renderField(f) {
    var control;
    switch (f.type) {
      case 'select': control = selectInput(f); break;
      case 'segment': control = segmentInput(f); break;
      case 'checks': control = checksInput(f); break;
      case 'textarea': control = textareaInput(f); break;
      case 'address': control = addressInput(f); break;
      case 'file': control = fileInput(f); break;
      case 'agree': control = agreeInput(f); break;
      case 'signature': control = signatureInput(f); break;
      default: control = textInput(f);
    }
    var groupLabel = ['segment', 'checks', 'address'].indexOf(f.type) >= 0;
    var label = f.type === 'agree' || f.type === 'file' ? null
      : f.type === 'signature' ? el('p', { class: 'lbl', id: id(f.t, 'lbl'), text: f.ownerLabel || 'Signature' })
      : labelFor(f, id(f.t), groupLabel ? 'p' : null);
    var wrap = el('div', { class: 'field ' + (f.width || ''), 'data-t': f.t }, [
      label, control,
      f.help && f.type !== 'file' ? el('p', { class: 'help', id: id(f.t, 'help'), text: f.help }) : null,
      el('p', { class: 'err', id: id(f.t, 'err'), role: 'alert', hidden: true })
    ]);
    return wrap;
  }

  // ---------- build steps ----------
  var stepEls = [];
  FORM.steps.forEach(function (step, si) {
    var node = el('div', { class: 'step', 'data-step': si, hidden: si !== 0 }, [
      el('h2', { tabindex: '-1', text: step.heading }),
      step.intro ? el('p', { class: 'intro', text: step.intro }) : null
    ]);
    if (step.review) node.appendChild(el('div', { class: 'review', id: 'review' }));
    step.sections.forEach(function (sec) {
      var grid = el('div', { class: 'grid' });
      sec.fields.forEach(function (f) { grid.appendChild(renderField(byTarget[f.t])); });
      var title = sec.owner != null && !sec.signer
        ? el('h3', {}, [el('span', { class: 'badge', text: String(sec.owner + 1) }), sec.title])
        : sec.title ? el('h3', { text: sec.title }) : null;
      var s = el('section', { class: 'section' + (sec.owner != null ? ' owner' : ''), 'data-sec': si + ':' + step.sections.indexOf(sec) },
        [title, sec.note ? el('p', { class: 'note', text: sec.note }) : null, grid]);
      s._sec = sec;
      node.appendChild(s);
    });
    if (step.review) node.appendChild(el('div', { class: 'consent', tabindex: '0', 'aria-label': 'Communications consent' }, [FORM.text.consent]));

    var back = si > 0 ? el('button', { type: 'button', class: 'btn ghost', text: 'Back', onclick: function () { go(si - 1); } }) : el('span');
    var last = si === FORM.steps.length - 1;
    var next = el('button', { type: last ? 'submit' : 'button', class: 'btn primary', 'data-next': si },
      [last ? 'Submit application' : 'Continue']);
    if (!last) next.addEventListener('click', function () { advance(si); });
    node.appendChild(el('div', { class: 'nav' }, [back, next]));
    form.appendChild(node);
    stepEls.push(node);
  });

  // ---------- rail ----------
  var rail = document.getElementById('steps');
  var railItems = FORM.steps.map(function (s, i) {
    var b = el('button', { type: 'button' }, [el('span', { class: 'num', text: String(i + 1) }), el('span', { class: 'label', text: s.title })]);
    b.addEventListener('click', function () { if (i <= furthest) go(i); });
    var li = el('li', {}, [b]);
    rail.appendChild(li);
    return li;
  });
  var help = document.getElementById('help');
  if (CFG.supportPhone || CFG.supportEmail) {
    help.appendChild(el('strong', { text: 'Questions?' }));
    help.appendChild(document.createTextNode('Our dealer team can help. '));
    if (CFG.supportPhone) help.appendChild(el('a', { href: 'tel:' + CFG.supportPhone.replace(/\D/g, ''), text: CFG.supportPhone }));
    if (CFG.supportPhone && CFG.supportEmail) help.appendChild(el('br'));
    if (CFG.supportEmail) help.appendChild(el('a', { href: 'mailto:' + CFG.supportEmail, text: CFG.supportEmail }));
  }
  if (CFG.logoUrl) document.getElementById('logo').src = CFG.logoUrl;
  else document.getElementById('logo').hidden = true;

  // ---------- state ----------
  function setValue(t, v) {
    values[t] = v;
    if (touched[t] || errors[t]) check(t);
    if (byTarget[t].type === 'percent') FORM.owners.forEach(function (o) { if (touched[o.pct]) check(o.pct); });
    refresh();
  }
  function touch(t) { touched[t] = true; check(t); }
  function check(t) {
    var f = byTarget[t];
    var e = P.validate(f, values[t], values);
    if (e) errors[t] = e; else delete errors[t];
    paintError(t);
  }
  function paintError(t) {
    var wrap = form.querySelector('[data-t="' + t + '"]');
    if (!wrap) return;
    var msg = wrap.querySelector('.err');
    var e = errors[t];
    wrap.classList.toggle('invalid', !!e);
    msg.hidden = !e; msg.textContent = e || '';
    wrap.querySelectorAll('input, select, textarea').forEach(function (n) {
      if (e) n.setAttribute('aria-invalid', 'true'); else n.removeAttribute('aria-invalid');
    });
  }

  function refresh() {
    form.querySelectorAll('.section').forEach(function (s) {
      var sec = s._sec;
      s.hidden = !!(sec.showIf && !sec.showIf(values));
    });
    fields.forEach(function (f) {
      var wrap = form.querySelector('[data-t="' + f.t + '"]');
      var shown = FORM.isShown(f, values);
      wrap.hidden = !shown;
      if (!shown && errors[f.t]) { delete errors[f.t]; paintError(f.t); }
    });
    notifyHeight();
  }

  // ---------- navigation ----------
  function go(i, focusField, initial) {
    current = i; furthest = Math.max(furthest, i);
    stepEls.forEach(function (s, si) { s.hidden = si !== i; });
    railItems.forEach(function (li, si) {
      li.className = si === i ? 'current' : passed[si] ? 'complete' : '';
      var b = li.querySelector('button');
      b.disabled = si > furthest;
      if (si === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    document.getElementById('progress-bar').style.width = ((i + 1) / FORM.steps.length * 100) + '%';
    document.getElementById('step-count').textContent = 'Step ' + (i + 1) + ' of ' + FORM.steps.length + ' · ' + FORM.steps[i].title;
    hideBanner();
    if (FORM.steps[i].review) renderReview();
    refresh();
    stepEls[i].querySelectorAll('canvas.sigpad').forEach(function (c) { requestAnimationFrame(function () { c._ahfSetup(); }); });
    if (initial) return;
    scrollTop();
    if (focusField) focusOn(focusField);
    else stepEls[i].querySelector('h2').focus({ preventScroll: true });
  }

  function stepErrors(si) {
    var e = P.validateStep(si, values);
    fields.forEach(function (f) { if (f.step === si) { touched[f.t] = true; if (e[f.t]) errors[f.t] = e[f.t]; else delete errors[f.t]; paintError(f.t); } });
    return Object.keys(e);
  }

  function advance(si) {
    var bad = stepErrors(si);
    if (bad.length) {
      showBanner('error', 'Please fix ' + (bad.length === 1 ? 'the highlighted field' : 'the ' + bad.length + ' highlighted fields') + ' to continue.');
      focusOn(bad[0]);
      return;
    }
    passed[si] = true;
    go(si + 1);
  }

  function focusOn(t) {
    var wrap = form.querySelector('[data-t="' + t + '"]');
    if (!wrap) return;
    var target = wrap.querySelector('input:not([type=hidden]), select, textarea, canvas');
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (target) target.focus({ preventScroll: true });
  }

  function scrollTop() {
    var panel = document.querySelector('.panel');
    if (embedded) { window.scrollTo(0, 0); post({ type: 'scrollTop' }); }
    else if (panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start' });
  }

  function showBanner(kind, html) {
    var b = document.getElementById('banner');
    b.className = 'banner ' + kind; b.innerHTML = html; b.hidden = false;
    b.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  }
  function hideBanner() { document.getElementById('banner').hidden = true; }

  // ---------- review ----------
  function renderReview() {
    var box = document.getElementById('review');
    box.innerHTML = '';
    FORM.steps.forEach(function (step, si) {
      if (step.review) return;
      var dl = el('dl');
      step.sections.forEach(function (sec) {
        if (sec.showIf && !sec.showIf(values)) return;
        var rows = sec.fields.filter(function (f) { return FORM.isShown(byTarget[f.t], values) && !P.isEmpty(f, values[f.t]); });
        if (!rows.length) return;
        if (sec.title) dl.appendChild(el('div', { class: 'sub-h', text: sec.title }));
        rows.forEach(function (f) {
          dl.appendChild(el('dt', { text: f.label }));
          dl.appendChild(el('dd', { text: P.displayValue(f, values[f.t]) }));
        });
      });
      var edit = el('button', { type: 'button', class: 'linkbtn', 'aria-label': 'Edit ' + step.title, text: 'Edit' });
      edit.addEventListener('click', function () { go(si); });
      box.appendChild(el('article', { class: 'rev' }, [el('header', {}, [el('h3', { text: step.title }), edit]), dl]));
    });
  }

  // ---------- submit ----------
  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Could not read ' + file.name)); };
      r.readAsDataURL(file);
    });
  }
  function dataUrlToBlob(d) {
    var parts = d.split(','), bin = atob(parts[1]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: /data:([^;]+)/.exec(parts[0])[1] });
  }
  function slug(s) { return String(s).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'company'; }

  function post(msg) {
    if (!embedded) return;
    msg.ahfEnroll = 1;
    try { window.parent.postMessage(msg, '*'); } catch (e) { /* ignore */ }
  }

  var pending = {};
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.ahfEnroll !== 1 || !d.requestId || !pending[d.requestId]) return;
    if (d.type === 'progress') { pending[d.requestId].progress(d); return; }
    if (d.type === 'result') { var p = pending[d.requestId]; delete pending[d.requestId]; p.done(d); }
  });

  function sendToWix(sub, onProgress) {
    var requestId = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    return Promise.all(sub.uploads.map(function (u) {
      return Promise.all(u.items.map(function (item) {
        if (typeof item === 'string') return { name: u.target + '.png', type: 'image/png', dataUrl: item };
        return readFile(item).then(function (d) { return { name: item.name, type: item.type || 'application/octet-stream', dataUrl: d }; });
      })).then(function (files) { return { target: u.target, kind: u.kind, files: files }; });
    })).then(function (uploads) {
      return new Promise(function (resolve, reject) {
        var timer = setTimeout(function () { delete pending[requestId]; reject(new Error('timeout')); }, 180000);
        pending[requestId] = {
          progress: onProgress,
          done: function (d) { clearTimeout(timer); if (d.ok) resolve(d); else reject(new Error(d.error || 'failed')); }
        };
        post({ type: 'submit', requestId: requestId, formId: sub.formId, submissions: sub.submissions, uploads: uploads });
      });
    });
  }

  function sendToWebhook() {
    var flat = P.buildFlatSubmission(values);
    var fd = new FormData();
    Object.keys(flat).forEach(function (k) { if (k !== '_labels') fd.append(k, flat[k]); });
    fd.append('_labels', JSON.stringify(flat._labels));
    fd.append('submitted_at', new Date().toISOString());
    (values.file_upload || []).forEach(function (file) { if (FORM.isShown(byTarget.file_upload, values)) fd.append('file_upload', file, file.name); });
    FORM.owners.forEach(function (o) {
      if (values[o.signature] && FORM.isShown(byTarget[o.signature], values)) fd.append(o.signature, dataUrlToBlob(values[o.signature]), o.signature + '.png');
    });
    return fetch(CFG.webhookUrl, { method: 'POST', body: fd }).then(function (r) {
      if (!r.ok && r.type !== 'opaque') throw new Error('HTTP ' + r.status);
    });
  }

  function setBusy(on, label) {
    var btn = stepEls[stepEls.length - 1].querySelector('[data-next]');
    btn.disabled = on;
    btn.innerHTML = '';
    if (on) btn.appendChild(el('span', { class: 'spinner', 'aria-hidden': 'true' }));
    btn.appendChild(document.createTextNode(on ? (label || 'Submitting…') : 'Submit application'));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitting) return;
    var all = P.validateAll(values);
    var bad = Object.keys(all);
    if (bad.length) {
      var firstStep = byTarget[bad[0]].step;
      FORM.steps.forEach(function (s, i) { stepErrors(i); });
      if (firstStep !== current) go(firstStep, bad[0]);
      else focusOn(bad[0]);
      showBanner('error', 'Please fix ' + (bad.length === 1 ? 'the highlighted field' : 'the ' + bad.length + ' highlighted fields') + ' before submitting.');
      return;
    }
    submitting = true; setBusy(true); hideBanner();
    var sub = P.buildWixSubmission(values);
    var job;
    if (mode === 'wix' && embedded) {
      job = sendToWix(sub, function (p) { setBusy(true, p.label || 'Uploading…'); });
    } else if (mode === 'webhook' && CFG.webhookUrl) {
      job = sendToWebhook();
    } else {
      // Demo: nothing leaves the browser.
      if (window.console) console.info('[AHF enrollment demo] Wix submission:', sub, 'Flat:', P.buildFlatSubmission(values));
      job = new Promise(function (r) { setTimeout(r, 600); });
    }
    job.then(function () {
      submitted = true;
      showDone();
    }).catch(function (err) {
      if (window.console) console.error('[AHF enrollment] submit failed', err);
      var contact = [CFG.supportPhone, CFG.supportEmail].filter(Boolean).join(' or ');
      showBanner('error', '<strong>We couldn’t submit your application.</strong>Your answers are still here. Please try again' +
        (contact ? ', or contact us at ' + contact : '') + '.');
      document.getElementById('banner').scrollIntoView({ block: 'center' });
    }).then(function () { submitting = false; setBusy(false); });
  });

  function showDone() {
    form.hidden = true;
    document.querySelector('.progress span').style.width = '100%';
    document.getElementById('step-count').hidden = true;
    railItems.forEach(function (li) { li.className = 'complete'; li.querySelector('button').disabled = true; });
    var done = document.getElementById('done');
    var demo = !(mode === 'wix' && embedded) && !(mode === 'webhook' && CFG.webhookUrl);
    done.innerHTML = '';
    done.appendChild(el('div', { class: 'tick', html: '<svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m9.5 16.6-4.1-4.1L4 13.9l5.5 5.5L20 8.9l-1.4-1.4z"/></svg>' }));
    done.appendChild(el('h2', { text: 'Application received' }));
    done.appendChild(el('p', { text: 'Thank you, ' + (values.company_name_a1d8 || 'and welcome') + '. Our dealer team will review your application and email ' + (values.e_mail_to_receive_credit_decisions || 'you') + ' with next steps.' }));
    done.appendChild(el('ol', {}, [
      el('li', { text: 'We verify your business, license and owner details.' }),
      el('li', { text: 'We may contact you for any documents you haven’t uploaded yet.' }),
      el('li', { text: 'Once approved, you can start offering financing to your customers.' })
    ]));
    if (CFG.redirectUrl) {
      var a = el('a', { class: 'btn primary', href: CFG.redirectUrl, target: '_top', text: 'Continue' });
      if (embedded) a.addEventListener('click', function (ev) { ev.preventDefault(); post({ type: 'redirect', url: CFG.redirectUrl }); });
      done.appendChild(a);
    }
    if (demo) done.appendChild(el('p', { class: 'banner info', html: '<strong>Preview mode</strong>This copy isn’t connected, so the application was not sent. See enroll-ahf/README.md to connect it.' }));
    done.hidden = false;
    scrollTop();
    done.focus();
    post({ type: 'submitted' });
    notifyHeight();
  }

  // ---------- embedding ----------
  var lastH = 0;
  function notifyHeight() {
    if (!embedded) return;
    var h = Math.ceil(document.documentElement.scrollHeight);
    if (h !== lastH) { lastH = h; post({ type: 'height', height: h }); }
  }
  if (window.ResizeObserver) new ResizeObserver(notifyHeight).observe(document.body);

  window.addEventListener('beforeunload', function (e) {
    if (submitted || !Object.keys(touched).length) return;
    e.preventDefault(); e.returnValue = '';
  });

  if (!(mode === 'wix' && embedded) && !(mode === 'webhook' && CFG.webhookUrl)) {
    var why = mode === 'wix' ? 'it isn’t inside the Wix page yet' : mode === 'webhook' ? 'no webhook URL is set' : 'demo mode is on';
    showBanner('info', '<strong>Preview mode</strong>Applications from this copy are not sent because ' + why + '.');
    var b = document.getElementById('banner');
    b.id = 'preview-note';
    var fresh = el('div', { id: 'banner', class: 'banner', hidden: true });
    b.parentNode.insertBefore(fresh, b.nextSibling);
  }

  go(0, null, true);
})();
