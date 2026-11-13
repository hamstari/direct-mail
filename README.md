# Best Deals Direct: mailer calculator & checkout

A web page where home-improvement businesses build an insert or direct mailer, see a live price, and check out. Postage and ad design are included.

## The flow

**1 · Build your mailer**

1. **Direct mail option**: Bookmark Pop Out Insert, Full Page Pop Out Insert, 4-Page Booklet Insert, or Direct Mailers (solo postcards, tagged "Best Deals customers").
2. **Ad size**: the trim sizes for that option, with paper spec.
3. **Where should it mail?**: customers check ZIP codes from your distribution list (search by ZIP or city, or select a whole county). The home count, and so the price, comes from the ZIPs they pick. Minimum 2,500 homes. The price per home drops at 5k, 10k, 25k, 50k and 100k.
4. **Schedule & extras**: 1, 3, 6 or 12 mailings (save 5/10/15%), rush production, preferred in-home date, optional logo/photo uploads.

**Your order** shows the ad price, postage and design (included), setup & prepress, sales tax, the total, cost per home, and a promo code box.

**2 · Checkout** collects business, billing and payment preference (card link or invoice, sent after the proof is approved). **3 · Confirmation** shows the order number and a printable receipt.

## Add your distribution ZIP codes

Edit `js/zips.js`. Put one ZIP per line as `zip, city, county, homes`. You can copy four columns straight out of Excel or Google Sheets and paste them in (tabs work, and so do numbers like `6,200`). **The ZIPs in there now are samples.** The order you receive lists every ZIP the customer picked, with its homes.

## Set your prices

Edit `js/config.js`: products, sizes, price per home at each break, mailing discounts, setup fee, rush %, tax %, promo codes and contact details.

> Only the Full Page Pop Out Insert at 10,000 homes ($0.187/home → $2,053.33 total with $49 setup and 7% tax) came from the live price sheet. **Every other rate, size, the rush % and the promo codes are placeholders.**

## Receive orders

By default the page runs in **demo mode**: orders are shown but not sent. Set `checkout.orderEndpoint` in `js/config.js` to any URL that accepts a multipart POST (Formspree, Zapier/Make webhook, your server). It receives `order` (JSON: customer, mailer choices, line items, totals) plus attached files.

Pricing runs in the browser, so check the total before you charge. `js/calc.js` also works in Node if your server should recalculate it.

## Run it

No build step. Open `index.html`, or:

```sh
npm start   # serves on http://localhost:3000
npm test    # pricing tests (Node 18+)
```

## Files

- `index.html`: page layout (build, checkout, confirmation)
- `css/styles.css`: styles (light/dark, mobile, print)
- `js/config.js`: prices and settings
- `js/zips.js`: your distribution ZIP codes and homes per ZIP
- `js/calc.js`: pricing math (shared by the page and the tests)
- `js/app.js`: page behavior
- `tests/calc.test.js`: tests
