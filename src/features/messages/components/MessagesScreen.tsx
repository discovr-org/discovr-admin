"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, type BadgeTone } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { InboxIcon } from "@/shared/components/icons";
import { useToast } from "@/shared/components/Toast";
import {
  fetchBatch,
  fetchMessagingUsers,
  fetchTemplates,
  renderTemplate,
  sendTemplate,
  type MessageTemplate,
  type MessagingUser,
  type SendResult,
  type SentMessage,
} from "@/shared/utils/messagesApi";
import styles from "../styles/MessagesScreen.module.css";

type Who = "today" | "7d" | "all" | "goa";
const WHO: { id: Who; label: string }[] = [
  { id: "today", label: "Signed up today" },
  { id: "7d", label: "Signed up, last 7 days" },
  { id: "all", label: "Everyone" },
  { id: "goa", label: "In Goa, leaving soon" },
];
const GOA_DAYS = [0, 1, 2, 3, 5, 7, 14, 30];
/** Shown in the preview when nobody is picked. */
const SAMPLE = { firstName: "Aisha", lastDay: "15 Nov", daysLeft: "2" };

const STATUS_TONE: Record<string, BadgeTone> = { READ: "positive", REPLIED: "positive", DELIVERED: "positive", SENT: "neutral", accepted: "neutral", FAILED: "critical" };

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const tripLabel = (u: MessagingUser) =>
  u.tripStatus === "date" && u.lastDay ? `Leaves ${dayLabel(u.lastDay)}` : u.tripStatus === "local" ? "Lives here" : u.tripStatus === "later" ? "Staying longer" : u.tripStatus === "not_yet" ? "Not in Goa yet" : "Not asked";

export function MessagesScreen() {
  const toast = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[] | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [who, setWho] = useState<Who>("today");
  const [goaDays, setGoaDays] = useState(3);
  const [users, setUsers] = useState<MessagingUser[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ batchId: string; results: SendResult[]; messages: SentMessage[] } | null>(null);

  useEffect(() => {
    fetchTemplates()
      .then(({ templates: t }) => {
        setTemplates(t);
        setTemplateId((id) => id || t[0]?.id || "");
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't load templates."));
  }, [toast]);

  // Who matches. Everyone found is ticked, except people who already got this template.
  const load = useCallback(() => {
    setUsers(null);
    setConfirming(false);
    fetchMessagingUsers({
      signedUp: who === "goa" ? "all" : who,
      leavingWithinDays: who === "goa" ? goaDays : null,
      templateId: templateId || undefined,
    })
      .then(({ users: rows }) => {
        setUsers(rows);
        setPicked(new Set(rows.filter((u) => !u.alreadySent).map((u) => u.id)));
      })
      .catch((e: unknown) => {
        setUsers([]);
        toast.error(e instanceof Error ? e.message : "Couldn't load people.");
      });
  }, [who, goaDays, templateId, toast]);
  useEffect(load, [load]);

  const template = templates?.find((t) => t.id === templateId);
  const chosen = useMemo(() => (users ?? []).filter((u) => picked.has(u.id)), [users, picked]);
  const repeats = chosen.filter((u) => u.alreadySent).length;
  const previewUser = chosen[0];
  const preview = template ? renderTemplate(template, previewUser?.values ?? SAMPLE) : "";

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send() {
    if (!template) return;
    setSending(true);
    try {
      const { batchId, results } = await sendTemplate(template.id, chosen.map((u) => u.id), allowRepeat);
      setSent({ batchId, results, messages: [] });
      setConfirming(false);
      const ok = results.filter((r) => r.result === "accepted").length;
      const bad = results.filter((r) => r.result === "failed").length;
      (bad ? toast.error : toast.success)(`${ok} sent${bad ? `, ${bad} failed` : ""}.`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send. Nothing was sent.");
    } finally {
      setSending(false);
    }
  }

  async function refresh() {
    if (!sent) return;
    try {
      const { messages } = await fetchBatch(sent.batchId, true);
      setSent({ ...sent, messages });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't refresh.");
    }
  }

  if (templates && !templates.length) {
    return (
      <EmptyState
        icon={<InboxIcon />}
        title="No templates yet"
        text="Add an approved BotSpace template in the backend (communication/domain/templates.ts) and it will show up here."
      />
    );
  }

  const nameOf = (id: string) => users?.find((u) => u.id === id)?.name ?? "Guest";

  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <h2 className={styles.h}>1. Who</h2>
        <div className={styles.chips} role="radiogroup" aria-label="Who to message">
          {WHO.map((w) => (
            <button key={w.id} type="button" role="radio" aria-checked={who === w.id} className={styles.chip} onClick={() => setWho(w.id)}>
              {w.label}
            </button>
          ))}
          {who === "goa" ? (
            <label className={styles.inline}>
              last day within
              <select value={goaDays} onChange={(e) => setGoaDays(Number(e.target.value))} className={styles.select}>
                {GOA_DAYS.map((d) => (
                  <option key={d} value={d}>{d === 0 ? "today" : `${d} days`}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.h}>2. Template</h2>
        <div className={styles.templateRow}>
          <select aria-label="Template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={styles.select}>
            {(templates ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <div className={styles.phone} aria-label="Preview">
            <div className={styles.bubble}>{preview || "Pick a template"}</div>
            <p className={styles.previewNote}>{previewUser ? `Preview for ${previewUser.name ?? "a guest"}` : "Preview with sample values"}</p>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.listHead}>
          <h2 className={styles.h}>3. People {users ? `(${picked.size} of ${users.length} picked)` : ""}</h2>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setPicked(new Set((users ?? []).map((u) => u.id)))}>Select all</Button>
            <Button variant="secondary" onClick={() => setPicked(new Set())}>Clear all</Button>
          </div>
        </div>
        {users === null ? (
          <p className={styles.meta}>Loading</p>
        ) : users.length === 0 ? (
          <p className={styles.meta}>Nobody matches this filter.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr><th /><th>Name</th><th>Phone</th><th>Signed up</th><th>Trip</th><th /></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><input type="checkbox" aria-label={`Pick ${u.name ?? "guest"}`} checked={picked.has(u.id)} onChange={() => toggle(u.id)} /></td>
                  <td>{u.name ?? <span className={styles.meta}>No name yet</span>}</td>
                  <td className={styles.nowrap}>{u.phoneMasked}</td>
                  <td className={styles.nowrap}>{dayLabel(u.signedUpAt.slice(0, 10))}</td>
                  <td>{tripLabel(u)}</td>
                  <td>{u.alreadySent ? <Badge tone="notice">Already got this</Badge> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.panel}>
        {confirming && template ? (
          <div className={styles.confirm}>
            <p className={styles.confirmText}>
              Send “{template.label}” to {chosen.length} {chosen.length === 1 ? "person" : "people"} on WhatsApp? This can't be undone.
            </p>
            {repeats > 0 ? (
              <label className={styles.inline}>
                <input type="checkbox" checked={allowRepeat} onChange={(e) => setAllowRepeat(e.target.checked)} />
                Send again to the {repeats} who already got it (otherwise they are skipped)
              </label>
            ) : null}
            <div className={styles.actions}>
              <Button onClick={send} disabled={sending}>{sending ? "Sending" : `Yes, send to ${chosen.length}`}</Button>
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={sending}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setConfirming(true)} disabled={!template || chosen.length === 0}>
            {chosen.length ? `Send to ${chosen.length}` : "Pick people to send to"}
          </Button>
        )}
      </section>

      {sent ? (
        <section className={styles.panel}>
          <div className={styles.listHead}>
            <h2 className={styles.h}>Last send</h2>
            <Button variant="secondary" onClick={refresh}>Refresh status</Button>
          </div>
          <table className={styles.table}>
            <thead><tr><th>Name</th><th>Result</th><th>Now</th></tr></thead>
            <tbody>
              {sent.results.map((r) => {
                const live = sent.messages.find((m) => m.userId === r.userId);
                const status = live?.status ?? (r.result === "accepted" ? "accepted" : r.result === "failed" ? "FAILED" : null);
                return (
                  <tr key={r.userId}>
                    <td>{nameOf(r.userId)}</td>
                    <td>{r.result === "accepted" ? "Handed to WhatsApp" : r.result === "skipped" ? "Skipped" : "Failed"}{r.reason ? `: ${r.reason}` : ""}</td>
                    <td>{status ? <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status}</Badge> : null}{live?.failedReason ? ` ${live.failedReason}` : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
