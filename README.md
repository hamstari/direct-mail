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

## Update prices and ZIP codes (CSV files)

Everything that changes lives in four CSV files in the `data` folder:

| File | Columns |
|---|---|
| `data/prices.csv` | Option, Size, Paper, then one column per price break (header = number of homes, cells = price per home) |
| `data/zips.csv` | ZIP, City, County, Homes |
| `data/settings.csv` | Setting, Value (setup fee, sales tax %, rush %, minimum homes, one row per mailing choice like "3 mailings discount %") |
| `data/promos.csv` | Code, Discount (`10%` off the ad or `$49` off the order), Description |

**To update:** open the file in Excel, Numbers or Google Sheets, change it, save it as **CSV**, and upload it to your website's `data` folder over the old one. The next visitor gets the new prices; no other files change.

- Add a row for a new size or option, add a column for a new price break, or delete a row to stop selling something. Keep row 1 (the headers).
- Excel quirks are handled: dropped leading zeros on ZIPs (1902 becomes 01902), ZIP+4, numbers like 6,200, and semicolon-separated files.
- **Check your upload:** open your calculator with `#check` at the end of the address (for example `yoursite.com/direct-mail/#check`). A panel shows what loaded and anything to fix, such as a bad ZIP, a missing price, or a price that goes up at a bigger quantity. Customers don't see it.
- If a file can't be read, the page uses the backup copy in `js/data.js` so it never goes blank (and turns off promo codes). To refresh that backup after changing the CSVs: `npm run sync-backup`.
- A brand-new option name shows with a plain drawing until it gets a description in `options` in `js/config.js`.

**Prefer Google Sheets?** Upload `price-sheet-template.xlsx` to Google Drive, open it with Google Sheets, share it as "Anyone with the link: Viewer", and paste its link into `googleSheet` in `js/config.js`. The page then reads the sheet instead of the CSV files, and edits show within about 5 minutes with nothing to upload.

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

1. Upload the whole folder (`index.html`, `css/`, `js/`, `data/`) to your web host, for example as `yoursite.com/direct-mail/`. Then you can link straight to `yoursite.com/direct-mail/index.html`.
2. Or embed it inside an existing page: open `embed-snippet.html`, change the `src` to where you uploaded the folder, and paste the code into a WordPress "Custom HTML" block, a Wix "Embed code" element, or a Squarespace "Code" block. The frame grows to fit the calculator, so there is no inner scroll bar.

If your website builder can't host files (Wix, Squarespace), host the folder for free on GitHub Pages or Netlify and use that address in the embed code.

## Run it

No build step. Opened straight from your computer, `index.html` uses the backup prices in `js/data.js` (browsers block reading the CSV files from disk). To test your CSV files, serve the folder:

```sh
npm start   # serves on http://localhost:3000
npm test    # pricing tests (Node 18+)
```

## Files

- `index.html`: page layout (build, checkout, confirmation)
- `css/styles.css`: styles (light/dark, mobile, print)
- `js/config.js`: business details, Google Sheet link, order webhook, option descriptions
- `data/*.csv`: your prices, ZIP codes, settings and promo codes
- `js/data.js`: backup copy of the CSV data (`npm run sync-backup`)
- `price-sheet-template.xlsx`: starting point for your Google Sheet
- `tools/build-sheet-template.py`: rebuilds the Google Sheets template from `js/data.js`
- `tools/sync-backup.js`: copies `data/*.csv` into `js/data.js`
- `js/calc.js`: pricing math (shared by the page and the tests)
- `js/app.js`: page behavior
- `embed-snippet.html`: code to paste into your website
- `tests/calc.test.js`: tests
