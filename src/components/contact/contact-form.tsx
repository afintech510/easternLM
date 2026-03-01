"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const contactFormSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  email: z.string().email("Enter a valid email address."),
  phone: z
    .string()
    .min(10, "Enter a valid phone number.")
    .max(20, "Enter a valid phone number."),
  projectType: z.string().min(1, "Select a project type."),
  message: z.string().min(20, "Add at least 20 characters so we can help."),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const defaultValues: ContactFormValues = {
  fullName: "",
  email: "",
  phone: "",
  projectType: "",
  message: "",
};

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues,
  });

  const onSubmit = async (values: ContactFormValues) => {
    console.info("Contact form submitted", values);
    await new Promise((resolve) => setTimeout(resolve, 500));
    reset(defaultValues);
    setSubmitted(true);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border bg-card p-6">
      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="fullName">
          Full Name
        </label>
        <Input id="fullName" {...register("fullName")} />
        {errors.fullName ? <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="email">
            Email
          </label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email ? <p className="mt-1 text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="phone">
            Phone
          </label>
          <Input id="phone" type="tel" {...register("phone")} />
          {errors.phone ? <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p> : null}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="projectType">
          Project Type
        </label>
        <select
          id="projectType"
          {...register("projectType")}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Select one
          </option>
          <option value="material-order">Material Order</option>
          <option value="delivery-question">Delivery Question</option>
          <option value="landscaping">Landscaping Service</option>
          <option value="masonry">Masonry Service</option>
          <option value="driveways">Driveways</option>
          <option value="maintenance">Property Maintenance</option>
        </select>
        {errors.projectType ? (
          <p className="mt-1 text-xs text-destructive">{errors.projectType.message}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="message">
          Message
        </label>
        <Textarea id="message" rows={5} {...register("message")} />
        {errors.message ? <p className="mt-1 text-xs text-destructive">{errors.message.message}</p> : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Sending..." : "Send Request"}
      </Button>
      {submitted ? (
        <p className="text-sm text-primary">Thanks. We received your request and will follow up shortly.</p>
      ) : null}
    </form>
  );
}
