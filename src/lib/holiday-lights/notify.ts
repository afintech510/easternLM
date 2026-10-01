/** Staff email for holiday-lights leads (Resend). No-op when Resend isn't configured. */
export async function emailStaff(subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return;
  const { Resend } = await import("resend");
  await new Resend(apiKey).emails.send({ from: fromEmail, to: "sales@easternlm.com", subject, html });
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function formatPhone(phone: string): string {
  return phone.length === 10 ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}` : phone;
}
