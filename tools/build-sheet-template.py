"""Builds price-sheet-template.xlsx from js/data.js (run: python3 tools/build-sheet-template.py).
Upload the .xlsx to Google Drive and open it with Google Sheets to start your live price sheet."""
import json, subprocess, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

raw = json.loads(subprocess.check_output(['node', '-e',
    "const C=require('./js/calc.js'),D=require('./js/data.js');"
    "const o={};for(const k in D)o[k]=C.parseCSV(D[k]);console.log(JSON.stringify(o))"]))

HEAD = Font(bold=True, color='FFFFFF')
FILL = PatternFill('solid', fgColor='1D383D')
NOTE = Font(italic=True, color='5F6A70')

def num(v):
    try:
        return float(str(v).replace(',', '').replace('$', ''))
    except ValueError:
        return v

def sheet(wb, title, rows, widths, fmt=None):
    ws = wb.create_sheet(title)
    for r, row in enumerate(rows, 1):
        for c, v in enumerate(row, 1):
            cell = ws.cell(row=r, column=c, value=v)
            if r == 1:
                cell.font, cell.fill = HEAD, FILL
            elif fmt:
                f = fmt(c, v)
                if f:
                    cell.number_format = f
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[chr(64 + i)].width = w
    ws.freeze_panes = 'A2'
    return ws

wb = Workbook()
start = wb.active
start.title = 'Start here'
lines = [
    ('Best Deals Direct price sheet', Font(bold=True, size=16)),
    ('The calculator on your website reads this sheet every time a customer opens it. Edit a cell, and the website shows it within about 5 minutes.', None),
    ('', None),
    ('Rules that keep the calculator working', Font(bold=True, size=12)),
    ('1. Keep the tab names exactly: Prices, ZIPs, Settings, Promos. Keep the header row (row 1) of each tab.', None),
    ('2. Prices tab: one row per option and size. Columns after Paper are price breaks: the header is the number of homes, the cells are price per home.', None),
    ('   Add a break by adding a column (e.g. 75000). Add a size or a new option by adding a row. Delete a row to stop selling it.', None),
    ('   Keep prices as plain numbers with 3 decimals (0.187). A currency format that rounds to cents would round the price.', None),
    ('3. ZIPs tab: one row per ZIP you deliver to, with the city, county and number of homes. Customers can only pick these ZIPs.', None),
    ('4. Settings tab: change the Value column. Add a row like "24 mailings discount %" to offer another mailing choice.', None),
    ('5. Promos tab: Discount is "10%" (off the ad price) or "$49" (off the order). Delete a row to end a promo.', None),
    ('6. A new option name also needs a card description: send it to whoever maintains the site (js/config.js), or it shows with a plain drawing.', None),
    ('', None),
    ('Check your changes', Font(bold=True, size=12)),
    ('Open your calculator with #check at the end of the address (e.g. yoursite.com/direct-mail/#check). A panel lists what loaded and anything to fix.', None),
    ('', None),
    ('Sharing: File > Share > General access: "Anyone with the link" as Viewer. Only people you add as Editors can change prices.', NOTE),
]
for i, (t, f) in enumerate(lines, 1):
    c = start.cell(row=i, column=1, value=t)
    if f: c.font = f
    c.alignment = Alignment(wrap_text=False)
start.column_dimensions['A'].width = 140

p = raw['prices']
prices = [[p[0][0], p[0][1], p[0][2]] + [int(num(h)) for h in p[0][3:]]] + [r[:3] + [num(v) for v in r[3:]] for r in p[1:]]
ws = sheet(wb, 'Prices', prices, [28, 18, 30] + [11] * (len(prices[0]) - 3), lambda c, v: '0.000' if c > 3 else None)
for c in range(4, len(prices[0]) + 1):
    ws.cell(row=1, column=c).number_format = '#,##0'

z = raw['zips']
sheet(wb, 'ZIPs', [z[0]] + [[r[0], r[1], r[2], int(num(r[3]))] for r in z[1:]], [10, 22, 18, 12],
      lambda c, v: '00000' if c == 1 else ('#,##0' if c == 4 else None))
ws = wb['ZIPs']
for r in range(2, ws.max_row + 1):
    ws.cell(row=r, column=1).value = str(ws.cell(row=r, column=1).value).zfill(5)
    ws.cell(row=r, column=1).number_format = '@'

s = raw['settings']
sheet(wb, 'Settings', [s[0]] + [[r[0], num(r[1])] for r in s[1:]], [30, 12])

pr = raw['promos']
sheet(wb, 'Promos', pr, [16, 12, 30])

wb.save('price-sheet-template.xlsx')
print('wrote price-sheet-template.xlsx')
