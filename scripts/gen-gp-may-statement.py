"""Generate GP Landscape May 2026 charge-account statement.

Pulls all unpaid (account_paid_at IS NULL) orders for customer
0850986e-65aa-45cc-97b2-d538390eff0a, filters out refunded ones
(per Roseann's preference — hide refunded entirely), and renders an
HTML statement matching the April 2026 template.
"""
import os
import sys
import json
import urllib.request
import urllib.parse
from datetime import datetime

SUPABASE_URL = "https://qnwevkgrhdrjqvvabcit.supabase.co"
SRK = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or sys.argv[1]
CUSTOMER_ID = "0850986e-65aa-45cc-97b2-d538390eff0a"


def supa(path, params):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={
        "apikey": SRK,
        "Authorization": f"Bearer {SRK}",
    })
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def cents_to_usd(c):
    sign = "-" if c < 0 else ""
    return f"{sign}${abs(c)/100:,.2f}"


def short_id(order_id):
    return order_id[:8].upper()


orders = supa("orders", {
    "customer_id": f"eq.{CUSTOMER_ID}",
    "payment_method": "eq.account",
    "account_paid_at": "is.null",
    "order": "created_at.asc",
    "select": "id,created_at,materials_subtotal_cents,discount_amount_cents,tax_cents,grand_total_cents,status,refunds",
})

orders = [o for o in orders if o["status"] != "refunded"]
order_ids = [o["id"] for o in orders]

items_by_order = {}
CHUNK = 50
for i in range(0, len(order_ids), CHUNK):
    chunk = ",".join(order_ids[i:i+CHUNK])
    items = supa("order_items", {
        "order_id": f"in.({chunk})",
        "select": "order_id,product_name,quantity,unit",
        "order": "created_at.asc",
    })
    for it in items:
        items_by_order.setdefault(it["order_id"], []).append(it)


def fmt_qty(q):
    if q is None:
        return ""
    if float(q).is_integer():
        return str(int(q))
    return f"{q:g}"


def render_items(items):
    if not items:
        return ""
    lines = []
    for it in items:
        unit = it.get("unit") or ""
        qty = fmt_qty(it.get("quantity"))
        name = it.get("product_name") or ""
        unit_part = f" {unit}" if unit else ""
        lines.append(f"{qty}{unit_part} {name}".strip())
    return "<br>".join(lines)


def refund_amount(o):
    return sum(r.get("amount_cents", 0) for r in (o.get("refunds") or []))

total_subtotal = sum(o["materials_subtotal_cents"] or 0 for o in orders)
total_discount = sum(o["discount_amount_cents"] or 0 for o in orders)
total_tax = sum(o["tax_cents"] or 0 for o in orders)
total_refund_credits = sum(refund_amount(o) for o in orders)
total_due = sum((o["grand_total_cents"] or 0) - refund_amount(o) for o in orders)

rows_html = []
for o in orders:
    date = datetime.strptime(o["created_at"][:10], "%Y-%m-%d").strftime("%m/%d/%y")
    items_html = render_items(items_by_order.get(o["id"], []))
    subtotal = o["materials_subtotal_cents"] or 0
    discount = o["discount_amount_cents"] or 0
    tax = o["tax_cents"] or 0
    refund = refund_amount(o)
    total = (o["grand_total_cents"] or 0) - refund
    items_note = items_html
    if refund:
        items_note += f'<br><span style="color:#b00;">(Partial refund: -{cents_to_usd(refund)})</span>'
    rows_html.append(f"""<tr>
<td>{date}</td>
<td>{short_id(o['id'])}</td>
<td><div class="item-list">{items_note}</div></td>
<td class="right">{cents_to_usd(subtotal)}</td>
<td class="right">{'-' + cents_to_usd(discount) if discount else '—'}</td>
<td class="right">{cents_to_usd(tax)}</td>
<td class="right">{cents_to_usd(total)}</td>
</tr>""")

from datetime import date, timedelta
today = date.today()
earliest = min(datetime.strptime(o["created_at"][:10], "%Y-%m-%d").date() for o in orders)
latest = max(datetime.strptime(o["created_at"][:10], "%Y-%m-%d").date() for o in orders)
stmt_date = today.strftime("%B %-d, %Y") if os.name != "nt" else today.strftime("%B %#d, %Y")
period = f"{earliest.strftime('%B %#d' if os.name == 'nt' else '%B %-d')} – {latest.strftime('%B %#d, %Y' if os.name == 'nt' else '%B %-d, %Y')}"
due_date = (today + timedelta(days=30)).strftime("%B %#d, %Y" if os.name == "nt" else "%B %-d, %Y")

html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>GP Landscape Design - May 2026 Statement</title>
<style>
  @page {{ size: letter; margin: 0.5in; }}
  body {{ font-family: Arial, sans-serif; font-size: 11px; color: #222; max-width: 8in; margin: 0 auto; padding: 20px; }}
  .header {{ display: flex; justify-content: space-between; border-bottom: 3px solid #1a3a52; padding-bottom: 12px; margin-bottom: 18px; }}
  .header h1 {{ margin: 0; color: #1a3a52; font-size: 24px; }}
  .header .biz {{ text-align: right; font-size: 11px; line-height: 1.4; }}
  .stmt-info {{ display: flex; justify-content: space-between; margin: 18px 0; }}
  .stmt-info > div {{ width: 48%; }}
  .stmt-info h3 {{ margin: 0 0 6px; color: #1a3a52; font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 12px; }}
  th {{ background: #1a3a52; color: white; padding: 6px; text-align: left; font-size: 11px; }}
  td {{ padding: 5px 6px; border-bottom: 1px solid #eee; vertical-align: top; }}
  .right {{ text-align: right; }}
  .item-list {{ font-size: 10px; color: #555; padding-left: 8px; }}
  .totals {{ margin-top: 18px; margin-left: auto; width: 320px; font-size: 12px; }}
  .totals tr td {{ padding: 4px 8px; border: none; }}
  .totals .grand td {{ font-weight: bold; font-size: 14px; border-top: 2px solid #1a3a52; padding-top: 8px; color: #1a3a52; }}
  .footer {{ margin-top: 30px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 10px; color: #555; text-align: center; }}
  .balance-box {{ background: #fff8e1; border: 2px solid #d4a300; padding: 12px; margin: 18px 0; text-align: center; }}
  .balance-box .label {{ font-size: 11px; color: #665; }}
  .balance-box .amount {{ font-size: 22px; font-weight: bold; color: #1a3a52; margin-top: 4px; }}
  .payment-note {{ background: #f0f7ff; border-left: 3px solid #1a3a52; padding: 8px 12px; margin: 12px 0; font-size: 11px; }}
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>STATEMENT</h1>
    <div style="color:#666;margin-top:4px;">Charge Account Statement</div>
  </div>
  <div class="biz">
    <strong>Eastern Landscape &amp; Mason Supply</strong><br>
    110 Frowein Road<br>
    Center Moriches, NY 11934<br>
    (631) 874-6244<br>
    sales@easternbuilding.supply
  </div>
</div>

<div class="stmt-info">
  <div>
    <h3>Bill To</h3>
    <strong>GP Landscape Design</strong><br>
    Account: GPL<br>
    110 Frowein Rd<br>
    Center Moriches, NY 11934<br>
    <strong>ATTN:</strong> Roseann Bunshaft<br>
    roseann@gplandscapedesign.com<br>
    Payment Terms: Net 30
  </div>
  <div>
    <h3>Statement Details</h3>
    <strong>Statement Date:</strong> {stmt_date}<br>
    <strong>Period:</strong> {period}<br>
    <strong>Due Date:</strong> {due_date}<br>
    <strong>Payments Received YTD:</strong> Check #3372 ($5,695.22), Check #3412 ($7,011.27), Check #3450 ($3,762.09)
  </div>
</div>

<div class="payment-note">
  This statement lists every unpaid invoice on the account as of {stmt_date}.
  Recent payments have been credited and those invoices removed from the list.
</div>

<h3 style="color:#1a3a52;margin-top:20px;border-bottom:2px solid #1a3a52;padding-bottom:4px;">Activity ({len(orders)} orders)</h3>
<table>
<thead>
<tr>
  <th style="width:70px;">Date</th>
  <th style="width:80px;">Order #</th>
  <th>Items</th>
  <th class="right" style="width:75px;">Subtotal</th>
  <th class="right" style="width:65px;">Discount</th>
  <th class="right" style="width:65px;">Tax</th>
  <th class="right" style="width:85px;">Total</th>
</tr>
</thead>
<tbody>
{''.join(rows_html)}
</tbody>
</table>

<table class="totals">
<tr><td>Subtotal:</td><td class="right">{cents_to_usd(total_subtotal)}</td></tr>
<tr><td>Discount:</td><td class="right">-{cents_to_usd(total_discount)}</td></tr>
<tr><td>Tax (8.75%):</td><td class="right">{cents_to_usd(total_tax)}</td></tr>
<tr class="grand"><td>BALANCE DUE:</td><td class="right">{cents_to_usd(total_due)}</td></tr>
</table>

<div class="balance-box">
  <div class="label">TOTAL BALANCE DUE</div>
  <div class="amount">{cents_to_usd(total_due)}</div>
  <div style="font-size:10px;color:#665;margin-top:4px;">Payment due by {due_date} (Net 30)</div>
</div>

<div class="footer">
  Thank you for your business. Please make checks payable to Eastern Building Supply Inc.,
  PO Box 884, Eastport, NY 11941. Questions? Call (631) 874-6244 or email
  sales@easternbuilding.supply.
</div>

</body>
</html>
"""

out = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    f"GP_Landscape_Statement_{today.strftime('%Y%m%d')}.html",
)
with open(out, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Wrote {out}")
print(f"Orders: {len(orders)}")
print(f"Subtotal: {cents_to_usd(total_subtotal)}")
print(f"Discount: -{cents_to_usd(total_discount)}")
print(f"Tax:      {cents_to_usd(total_tax)}")
print(f"Total:    {cents_to_usd(total_due)}")
