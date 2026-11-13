/*
 * Price sheet. Edit this file to change your prices, sizes and checkout settings.
 * All money is in US dollars. Postage numbers are estimates: check current USPS rates.
 * Works as a browser global (window.MailConfig) and as a CommonJS module (for tests).
 */
(function (root) {
  'use strict';

  var config = {
    business: {
      name: 'Your Print & Mail Co.',
      email: 'orders@example.com',
      phone: '(555) 555-0100',
    },

    // Quantity breaks used by every solo-mailer size below (pieces per drop).
    tiers: [250, 500, 1000, 2500, 5000, 10000, 25000],

    /*
     * Ad sizes.
     *  kind 'solo'   = the customer's own printed piece. print[] is the price per piece at each tier.
     *  kind 'shared' = an ad spot in a shared (co-op) mailer. perThousand includes printing and postage.
     *  eddm: true if the size qualifies for USPS Every Door Direct Mail (a flat).
     *  w/h are inches; used for the size preview.
     */
    sizes: [
      { id: 'pc-4x6',   kind: 'solo', name: 'Postcard',        dims: '4.25" × 6"',  w: 6,    h: 4.25, eddm: false,
        print: [0.29, 0.22, 0.16, 0.11, 0.085, 0.07, 0.06],  postage: { targeted: 0.39 } },
      { id: 'pc-55x85', kind: 'solo', name: 'Large postcard',  dims: '5.5" × 8.5"', w: 8.5,  h: 5.5,  eddm: false,
        print: [0.34, 0.26, 0.19, 0.13, 0.10, 0.085, 0.075], postage: { targeted: 0.39 } },
      { id: 'pc-6x9',   kind: 'solo', name: 'Postcard',        dims: '6" × 9"',     w: 9,    h: 6,    eddm: false,
        print: [0.38, 0.30, 0.22, 0.15, 0.12, 0.10, 0.085],  postage: { targeted: 0.39 } },
      { id: 'pc-625x11', kind: 'solo', name: 'Jumbo postcard', dims: '6.25" × 11"', w: 11,   h: 6.25, eddm: true,
        print: [0.44, 0.34, 0.25, 0.17, 0.135, 0.11, 0.095], postage: { eddm: 0.25, targeted: 0.55 } },
      { id: 'fl-85x11', kind: 'solo', name: 'Flyer',           dims: '8.5" × 11"',  w: 8.5,  h: 11,   eddm: true,
        print: [0.52, 0.40, 0.30, 0.21, 0.16, 0.135, 0.12],  postage: { eddm: 0.25, targeted: 0.55 } },
      { id: 'fl-11x17', kind: 'solo', name: 'Folded mailer',   dims: '11" × 17" folded to 8.5" × 11"', w: 17, h: 11, eddm: true,
        print: [0.80, 0.62, 0.46, 0.32, 0.25, 0.21, 0.18],   postage: { eddm: 0.27, targeted: 0.58 } },

      { id: 'sh-8',    kind: 'shared', name: '1/8 page ad',  dims: '4.25" × 2.75"', w: 4.25, h: 2.75, perThousand: 45 },
      { id: 'sh-4',    kind: 'shared', name: '1/4 page ad',  dims: '4.25" × 5.5"',  w: 4.25, h: 5.5,  perThousand: 80 },
      { id: 'sh-2',    kind: 'shared', name: '1/2 page ad',  dims: '8.5" × 5.5"',   w: 8.5,  h: 5.5,  perThousand: 145 },
      { id: 'sh-1',    kind: 'shared', name: 'Full page ad', dims: '8.5" × 11"',    w: 8.5,  h: 11,   perThousand: 260 },
      { id: 'sh-back', kind: 'shared', name: 'Back cover ad', dims: '8.5" × 11"',   w: 8.5,  h: 11,   perThousand: 330 },
    ],

    // The full sheet a shared-mailer ad sits on (for the size preview).
    sharedSheet: { w: 8.5, h: 11 },

    // Minimum pieces (solo) or homes (shared) per drop.
    minimums: { solo: 250, eddm: 200, shared: 5000 },

    // Paper and print options for solo pieces. mult multiplies the printing price.
    stocks: [
      { id: '14pt', name: '14 pt gloss cover (standard)', mult: 1 },
      { id: '16pt', name: '16 pt premium cover', mult: 1.12 },
      { id: '100lb', name: '100 lb gloss text (lighter, flyers)', mult: 0.9 },
      { id: '32pt', name: '32 pt ultra-thick', mult: 1.65 },
    ],
    finishes: [
      { id: 'uv', name: 'High-gloss UV', mult: 1 },
      { id: 'matte', name: 'Matte', mult: 1 },
      { id: 'soft', name: 'Soft-touch', mult: 1.18 },
    ],
    sides: [
      { id: '2', name: 'Printed both sides', mult: 1 },
      { id: '1', name: 'Printed front only', mult: 0.85 },
    ],

    // Delivery methods for solo pieces.
    delivery: {
      eddm:     { name: 'Every Door Direct Mail', note: 'Every home on the carrier routes you pick. No mailing list needed.', prepPerPiece: 0.02 },
      targeted: { name: 'Targeted mailing list', note: 'Addressed to a list you choose (homeowners, income, age...).', listPerRecord: 0.05, listMinimum: 75, addressingPerPiece: 0.035 },
      own:      { name: 'My own mailing list', note: 'You upload your list. We clean, address and presort it.', addressingPerPiece: 0.035, listCleanFlat: 25 },
      ship:     { name: 'Ship to me (no mailing)', note: 'Printed and shipped to your address.', shipFlat: 29, shipPerPiece: 0.012 },
    },

    // One-time design help, charged once per ad (not per drop).
    design: [
      { id: 'none', name: "I'll upload print-ready art", price: 0 },
      { id: 'basic', name: 'Basic design (from your logo and text)', price: 99 },
      { id: 'custom', name: 'Custom design, 2 rounds of changes', price: 249 },
    ],

    turnaround: [
      { id: 'std', name: 'Standard: mails in 5-7 business days', pct: 0 },
      { id: 'rush', name: 'Rush: mails in 2-3 business days', pct: 25 },
    ],

    // Discount on printing/ad space when the same ad mails several times.
    dropDiscounts: [
      { minDrops: 3, pct: 5 },
      { minDrops: 6, pct: 10 },
      { minDrops: 12, pct: 15 },
    ],
    maxDrops: 12,

    taxPct: 0, // sales tax on the order, if you charge it

    checkout: {
      /*
       * Where finished orders go. Leave empty to run in demo mode (the order is shown, not sent).
       * Any endpoint that accepts a multipart POST works: your own server, Formspree, Zapier, Make, etc.
       * Fields sent: order (JSON string) plus artwork files.
       */
      orderEndpoint: '',
      /*
       * Optional: after the order is sent, send "Pay by card" customers here to pay.
       * {total} and {order} are replaced with the order total and order number.
       * Example: a Stripe Payment Link, or your own server route that starts Stripe Checkout.
       */
      paymentUrl: '',
      depositPct: 0, // e.g. 50 to collect half up front
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = config;
  else root.MailConfig = config;
})(typeof window !== 'undefined' ? window : this);
