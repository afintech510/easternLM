import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  HardHat,
  Phone,
} from "lucide-react";
import { coreServices } from "@/config/content";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";

const serviceIcons: Record<string, React.ReactNode> = {
  landscaping: <span className="text-2xl">🌿</span>,
  masonry: <span className="text-2xl">🧱</span>,
  driveways: <span className="text-2xl">🛤️</span>,
  "property-maintenance": <span className="text-2xl">🏡</span>,
  "tree-services": <span className="text-2xl">🌲</span>,
};

const processSteps = [
  {
    number: "1",
    title: "Free Consultation",
    description:
      "We visit your property to discuss your vision, assess site conditions, and understand your goals.",
    icon: <ClipboardCheck className="size-5" />,
  },
  {
    number: "2",
    title: "Custom Proposal",
    description:
      "You receive a detailed scope, timeline, and transparent pricing — no surprises.",
    icon: <FileText className="size-5" />,
  },
  {
    number: "3",
    title: "Build & Install",
    description:
      "Our crew handles the work start to finish, using materials from our own yard.",
    icon: <HardHat className="size-5" />,
  },
];

export default function ServicesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary">
        <div className="topo-pattern absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Our Services
          </p>
          <h1 className="mt-3 max-w-3xl [font-family:var(--font-display)] text-3xl leading-tight text-primary-foreground md:text-5xl">
            Landscaping, Masonry & Driveway Services
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-primary-foreground/60 md:text-lg">
            We handle the full job — design, materials from our yard, and installation by our crew across Suffolk County.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90"
          >
            <Link href="/contact">
              Get a Free Estimate
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Services Grid */}
      <section className="bg-background py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            What We Do
          </p>
          <h2 className="mt-2 [font-family:var(--font-display)] text-3xl text-primary md:text-4xl">
            What We Build &amp; Maintain
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {coreServices.map((service) => (
              <Link
                key={service.slug}
                href={service.href ?? `/services/${service.slug}`}
                className="group rounded-2xl border bg-card p-8 transition-all hover:border-accent/30 hover:shadow-lg"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent/10">
                  {serviceIcons[service.slug]}
                </div>
                <h3 className="text-xl font-semibold text-foreground group-hover:text-accent">
                  {service.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
                <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-accent">
                  Learn More <ArrowRight className="size-3.5" />
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-warm-bg py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Our Process
            </p>
            <h2 className="mt-2 [font-family:var(--font-display)] text-3xl text-primary md:text-4xl">
              How It Works
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {processSteps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-accent text-xl font-bold text-accent-foreground">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-primary py-16 md:py-20">
        <div className="topo-pattern absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h2 className="[font-family:var(--font-display)] text-3xl text-primary-foreground md:text-4xl">
            Let&apos;s Talk About Your Project
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-primary-foreground/60">
            We&apos;ll come out, look at the site, and give you a straight price. No cost, no pressure.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground shadow-lg shadow-accent/25 hover:bg-accent/90"
            >
              <Link href="/contact">
                Schedule Your Free Estimate
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <a href={siteConfig.phoneHref}>
                <Phone className="size-4" />
                Call {siteConfig.phoneDisplay}
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <a href={siteConfig.smsHref}>Text Us</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
