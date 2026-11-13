/*
 * Site settings: your business details, the Google Sheet link, and where orders go.
 * Prices, ZIP codes, fees and promo codes live in the Google Sheet (or js/data.js until one is linked).
 * Works as a browser global (window.MailConfig) and as a CommonJS module (for tests).
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

    /*
     * Your price sheet in Google Sheets. Paste the sheet's link between the quotes, for example
     * 'https://docs.google.com/spreadsheets/d/1AbC.../edit'.
     * The sheet must be shared as "Anyone with the link: Viewer" and have tabs named
     * Prices, ZIPs, Settings and Promos. Leave empty to use the built-in prices in js/data.js.
     */
    googleSheet: '',

    /*
     * How each option looks on its card. Match the Option name used in the Prices tab.
     * An option in the sheet that isn't listed here still shows, with a plain page drawing.
     *  icon: bookmark | page | booklet | postcard     badge: optional label on the card
     */
    options: {
      'Bookmark Pop Out Insert': { blurb: 'Tall pop-out that keeps your offer in hand', icon: 'bookmark',
        postageNote: 'Postage included. Inserts are delivered with Best Deals mailings.' },
      'Full Page Pop Out Insert': { blurb: 'Full-page insert that falls right into their hands', icon: 'page',
        postageNote: 'Postage included. Inserts are delivered with Best Deals mailings.' },
      '4-Page Booklet Insert': { blurb: 'Four pages for your full story, services and offers', icon: 'booklet',
        postageNote: 'Postage included. Inserts are delivered with Best Deals mailings.' },
      'Direct Mailers': { blurb: 'Solo postcard mailers', icon: 'postcard', badge: 'Best Deals customers',
        postageNote: 'Postage included. Your postcard mails on its own to every home you choose.' },
    },
    defaultOption: 'Full Page Pop Out Insert',

    maxHomes: 250000, // above this, customers are asked to call

    checkout: {
      /*
       * Where finished orders go. Leave empty to run in demo mode (the order is shown, not sent).
       * Paste your Zapier "Catch Hook" URL (https://hooks.zapier.com/hooks/catch/...)
       * or Make "Custom webhook" URL (https://hook.us1.make.com/...) between the quotes.
       * Each order arrives as one-level fields (order_number, customer_email, zip_codes, total...)
       * plus the full order as JSON in "order" and any attached files as "files".
       */
      orderEndpoint: '',
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = config;
  else root.MailConfig = config;
})(typeof window !== 'undefined' ? window : this);
