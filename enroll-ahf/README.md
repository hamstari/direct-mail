# AHF contractor enrollment (redesign)

A redesigned version of the enrollment form at
https://www.americahomefinancial.com/enroll-ahf: five short steps (Business,
Contact & owners, Products & license, Sales & documents, Review & sign),
plain-language labels, input formatting, a review screen, signatures drawn
on screen, and a layout that works on phones.

## How it keeps syncing to Smartsheet

The live form is a Wix Form named **Enrollment (FFC)**
(`5872b652-a4ff-401f-b02b-7f4f0799fc62`). Nothing on the page talks to
Smartsheet: the sync runs off that Wix form's submissions (a Wix automation
or Zapier/Make).

So the redesign **still saves every application into that same Wix form**,
with the same field keys. Smartsheet, the notification emails, the contact
update and the redirect to `/sign-up` therefore keep working, and none of the
Smartsheet columns or mappings need to change.

```
new form (Embed HTML)  →  Wix page code  →  backend: Wix Forms createSubmission
                                                  ↓
                                   "Enrollment (FFC)" submissions
                                                  ↓
                                   existing automation → Smartsheet
```

`wix/form-snapshot.json` records the live form's field keys, options and
show/hide rules. The tests fail if the redesign drifts from it.

## Install on the Wix site

1. **Build the single file:** `npm run build:enroll`. This writes
   `enroll-ahf/dist/enroll-ahf.html` (a built copy is already committed).
2. **Turn on Dev Mode** in the Wix editor.
3. **Backend:** under Backend, add a web module named `enrollment.web.js` and
   paste in `wix/enrollment.web.js`.
4. **Page:** open the enroll page.
   - Add **Embed Code → Embed HTML**, choose **Code**, and paste in the whole
     `dist/enroll-ahf.html`.
   - In its Properties panel, set the ID to `enrollForm`.
   - Make it full width and about **2,400 px tall on desktop** and
     **3,000 px on mobile**. The steps are short, but the review step is long.
   - Paste `wix/enroll-page.js` into the page's code panel.
   - Hide or delete the old form element. The form stays in Wix Forms either
     way, so its submissions and automations keep running.
5. **Test before publishing:** in Preview, submit one application with 1 owner
   and one uploaded PDF. Then check all of these:
   - The submission appears under **Forms & Submissions → Enrollment (FFC)**.
   - A row appears in Smartsheet with every column filled.
   - The PDF and the signature open from the submission.

   If anything fails, the error is in **Dev Mode → Logs**.

### Check these on the first test submission

A few of the values the Wix form stores couldn't be confirmed without a real
submission. These are the places to look if Wix rejects one:

- **Files and signatures** are uploaded privately to Wix Media
  (`/AHF Enrollment Uploads`) and attached as
  `{ fileId, displayName, url, fileType }`.
- **Phone numbers** are sent as `+18135550142`.
- **Addresses** are sent with `country`, `subdivision` (`US-FL`), `city`,
  `postalCode`, `addressLine` and `streetAddress`. The old business address had
  no State box; the new one does.
- **Spam protection:** if the form has spam protection set high, Wix may ask
  for a captcha on server-side submissions. If so, lower it, or let us know.

## Alternative: a Zapier/Make webhook

If the form is hosted outside Wix, set `mode: 'webhook'` and `webhookUrl` in
`src/config.js`, then rebuild. Each application is posted as form fields named
with the same Wix keys, plus `_labels` (key → question) and the uploaded files
and signature PNGs. Map them to Smartsheet with **Smartsheet → Add Row**.

This sends full SSNs to Zapier/Make, so only use a private webhook you control.
The Wix route keeps SSNs inside Wix, as today.

## Settings (`src/config.js`)

| Setting | What it does |
|---|---|
| `mode` | `wix` (default), `webhook`, or `demo` (nothing is sent) |
| `webhookUrl` | Zapier/Make catch-hook URL for `webhook` mode |
| `redirectUrl` | Where **Continue** goes after submitting (`/sign-up`) |
| `logoUrl`, `supportPhone`, `supportEmail` | Header logo and the help box |

Opened anywhere other than inside the Wix page, the form shows a **Preview
mode** note and sends nothing.

## Changing questions

The questions live in `src/fields.js`. Each one's `t` is the Wix field key:

- **Change a label or help text** freely.
- **Add a question:** add the field to the Wix form first, then add it here
  with the same key, and add the key to `ALLOWED` in `wix/enrollment.web.js`.
- **After any change:** run `npm test`, then `npm run build:enroll`, and paste
  the new `dist/enroll-ahf.html` into the embed.

## Changes from the old form

- **Owner key numbering:** owner keys aren't numbered in order in Wix
  (Owner 1's email is `email_79a5_2`). `fields.js` maps them by Wix label, and
  a test checks the mapping.
- **SSN help text:** in the old form, Owners 2 and 4's SSN help showed the
  licensing paragraph by mistake. The redesign shows the SSN note for every
  owner and moves the licensing paragraph to the Licensing section.
- **Ownership check:** the owners' ownership percentages can't add up to more
  than 100%.

## Files

- `index.html`, `src/enroll.css`, `src/enroll.js`: the form
- `src/fields.js`: questions, options and show/hide rules (Wix keys)
- `src/payload.js`: validation and conversion to Wix values
- `src/config.js`: settings
- `wix/enrollment.web.js`: Wix backend (upload files, create submission)
- `wix/enroll-page.js`: Wix page code (connects the embed to the backend)
- `wix/form-snapshot.json`: snapshot of the live Wix form
- `dist/enroll-ahf.html`: built single file to paste into Wix
- `tests/enroll.test.js`: tests (`npm test`)
