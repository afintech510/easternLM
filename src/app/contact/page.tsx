import { ContactForm } from "@/components/contact/contact-form";
import { siteConfig } from "@/config/site";

export default function ContactPage() {
  const mapQuery = encodeURIComponent(`${siteConfig.addressLine1}, ${siteConfig.addressLine2}`);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 md:py-16">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Contact
        </p>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary md:text-5xl">
          Request Materials, Delivery, Or Service Support
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Share your job details and our team will respond with the next steps, pricing guidance,
          and scheduling availability.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Yard Info</h2>
          <p className="text-sm text-muted-foreground">
            {siteConfig.addressLine1}
            <br />
            {siteConfig.addressLine2}
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={siteConfig.phoneHref} className="inline-flex items-center gap-1.5 rounded-lg border bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Call {siteConfig.phoneDisplay}
            </a>
            <a href={siteConfig.smsHref} className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-semibold hover:border-accent/40 hover:text-accent transition-colors">
              Text Us
            </a>
          </div>
          <p className="text-sm">
            Email:{" "}
            <a className="font-semibold text-primary hover:underline" href={`mailto:${siteConfig.email}`}>
              {siteConfig.email}
            </a>
          </p>
          <h3 className="pt-2 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Business Hours
          </h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {siteConfig.hours.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <iframe
            title="Eastern Landscape and Mason Supply map"
            src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
            className="h-64 w-full rounded-xl border"
            loading="lazy"
          />
        </div>
        <ContactForm />
      </section>
    </div>
  );
}
