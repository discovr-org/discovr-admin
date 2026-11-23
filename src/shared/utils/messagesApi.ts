import { requestJson } from "@/shared/utils/catalogApi";
import { apiBaseUrl } from "@/shared/utils/apiBase";

export type MessageTemplate = { id: string; label: string; body: string; variables: string[]; mediaUrl?: string };

export type MessagingUser = {
  id: string;
  name: string | null;
  phoneMasked: string;
  signedUpAt: string;
  tripStatus: "date" | "later" | "local" | "not_yet" | null;
  /** "YYYY-MM-DD" when they gave a last day in Goa. */
  lastDay: string | null;
  /** Fills a template's {{1}}, {{2}}... by name. */
  values: Record<string, string>;
  alreadySent: boolean;
};

export type UserFilters = { signedUp: "today" | "7d" | "all"; leavingWithinDays: number | null; templateId?: string };

export type SendResult = { userId: string; result: "accepted" | "skipped" | "failed"; reason?: string };
export type SentMessage = { id: string; userId: string; templateId: string; status: string; failedReason: string | null };

/** Email and password in, token out. Not an authed call, so it doesn't use requestJson. */
export async function adminLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${apiBaseUrl()}/v1/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json().catch(() => ({}))) as { token?: string; error?: { message?: string } };
  if (!res.ok || !body.token) throw new Error(body.error?.message ?? "Couldn't sign in. Try again.");
  return body.token;
}

export const fetchTemplates = () => requestJson<{ templates: MessageTemplate[] }>("/v1/admin/message-templates");

export function fetchMessagingUsers(f: UserFilters) {
  const q = new URLSearchParams({ signedUp: f.signedUp });
  if (f.leavingWithinDays !== null) q.set("leavingWithinDays", String(f.leavingWithinDays));
  if (f.templateId) q.set("templateId", f.templateId);
  return requestJson<{ users: MessagingUser[] }>(`/v1/admin/users?${q}`);
}

export const sendTemplate = (templateId: string, userIds: string[], allowRepeat: boolean) =>
  requestJson<{ batchId: string; results: SendResult[] }>("/v1/admin/messages/send", {
    method: "POST",
    body: JSON.stringify({ templateId, userIds, allowRepeat }),
  });

export const fetchBatch = (batchId: string, refresh: boolean) =>
  requestJson<{ messages: SentMessage[] }>(`/v1/admin/messages/${batchId}${refresh ? "?refresh=1" : ""}`);

/** The text a person will see, with {{n}} filled from this person's values. */
export const renderTemplate = (t: MessageTemplate, values: Record<string, string>) =>
  t.body.replace(/\{\{(\d+)\}\}/g, (_, n) => values[t.variables[Number(n) - 1] ?? ""] ?? "");
