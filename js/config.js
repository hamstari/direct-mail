/*
 * Price sheet. Edit this file to change products, sizes, prices and checkout settings.
 * All money is in US dollars.
 * Works as a browser global (window.MailConfig) and as a CommonJS module (for tests).
 *
 * Only the Full Page Pop Out Insert at 10,000 homes ($0.187/home) comes from the
 * live price sheet. Every other number is a PLACEHOLDER: replace it with your real price.
 */
(function (root) {
  'use strict';

  var config = {
    business: {
      network: 'Best Deals Networks',
      name: 'Best Deals Direct',
      tagline: 'Leads and loans for the home improvement industry. Choose your insert or mailer, pick a size, set your reach and check out. Postage included.',
      email: 'orders@example.com',
      phone: '(555) 555-0100',
    },

    // Price breaks (homes per mailing). A rate applies to every home once you reach its break.
    breaks: [2500, 5000, 10000, 25000, 50000, 100000],
    minHomes: 2500,
    maxHomes: 250000,
    quickPicks: [2500, 5000, 10000, 15000, 25000, 50000, 75000, 100000],

    /*
     * Direct mail options.
     *  icon:   bookmark | page | booklet | postcard (drawing on the card)
     *  badge:  optional label shown on the option card
     *  postageNote: shown under the options when this one is selected
     *  sizes:  rates[] is the price per home at each break above
     */
    products: [
      {
        id: 'bookmark', name: 'Bookmark Pop Out Insert', blurb: 'Tall pop-out that keeps your offer in hand', icon: 'bookmark',
        postageNote: 'Postage included. Inserts are delivered with Best Deals mailings.',
        sizes: [
          { id: 'bm-35x85', dims: '3.5" × 8.5"', w: 3.5, h: 8.5, spec: '2-sided 100# gloss cover',
            rates: [0.119, 0.105, 0.095, 0.086, 0.078, 0.071] },
        ],
      },
      {
        id: 'fullpage', name: 'Full Page Pop Out Insert', blurb: 'Full-page insert that falls right into their hands', icon: 'page',
        postageNote: 'Postage included. Inserts are delivered with Best Deals mailings.',
        sizes: [
          { id: 'fp-8375x10875', dims: '8.375" × 10.875"', w: 8.375, h: 10.875, spec: '2-sided 70# gloss',
            rates: [0.229, 0.205, 0.187, 0.169, 0.152, 0.139] },
        ],
      },
      {
        id: 'booklet', name: '4-Page Booklet Insert', blurb: 'Four pages for your full story, services and offers', icon: 'booklet',
        postageNote: 'Postage included. Inserts are delivered with Best Deals mailings.',
        sizes: [
          { id: 'bk-8375x10875', dims: '8.375" × 10.875"', w: 8.375, h: 10.875, spec: '4 pages, folded, 70# gloss',
            rates: [0.349, 0.315, 0.289, 0.262, 0.238, 0.219] },
        ],
      },
      {
        id: 'mailer', name: 'Direct Mailers', blurb: 'Solo postcard mailers', icon: 'postcard', badge: 'Best Deals customers',
        postageNote: 'Postage included. Your postcard mails on its own to every home you choose.',
        sizes: [
          { id: 'pc-6x9',    dims: '6" × 9"',     w: 9,  h: 6,    spec: '2-sided 14 pt gloss cover',
            rates: [0.459, 0.429, 0.405, 0.385, 0.369, 0.355] },
          { id: 'pc-6x11',   dims: '6" × 11"',    w: 11, h: 6,    spec: '2-sided 14 pt gloss cover',
            rates: [0.499, 0.465, 0.439, 0.418, 0.399, 0.385] },
          { id: 'pc-85x11',  dims: '8.5" × 11"',  w: 11, h: 8.5,  spec: '2-sided 14 pt gloss cover',
            rates: [0.579, 0.539, 0.509, 0.485, 0.465, 0.449] },
        ],
      },
    ],

    // Discount on the ad price when the same ad mails several times.
    mailings: [
      { count: 1, pct: 0 },
      { count: 3, pct: 5 },
      { count: 6, pct: 10 },
      { count: 12, pct: 15 },
    ],

    setupFee: 49,     // once per order
    rushPct: 15,      // % of the ad price (after the multi-mailing discount)
    taxPct: 7,        // sales tax on the order

    /*
     * Promo codes (case does not matter).
     *  pct:  percent off the ad price     amount: dollars off the order before tax
     */
    promoCodes: {
      WELCOME10: { pct: 10, label: '10% off your ad' },
      SETUPFREE: { amount: 49, label: 'Free setup' },
    },

    checkout: {
      /*
       * Where finished orders go. Leave empty to run in demo mode (the order is shown, not sent).
       * Any endpoint that accepts a multipart POST works: your own server, Formspree, Zapier, Make, etc.
       * Fields sent: order (JSON string) plus any attached files.
       */
      orderEndpoint: '',
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = config;
  else root.MailConfig = config;
})(typeof window !== 'undefined' ? window : this);
