"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

/** (631) 555-0123 mask, ported from the artifact. Strips a leading country code 1. */
export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
  let s = "";
  if (d.length > 0) s = "(" + d.slice(0, 3);
  if (d.length >= 3) s += ") ";
  if (d.length > 3) s += d.slice(3, 6);
  if (d.length > 6) s += "-" + d.slice(6);
  return s;
}

export function phoneDigits(v: string): string {
  return v.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
}

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> & {
  value: string;
  onValueChange: (v: string) => void;
};

export const PhoneInput = forwardRef<HTMLInputElement, Props>(function PhoneInput(
  { value, onValueChange, className = "input", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={className}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      placeholder="(631) 555-0123"
      value={value}
      onChange={(e) => onValueChange(maskPhone(e.target.value))}
      {...rest}
    />
  );
});
