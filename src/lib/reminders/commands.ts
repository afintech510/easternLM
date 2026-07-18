/**
 * Reminder command parser + handler.
 * Adam/Ronnie add reminders with `R <text>` / `REMIND <text>`, clear them with
 * `DONE <#>` / `DONE ALL`, and list them with `LIST` / `OPEN`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReminderUser } from "@/lib/reminders/config";

export type ReminderCommand =
  | { kind: "add"; body: string }
  | { kind: "done"; refs: number[] }
  | { kind: "done_all" }
  | { kind: "list" };

/**
 * Parse an inbound text into a reminder command, or null when it's not a
 * reminder command (fall through to existing lead behavior).
 */
export function parseReminderCommand(text: string): ReminderCommand | null {
  // DONE ALL — clear everything open
  if (/^\s*DONE\s+ALL\s*$/i.test(text)) {
    return { kind: "done_all" };
  }

  // DONE <#>[,# ...] — clear specific items
  const doneMatch = text.match(/^\s*DONE\s+(\d[\d,\s]*)\s*$/i);
  if (doneMatch) {
    const refs = doneMatch[1]
      .split(/[,\s]+/)
      .map((n) => parseInt(n, 10))
      .filter((n) => Number.isFinite(n));
    if (refs.length > 0) return { kind: "done", refs };
  }

  // LIST / OPEN — on-demand digest
  if (/^\s*(LIST|OPEN)\s*$/i.test(text)) {
    return { kind: "list" };
  }

  // R <text> / REMIND <text> — add a reminder
  const addMatch = text.match(/^\s*(?:R|REMIND)\b\s+([\s\S]+)/i);
  if (addMatch) {
    const body = addMatch[1].trim();
    if (body) return { kind: "add", body };
  }

  return null;
}

/**
 * Perform the DB action for a parsed command and return a short confirmation
 * string to text back to the sender.
 */
export async function handleReminderCommand(
  supabase: SupabaseClient,
  user: ReminderUser,
  cmd: ReminderCommand,
): Promise<string> {
  switch (cmd.kind) {
    case "add": {
      const { data, error } = await supabase
        .from("reminders")
        .insert({
          body: cmd.body,
          created_by: user.name,
          created_by_phone: user.phone,
          status: "open",
        })
        .select("ref_num")
        .single();

      if (error || !data) {
        console.error("[reminders] add failed:", error);
        return "Sorry, couldn't save that reminder. Try again.";
      }
      return `✓ Reminder #${data.ref_num} saved.`;
    }

    case "done": {
      const { data, error } = await supabase
        .from("reminders")
        .update({
          status: "done",
          completed_at: new Date().toISOString(),
          completed_by: user.name,
        })
        .in("ref_num", cmd.refs)
        .eq("status", "open")
        .select("ref_num");

      if (error) {
        console.error("[reminders] done failed:", error);
        return "Sorry, couldn't update those. Try again.";
      }
      const cleared = (data ?? []).map((r) => r.ref_num).sort((a, b) => a - b);
      if (cleared.length === 0) {
        return `No open reminders matched #${cmd.refs.join(", #")}.`;
      }
      return `✓ #${cleared.join(", #")} done.`;
    }

    case "done_all": {
      const { data, error } = await supabase
        .from("reminders")
        .update({
          status: "done",
          completed_at: new Date().toISOString(),
          completed_by: user.name,
        })
        .eq("status", "open")
        .select("ref_num");

      if (error) {
        console.error("[reminders] done_all failed:", error);
        return "Sorry, couldn't clear the list. Try again.";
      }
      const count = (data ?? []).length;
      return count > 0
        ? `✓ Cleared all ${count} open reminder${count === 1 ? "" : "s"}.`
        : "No open reminders to clear.";
    }

    case "list": {
      const { data, error } = await supabase
        .from("reminders")
        .select("ref_num, body")
        .eq("status", "open")
        .order("ref_num");

      if (error) {
        console.error("[reminders] list failed:", error);
        return "Sorry, couldn't load the list. Try again.";
      }
      const items = data ?? [];
      if (items.length === 0) return "No open reminders. ✓";
      const lines = items.map((r) => `#${r.ref_num} ${r.body}`).join("\n");
      return `${items.length} open:\n${lines}`;
    }
  }
}
