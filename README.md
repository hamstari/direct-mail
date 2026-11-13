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

## Receive orders (Zapier or Make)

Until you add a webhook, the page runs in **demo mode**: customers see the confirmation, but the order goes nowhere.

**Zapier**
1. Create a Zap. Trigger: **Webhooks by Zapier → Catch Hook**. Copy the URL it gives you.
2. Paste that URL into `checkout.orderEndpoint` in `js/config.js`.
3. Place one test order on the page, then click **Test trigger** in Zapier to see the fields.
4. Add actions, for example **Gmail → Send email** to yourself and **Google Sheets → Create row**.

**Make**: the same, using a **Webhooks → Custom webhook** module.

Every order arrives as simple fields you can map straight into an email or sheet:

`order_number`, `placed_at`, `customer_name`, `company`, `customer_email`, `customer_phone`, `website`, `services`, `billing_address`, `billing_city`, `billing_state`, `billing_zip`, `payment_method`, `notes`, `mail_option`, `ad_size`, `paper`, `homes`, `mailings`, `total_pieces`, `zip_codes`, `zip_detail`, `counties`, `in_home_date`, `rush`, `promo_code`, `rate_per_home`, `setup_fee`, `rush_fee`, `subtotal`, `sales_tax`, `total`, `file_names`, `line_items`

It also sends `order` (the full order as JSON) and any logo or photo files as `files`.

Prices are calculated in the customer's browser, so check the total on each order before you charge. Nothing is charged automatically: you send the card link or invoice after the proof is approved.

## Put it on your website

1. Upload the whole folder (`index.html`, `css/`, `js/`) to your web host, for example as `yoursite.com/direct-mail/`. Then you can link straight to `yoursite.com/direct-mail/index.html`.
2. Or embed it inside an existing page: open `embed-snippet.html`, change the `src` to where you uploaded the folder, and paste the code into a WordPress "Custom HTML" block, a Wix "Embed code" element, or a Squarespace "Code" block. The frame grows to fit the calculator, so there is no inner scroll bar.

If your website builder can't host files (Wix, Squarespace), host the folder for free on GitHub Pages or Netlify and use that address in the embed code.

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
- `embed-snippet.html`: code to paste into your website
- `tests/calc.test.js`: tests
