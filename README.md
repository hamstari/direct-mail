# Direct Mail Pricing & Checkout

A web page where customers price a printed direct mail order by **ad size**, quantity and delivery method, add one or more ads to an order, and check out.

## What customers can do

1. **Pick an ad size**
   - *My own mailer*: 4.25×6, 5.5×8.5 and 6×9 postcards, a 6.25×11 jumbo postcard, an 8.5×11 flyer, or an 11×17 folded mailer. Each card shows the size to scale and flags sizes that can go out by EDDM.
   - *Ad in a shared mailer*: 1/8, 1/4, 1/2, full page or back cover spots on a shared 8.5×11 mailer, priced per 1,000 homes with printing and postage included.
2. **Choose who gets it**: Every Door Direct Mail, a targeted mailing list, their own list, or shipped to them. Sizes too small for EDDM are switched to a targeted mailing automatically.
3. **Choose paper and printing**: paper, finish, and one or two sides.
4. **Choose design and schedule**: upload their own art or pay for design, standard or rush, and how many times to mail (repeat mailings get a discount).

A live quote shows each charge, the total and the cost per home. They can add several ads, then edit, duplicate or remove them in **Your order** and go to **Check out**. Checkout takes contact and billing details, the earliest mail date, artwork or list files, notes, and the payment choice (card or invoice). A confirmation page shows the order number and a printable receipt.

## Set your prices

Edit `js/config.js`. Everything is in there: sizes and their price per piece at each quantity break, shared-mailer rates, postage, list costs, paper and finish multipliers, design fees, rush %, repeat-mailing discounts, minimums, sales tax and your business details. **The starting numbers are placeholders**, and the postage numbers are estimates, so check current USPS rates.

## Receive orders and payments

By default the site runs in **demo mode**: orders are shown to the customer but not sent anywhere. To go live, set these in `js/config.js`:

- `checkout.orderEndpoint`: a URL that accepts a multipart POST, such as a Formspree form, a Zapier or Make webhook, or your own server. It receives `order` (JSON with the customer, every ad, line items and totals) plus the uploaded files.
- `checkout.paymentUrl` (optional): where "Pay by card" customers go after ordering, such as a Stripe Payment Link or your own route that opens Stripe Checkout. `{total}` and `{order}` in the URL are replaced with the amount due and the order number.
- `checkout.depositPct` (optional): collect only part of the total up front.

The page never asks for card numbers itself. Payment happens on the payment provider's secure page.

> Because pricing runs in the browser, check the total on every order you receive before you charge it. If you take payment automatically, have your server recalculate the price with `js/calc.js` (it works in Node) rather than trusting the amount the browser sends.

## Run it

No build step. Open `index.html`, or:

```sh
npm start   # serves on http://localhost:3000
npm test    # pricing tests (Node 18+)
```

To add it to an existing website, upload the folder and link to `index.html`, or embed it in an `<iframe>`.

## Files

- `index.html`: page layout (quote, order, checkout, confirmation)
- `css/styles.css`: styles (light/dark, mobile, print)
- `js/config.js`: prices and checkout settings
- `js/calc.js`: pricing math (shared by the page and the tests)
- `js/app.js`: page behavior
- `tests/calc.test.js`: tests
