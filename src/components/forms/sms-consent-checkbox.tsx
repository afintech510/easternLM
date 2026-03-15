"use client";

export function SmsConsentCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300"
      />
      <span className="text-muted-foreground leading-snug">
        I agree to receive text messages from Eastern Landscape &amp; Mason Supply
        regarding my order or inquiry. Message and data rates may apply. Message
        frequency varies. Reply STOP to opt out at any time.{" "}
        <a href="/privacy-policy" className="underline">Privacy Policy</a>
        {" | "}
        <a href="/terms#sms-terms" className="underline">SMS Terms</a>
      </span>
    </label>
  );
}
