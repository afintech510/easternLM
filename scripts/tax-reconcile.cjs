// Find orders where (materials + delivery - discount) * 0.0875 != tax_cents — to diagnose where the gap comes from.
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const fmt = (c) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

(async () => {
  const from = "2026-03-01T00:00:00Z", to = "2026-05-01T00:00:00Z";
  const all = [];
  let off = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, placed_at, status, payment_method, source, materials_subtotal_cents, delivery_total_cents, tax_cents, grand_total_cents, tax_exempt, discount_amount_cents")
      .gte("placed_at", from).lt("placed_at", to)
      .range(off, off + 999);
    if (error) { console.error(error); process.exit(1); }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    off += 1000;
  }
  // Filter to live non-COD per the v2 logic
  const isPending = (r) => ["pending","cancelled"].includes(r.status);
  const isRefunded = (r) => r.status === "refunded";
  const isCod = (r) => r.payment_method === "cod";
  const live = all.filter((r) => !isPending(r) && !isRefunded(r) && !isCod(r));

  let sumBase = 0, sumDelivery = 0, sumDisc = 0, sumTax = 0, sumExpectMatOnly = 0, sumExpectMatPlusDel = 0;
  const mismatches = [];
  for (const r of live) {
    if (r.tax_exempt) continue;
    const mat = r.materials_subtotal_cents ?? 0;
    const del = r.delivery_total_cents ?? 0;
    const dis = r.discount_amount_cents ?? 0;
    const tax = r.tax_cents ?? 0;
    sumBase += mat; sumDelivery += del; sumDisc += dis; sumTax += tax;
    sumExpectMatOnly += Math.round((mat - dis) * 0.0875);
    sumExpectMatPlusDel += Math.round((mat + del - dis) * 0.0875);

    const expA = Math.round((mat + del - dis) * 0.0875);     // mat+del taxable
    const expB = Math.round((mat - dis) * 0.0875);            // only mat taxable
    if (Math.abs(tax - expA) > 5 && Math.abs(tax - expB) > 5) {
      mismatches.push({ id: r.id.slice(0,8), pm: r.payment_method, source: r.source, mat, del, dis, tax, expA, expB });
    }
  }

  console.log("=== Aggregate (live non-COD, non-exempt, Mar+Apr) ===");
  console.log(`Materials:           ${fmt(sumBase)}`);
  console.log(`Delivery:            ${fmt(sumDelivery)}`);
  console.log(`Discount removed:    ${fmt(sumDisc)}`);
  console.log("");
  console.log(`Sum tax_cents (actual):                ${fmt(sumTax)}`);
  console.log(`Expected if taxable = mat+del-disc:    ${fmt(sumExpectMatPlusDel)}`);
  console.log(`Expected if taxable = mat-disc only:   ${fmt(sumExpectMatOnly)}`);
  console.log("");
  console.log(`Mismatches (>$0.05 from both formulas): ${mismatches.length}`);
  for (const m of mismatches.slice(0, 15)) {
    console.log(`  ${m.id} ${m.source}/${m.pm} mat ${fmt(m.mat)} del ${fmt(m.del)} disc ${fmt(m.dis)} tax ${fmt(m.tax)} expA ${fmt(m.expA)} expB ${fmt(m.expB)}`);
  }
})();
