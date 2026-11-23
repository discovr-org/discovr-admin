"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { ADMIN_SIGNED_OUT, readAdminToken, writeAdminToken } from "@/shared/utils/adminToken";
import { adminLogin } from "@/shared/utils/messagesApi";

/** Nothing in the admin shows until someone signs in. The API checks the token too; this is the front door. */
export function AdminGate({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null); // null until we've looked
  const [email, setEmail] = useState("admin@discovr.in");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(readAdminToken()));
    const out = () => setSignedIn(false);
    window.addEventListener(ADMIN_SIGNED_OUT, out);
    return () => window.removeEventListener(ADMIN_SIGNED_OUT, out);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      writeAdminToken(await adminLogin(email, password));
      setPassword("");
      setSignedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (signedIn === null) return null;
  if (signedIn) return <>{children}</>;

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "var(--space-5)" }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <h1 className="t-title-sm" style={{ margin: 0 }}>discovr admin</h1>
        <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error || undefined} />
        <Button type="submit" disabled={busy || !password}>{busy ? "Signing in" : "Sign in"}</Button>
      </form>
    </main>
  );
}
