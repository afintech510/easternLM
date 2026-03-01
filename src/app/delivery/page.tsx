import { siteConfig } from "@/config/site";

const rules = [
  "Delivery fees are calculated by address using actual drive distance and time.",
  "Orders placed before 11:00 AM on weekdays may qualify for same-day delivery.",
  "Minimum material subtotal is $125 for non-local delivery addresses.",
  "Local deliveries within 5 miles are exempt from minimum order value.",
  "Additional loads are discounted and scheduled one load per day per address.",
];

export default function DeliveryPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 md:py-16">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Delivery Info
        </p>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary md:text-5xl">
          Transparent Delivery Pricing For Every Address
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          We calculate delivery based on real route data from our yard at {siteConfig.addressLine1},{" "}
          {siteConfig.addressLine2}. No flat zones, no hidden fee layers.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">How Pricing Works</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {rules.map((rule) => (
              <li key={rule} className="rounded-lg bg-background px-4 py-3">
                {rule}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Service Notes</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>Delivery schedule is confirmed during checkout and in your order confirmation.</p>
            <p>
              Access limits like low wires, soft ground, or tight driveways should be noted before
              dispatch.
            </p>
            <p>Pickup is available during regular yard hours with faster checkout.</p>
          </div>
        </article>
      </section>
    </div>
  );
}
