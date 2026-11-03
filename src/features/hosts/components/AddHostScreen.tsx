"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { createHostAdmin, type HostCredit } from "@/shared/utils/catalogApi";
import { useToast } from "@/shared/components/Toast";
import styles from "../styles/HostsScreen.module.css";

export function AddHostScreen() {
  const toast = useToast();
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [personName, setPersonName] = useState("");
  const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true);
  const [credit, setCredit] = useState<HostCredit>("hosted");
  const [saving, setSaving] = useState(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!businessName.trim() || !personName.trim() || !phone.trim()) {
      toast.error("Business, contact, and phone can't be empty.");
      return;
    }
    setSaving(true);
    try {
      await createHostAdmin({
        businessName: businessName.trim(),
        personName: personName.trim(),
        phone: phone.trim(),
        active,
        credit,
      });
      toast.success("Host created.");
      router.push("/hosts");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't create host.");
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
          <label className={styles.selectLabel} htmlFor="host-credit">
            Credit line
          </label>
          <select
            id="host-credit"
            className={styles.select}
            value={credit}
            onChange={(e) => setCredit(e.target.value as HostCredit)}
          >
            <option value="hosted">Hosted by</option>
            <option value="run">Run by</option>
            <option value="owned">Owned by</option>
          </select>
        </div>
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
    </form>
  );
}
