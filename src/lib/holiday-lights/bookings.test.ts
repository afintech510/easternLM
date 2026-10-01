import type Stripe from "stripe";

// ── In-memory Supabase fake (just enough of the query builder) ─────────────
type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};
const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];

function builder(table: string) {
  const filters: ((r: Row) => boolean)[] = [];
  let patch: Row | null = null;
  const rows = () => (tables[table] ??= []);
  const run = () => {
    const hit = rows().filter((r) => filters.every((f) => f(r)));
    if (patch) hit.forEach((r) => Object.assign(r, patch));
    return hit;
  };
  const b = {
    select: () => b,
    update: (p: Row) => ((patch = p), b),
    eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), b),
    neq: (k: string, v: unknown) => (filters.push((r) => r[k] !== v), b),
    gte: () => b,
    order: () => b,
    maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
    then: (res: (v: { data: Row[]; error: null }) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve({ data: run(), error: null }).then(res, rej),
  };
  return b;
}

jest.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({
    from: (t: string) => builder(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      const w = tables.holiday_install_weeks.find((x) => x.id === args.p_week);
      if (w) w.reserved = (w.reserved as number) + 1;
      return { data: w?.reserved, error: null };
    },
  }),
}));
const sms = jest.fn(async () => ({ ok: true }));
jest.mock("@/lib/sms", () => ({ sendSms: (...a: unknown[]) => sms(...(a as [])) }));
jest.mock("@/lib/leads/engine", () => ({ logLeadActivity: jest.fn(async () => undefined) }));
const staffEmail = jest.fn(async () => undefined);
jest.mock("./notify", () => ({
  emailStaff: (...a: unknown[]) => staffEmail(...(a as [])),
  escapeHtml: (s: string) => s,
  formatPhone: (s: string) => s,
}));

import { handleHolidayDepositCompleted, remainingSpots } from "./bookings";

const stripe = {
  paymentIntents: { retrieve: jest.fn(async () => ({ payment_method: "pm_123" })) },
} as unknown as Stripe;

function session(over: Partial<Stripe.Checkout.Session> = {}) {
  return {
    id: "cs_test_1",
    payment_status: "paid",
    payment_intent: "pi_123",
    customer: "cus_123",
    amount_total: 19900,
    metadata: { type: "holiday_lights_deposit", design_id: "d1" },
    ...over,
  } as unknown as Stripe.Checkout.Session;
}

beforeEach(() => {
  tables.holiday_install_weeks = [{ id: "w1", label: "Nov 8 – Nov 14", capacity: 13, reserved: 2 }];
  tables.holiday_light_designs = [
    {
      id: "d1",
      token: "tok",
      name: "Pat Smith",
      phone: "6315550100",
      sms_consent: true,
      install_week_id: "w1",
      booking_status: "pending_deposit",
      lead_id: "lead1",
      build: null,
      price_breakdown: null,
    },
  ];
  tables.service_leads = [{ id: "lead1", status: "new" }];
  rpcCalls.length = 0;
  sms.mockClear();
  staffEmail.mockClear();
});

describe("handleHolidayDepositCompleted", () => {
  it("reserves the booking, counts the seat, saves Stripe ids and notifies", async () => {
    await handleHolidayDepositCompleted(session(), stripe);
    const d = tables.holiday_light_designs[0];
    expect(d).toMatchObject({
      booking_status: "reserved",
      stripe_customer_id: "cus_123",
      deposit_payment_intent_id: "pi_123",
      stripe_payment_method_id: "pm_123",
      deposit_cents: 19900,
    });
    expect(tables.holiday_install_weeks[0].reserved).toBe(3);
    expect(tables.service_leads[0].status).toBe("scheduled");
    expect(sms).toHaveBeenCalledTimes(1);
    expect(staffEmail).toHaveBeenCalledTimes(1);
  });

  it("is idempotent across duplicate webhook deliveries", async () => {
    await handleHolidayDepositCompleted(session(), stripe);
    await handleHolidayDepositCompleted(session(), stripe);
    expect(rpcCalls).toHaveLength(1);
    expect(tables.holiday_install_weeks[0].reserved).toBe(3);
    expect(sms).toHaveBeenCalledTimes(1);
  });

  it("ignores unpaid sessions and unknown bookings", async () => {
    await handleHolidayDepositCompleted(session({ payment_status: "unpaid" }), stripe);
    await handleHolidayDepositCompleted(session({ metadata: { type: "holiday_lights_deposit", design_id: "nope" } }), stripe);
    expect(rpcCalls).toHaveLength(0);
    expect(tables.holiday_light_designs[0].booking_status).toBe("pending_deposit");
  });
});

describe("remainingSpots", () => {
  it("subtracts paid seats and live holds, never below zero", () => {
    expect(remainingSpots(13, 2, 1)).toBe(10);
    expect(remainingSpots(12, 12, 3)).toBe(0);
  });
});
