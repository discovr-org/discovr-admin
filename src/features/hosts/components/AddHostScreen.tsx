"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { createHostAdmin } from "@/shared/utils/catalogApi";
import styles from "../styles/HostsScreen.module.css";

export function AddHostScreen() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [personName, setPersonName] = useState("");
  const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!businessName.trim() || !personName.trim() || !phone.trim()) {
      setError("Business, contact, and phone can't be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createHostAdmin({
        businessName: businessName.trim(),
        personName: personName.trim(),
        phone: phone.trim(),
        active,
      });
      router.push("/hosts");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't create host.");
      setSaving(false);
    }
  }

  return (
    <form className={styles.editPanel} onSubmit={onSave}>
      <div className={styles.editGrid}>
        <Input
          label="Business name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
        />
        <Input
          label="Person / desk"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          required
        />
        <Input
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <div className={styles.selectField}>
          <label className={styles.selectLabel} htmlFor="host-active">
            Status
          </label>
          <select
            id="host-active"
            className={styles.select}
            value={active ? "active" : "inactive"}
            onChange={(e) => setActive(e.target.value === "active")}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <div className={styles.editActions}>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Creating…" : "Create host"}
        </Button>
        <Button href="/hosts" variant="secondary">
          Cancel
        </Button>
      </div>
      {error ? (
        <p className={`t-body-sm ${styles.actionError}`} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
