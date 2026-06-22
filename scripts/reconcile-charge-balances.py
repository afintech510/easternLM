"""Reconcile charge-account customer balances against their orders.

For each charge account, compute the expected balance from the orders table:

    expected = sum(grand_total for unpaid orders)
             - sum(refund amounts on those unpaid orders)

Compares against `customers.current_balance_cents`. With --fix, writes the
correct value back. Without --fix, only reports drift.

Drift is caused when balance is mutated outside the four sanctioned code
paths (pos/checkout, pos/refund, accounts/mark-paid, statements/[id]).
The most common culprit is direct PATCH/INSERT of legacy orders that
bypass /api/pos/checkout's increment step.

Usage:
    SUPABASE_SERVICE_ROLE_KEY=... python scripts/reconcile-charge-balances.py
    SUPABASE_SERVICE_ROLE_KEY=... python scripts/reconcile-charge-balances.py --fix
    SUPABASE_SERVICE_ROLE_KEY=... python scripts/reconcile-charge-balances.py --fix --customer <uuid>
"""
import argparse
import json
import os
import sys
import urllib.parse
import urllib.request

SUPABASE_URL = "https://qnwevkgrhdrjqvvabcit.supabase.co"


def supa(path, params, srk, method="GET", body=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        method=method,
        headers={
            "apikey": srk,
            "Authorization": f"Bearer {srk}",
            "Content-Type": "application/json",
            "Prefer": "return=representation" if method in ("PATCH", "POST") else "",
        },
        data=json.dumps(body).encode() if body else None,
    )
    with urllib.request.urlopen(req) as r:
        text = r.read()
        return json.loads(text) if text else None


def fmt(cents):
    sign = "-" if cents < 0 else ""
    return f"{sign}${abs(cents)/100:>10,.2f}"


def expected_balance_for(customer_id, srk):
    """Sum unpaid orders' grand_total minus refund credits on those orders."""
    orders = supa("orders", {
        "customer_id": f"eq.{customer_id}",
        "payment_method": "eq.account",
        "account_paid_at": "is.null",
        "select": "grand_total_cents,refunds",
    }, srk)
    total = 0
    refunds = 0
    for o in orders:
        total += o["grand_total_cents"] or 0
        for r in (o["refunds"] or []):
            refunds += r.get("amount_cents", 0) or 0
    return total - refunds, len(orders), refunds


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fix", action="store_true", help="Write corrected balance back to customers table")
    ap.add_argument("--customer", help="Only reconcile this customer id (uuid)")
    ap.add_argument("--threshold-cents", type=int, default=1, help="Only flag drift >= this many cents")
    args = ap.parse_args()

    srk = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not srk:
        print("SUPABASE_SERVICE_ROLE_KEY env var required", file=sys.stderr)
        sys.exit(1)

    params = {
        "is_charge_account": "eq.true",
        "select": "id,charge_account_name,first_name,last_name,company_name,current_balance_cents",
        "order": "charge_account_name",
    }
    if args.customer:
        params["id"] = f"eq.{args.customer}"

    accounts = supa("customers", params, srk)
    print(f"Auditing {len(accounts)} charge account(s)\n")
    print(f"{'Customer':<35} {'Stored':>14} {'Expected':>14} {'Drift':>14} {'Orders':>7}")
    print("-" * 92)

    drift_count = 0
    drift_total = 0
    fixes = []

    for a in accounts:
        name = a["charge_account_name"] or a.get("company_name") or f"{a.get('first_name','')} {a.get('last_name','')}".strip() or a["id"][:8]
        stored = a["current_balance_cents"] or 0
        expected, order_count, refunds = expected_balance_for(a["id"], srk)
        drift = expected - stored
        if abs(drift) >= args.threshold_cents:
            drift_count += 1
            drift_total += drift
            marker = " <-- DRIFT"
            fixes.append((a["id"], name, stored, expected, drift))
        else:
            marker = ""
        print(f"{name[:34]:<35} {fmt(stored):>14} {fmt(expected):>14} {fmt(drift):>14} {order_count:>7}{marker}")

    print("-" * 92)
    print(f"\nAccounts with drift: {drift_count}/{len(accounts)}")
    print(f"Net drift across all accounts: {fmt(drift_total)}")

    if not args.fix:
        if drift_count:
            print(f"\nRun with --fix to sync {drift_count} account(s).")
        return

    if not fixes:
        print("\nNothing to fix.")
        return

    print(f"\nApplying fixes to {len(fixes)} account(s)...")
    for cid, name, stored, expected, drift in fixes:
        supa(
            "customers",
            {"id": f"eq.{cid}"},
            srk,
            method="PATCH",
            body={"current_balance_cents": expected, "updated_at": "now()"},
        )
        print(f"  {name[:34]:<35} {fmt(stored)} -> {fmt(expected)} (drift {fmt(drift)})")
    print("Done.")


if __name__ == "__main__":
    main()
