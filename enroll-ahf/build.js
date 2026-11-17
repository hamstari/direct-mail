#!/usr/bin/env node
/*
 * Bundles enroll-ahf/index.html and its CSS/JS into one self-contained file,
 * enroll-ahf/dist/enroll-ahf.html, ready to paste into a Wix "Embed HTML"
 * element (Code option) or to upload anywhere.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const dir = __dirname;
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const read = (rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

html = html.replace(/<link rel="stylesheet" href="(src\/[^"]+)">/g, (_, rel) => `<style>\n${read(rel)}</style>`);
html = html.replace(/<script src="(src\/[^"]+)"><\/script>/g, (_, rel) =>
  `<script>\n${read(rel).replace(/<\/script/gi, '<\\/script')}</script>`);

fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
const out = path.join(dir, 'dist', 'enroll-ahf.html');
fs.writeFileSync(out, html);
console.log(`Wrote ${path.relative(process.cwd(), out)} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
