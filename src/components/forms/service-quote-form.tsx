"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const SERVICE_OPTIONS = [
  { group: "Driveways", options: [
    { value: "gravel-driveway-new", label: "Gravel driveway — new installation" },
    { value: "gravel-driveway-resurface", label: "Gravel driveway — resurfacing / top-off" },
    { value: "paver-driveway", label: "Paver driveway installation" },
    { value: "driveway-edging", label: "Driveway edging (belgian block, metal, or timber)" },
    { value: "asphalt-prep", label: "Asphalt prep / grading" },
  ]},
  { group: "Landscaping", options: [
    { value: "landscaping-design", label: "Design & installation" },
    { value: "landscaping-grading-drainage", label: "Grading & drainage" },
    { value: "landscaping-sod-lawn", label: "Sod / lawn installation" },
    { value: "landscaping-retaining-wall", label: "Retaining wall" },
    { value: "landscaping-garden-beds", label: "Garden beds" },
  ]},
  { group: "Masonry", options: [
    { value: "masonry-patio", label: "Patio" },
    { value: "masonry-walkway", label: "Walkway" },
    { value: "masonry-retaining-wall", label: "Retaining wall" },
    { value: "masonry-fireplace", label: "Fireplace / outdoor kitchen" },
    { value: "masonry-veneer-steps", label: "Stone veneer / steps" },
  ]},
  { group: "Other", options: [
    { value: "property-maintenance", label: "Property maintenance" },
    { value: "other", label: "Other (describe below)" },
  ]},
];

const TIMELINE_OPTIONS = [
  { value: "asap", label: "ASAP / this week" },
  { value: "within-2-weeks", label: "Within 2 weeks" },
  { value: "within-a-month", label: "Within a month" },
  { value: "just-planning", label: "Just getting quotes / planning" },
];

const REFERRAL_OPTIONS = [
  { value: "google", label: "Google search" },
  { value: "drove-past", label: "Drove past the yard" },
  { value: "neighbor-friend", label: "Neighbor / friend referral" },
  { value: "contractor-referral", label: "Contractor referral" },
  { value: "facebook", label: "Facebook" },
  { value: "other", label: "Other" },
];

const quoteFormSchema = z.object({
  name: z.string().min(2, "Please enter your name."),
  phone: z.string().min(10, "Enter a valid 10-digit phone number.").max(20),
  email: z.string().email("Enter a valid email.").or(z.literal("")),
  address: z.string().min(3, "Enter your address or town."),
  serviceType: z.string().min(1, "Select a service type."),
  description: z.string().optional(),
  timeline: z.string().optional(),
  referralSource: z.string().optional(),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

type ServiceQuoteFormProps = {
  defaultServiceType?: string;
  serviceCategory?: "driveways" | "landscaping" | "masonry" | "maintenance";
};

export function ServiceQuoteForm({ defaultServiceType, serviceCategory }: ServiceQuoteFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      serviceType: defaultServiceType || "",
      description: "",
      timeline: "",
      referralSource: "",
    },
  });

  // Filter service options based on category
  const filteredOptions = serviceCategory
    ? SERVICE_OPTIONS.filter((g) => {
        if (serviceCategory === "driveways") return g.group === "Driveways" || g.group === "Other";
        if (serviceCategory === "landscaping") return g.group === "Landscaping" || g.group === "Other";
        if (serviceCategory === "masonry") return g.group === "Masonry" || g.group === "Other";
        if (serviceCategory === "maintenance") return g.group === "Other";
        return true;
      })
    : SERVICE_OPTIONS;

  const onSubmit = async (values: QuoteFormValues) => {
    setSubmitError(null);

    // Extract town from address if possible
    const town = values.address.split(",").length > 1
      ? values.address.split(",").slice(-2, -1)[0]?.trim() || null
      : null;

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          phone: values.phone.replace(/\D/g, ""),
          town,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Something went wrong.");
      }

      reset();
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-accent" />
        <h3 className="mt-4 text-xl font-semibold">Thanks! We&apos;ll call you within 1 business day.</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          We received your quote request and will reach out to schedule a site visit or provide an estimate.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setSubmitted(false)}
        >
          Submit Another Request
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border bg-card p-6">
      <div className="mb-2">
        <h3 className="text-lg font-semibold">Get a Free Quote</h3>
        <p className="text-sm text-muted-foreground">Tell us about your project and we&apos;ll provide a detailed estimate.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="quote-name">Name *</label>
          <Input id="quote-name" {...register("name")} placeholder="Your name" />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="quote-phone">Phone *</label>
          <Input id="quote-phone" type="tel" {...register("phone")} placeholder="(631) 555-1234" />
          {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="quote-email">Email</label>
          <Input id="quote-email" type="email" {...register("email")} placeholder="you@example.com" />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="quote-address">Address / Town *</label>
          <Input id="quote-address" {...register("address")} placeholder="123 Main St, Manorville" />
          {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address.message}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="quote-service">Service Type *</label>
        <select
          id="quote-service"
          {...register("serviceType")}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Select a service</option>
          {filteredOptions.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {errors.serviceType && <p className="mt-1 text-xs text-destructive">{errors.serviceType.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="quote-desc">Project Description</label>
        <Textarea id="quote-desc" rows={3} {...register("description")} placeholder="Briefly describe your project, approximate size, any special considerations..." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="quote-timeline">Preferred Timeline</label>
          <select
            id="quote-timeline"
            {...register("timeline")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select timeline</option>
            {TIMELINE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="quote-referral">How did you hear about us?</label>
          <select
            id="quote-referral"
            {...register("referralSource")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select one</option>
            {REFERRAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
        {isSubmitting ? "Submitting..." : "Request Free Quote"}
      </Button>

      {submitError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}
    </form>
  );
}
