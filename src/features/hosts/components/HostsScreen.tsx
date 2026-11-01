"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { ImageUploadField } from "@/shared/components/ImageUploadField";
import { Input } from "@/shared/components/Input";
import { PlusIcon, UsersIcon } from "@/shared/components/icons";
import {
  deleteHostAdmin,
  fetchHosts,
  patchHostAdmin,
  uploadHostAvatarAdmin,
  type CatalogHostSummary,
} from "@/shared/utils/catalogApi";
import styles from "../styles/HostsScreen.module.css";

type EditForm = {
  businessName: string;
  personName: string;
  phone: string;
  active: boolean;
  avatarUrl?: string;
  avatarAlt?: string;
};

type ActiveFilter = "all" | "active" | "inactive";

export function HostsScreen() {
  const [rows, setRows] = useState<CatalogHostSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  const load = useCallback(() => {
    setError(null);
    return fetchHosts()
      .then((body) => setRows(body.hosts))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Couldn't load hosts.");
        setRows([]);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchHosts()
      .then((body) => {
        if (!cancelled) setRows(body.hosts);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load hosts.");
          setRows([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return (rows ?? []).filter((row) => {
      if (activeFilter === "active") return row.active;
      if (activeFilter === "inactive") return !row.active;
      return true;
    });
  }, [rows, activeFilter]);

  function startEdit(row: CatalogHostSummary) {
    setEditingId(row.id);
    setEditForm({
      businessName: row.businessName,
      personName: row.personName,
      phone: row.phone,
      active: row.active,
      avatarUrl: row.avatarUrl,
      avatarAlt: row.avatarAlt,
    });
    setActionError(null);
    setMessage(null);
  }

  async function onAvatarUpload(file: File) {
    if (!editingId || !editForm) return;
    const saved = await uploadHostAvatarAdmin(
      editingId,
      file,
      editForm.personName.trim() || editForm.businessName.trim(),
    );
    setEditForm((prev) =>
      prev
        ? {
            ...prev,
            avatarUrl: saved.avatarUrl,
            avatarAlt: saved.avatarAlt,
          }
        : prev,
    );
    setRows((prev) =>
      prev
        ? prev.map((row) =>
            row.id === saved.id
              ? {
                  ...row,
                  avatarUrl: saved.avatarUrl,
                  avatarAlt: saved.avatarAlt,
                }
              : row,
          )
        : prev,
    );
    setMessage("Avatar uploaded.");
    setActionError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!editingId || !editForm) return;
    if (
      !editForm.businessName.trim() ||
      !editForm.personName.trim() ||
      !editForm.phone.trim()
    ) {
      setActionError("Business, contact, and phone can't be empty.");
      return;
    }
    setBusyId(editingId);
    setActionError(null);
    try {
      await patchHostAdmin(editingId, {
        businessName: editForm.businessName.trim(),
        personName: editForm.personName.trim(),
        phone: editForm.phone.trim(),
        active: editForm.active,
      });
      setMessage("Host saved.");
      setEditingId(null);
      setEditForm(null);
      await load();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Couldn't save host.");
    } finally {
      setBusyId(null);
    }
  }

  async function setActive(row: CatalogHostSummary, active: boolean) {
    setBusyId(row.id);
    setActionError(null);
    try {
      await patchHostAdmin(row.id, { active });
      setMessage(active ? "Host set active." : "Host set inactive.");
      await load();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Couldn't update host.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(row: CatalogHostSummary) {
    if (row.experienceCount > 0) {
      setActionError(
        `Delete or move this host's ${row.experienceCount} listing${row.experienceCount === 1 ? "" : "s"} first.`,
      );
      return;
    }
    if (!window.confirm(`Delete host “${row.businessName}”?`)) return;
    setBusyId(row.id);
    setActionError(null);
    try {
      await deleteHostAdmin(row.id);
      if (editingId === row.id) cancelEdit();
      setMessage("Host deleted.");
      await load();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Couldn't delete host.");
    } finally {
      setBusyId(null);
    }
  }

  if (rows === null) {
    return <p className={`t-body-sm ${styles.meta}`}>Loading hosts…</p>;
  }

  if (error) {
    return (
      <EmptyState
        icon={<UsersIcon />}
        title="Can't reach the API"
        text={`${error} Start discovr-backend on 8080.`}
        role="alert"
      />
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon />}
        title="No hosts yet"
        text="Add a host, then attach listings."
        action={
          <Button href="/hosts/new" variant="primary" icon={<PlusIcon />}>
            Add host
          </Button>
        }
      />
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.head}>
        <p className={`t-body-sm ${styles.meta}`}>
          {filtered.length} of {rows.length} from catalog API
        </p>
        <Button href="/hosts/new" variant="secondary" icon={<PlusIcon />}>
          Add host
        </Button>
      </div>

      <div className={styles.filters}>
        <label className={styles.selectField}>
          <span className={styles.selectLabel}>Status</span>
          <select
            className={styles.select}
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      {message ? <p className={`t-body-sm ${styles.message}`}>{message}</p> : null}
      {actionError ? (
        <p className={`t-body-sm ${styles.actionError}`} role="alert">
          {actionError}
        </p>
      ) : null}

      {editingId && editForm ? (
        <form className={styles.editPanel} onSubmit={onSave}>
          <h2 className={`t-title-sm ${styles.editTitle}`}>Edit host</h2>
          <ImageUploadField
            label="Avatar"
            previewUrl={editForm.avatarUrl}
            previewAlt={editForm.avatarAlt || editForm.personName}
            disabled={busyId === editingId}
            onUpload={onAvatarUpload}
          />
          <div className={styles.editGrid}>
            <Input
              label="Business"
              value={editForm.businessName}
              onChange={(e) =>
                setEditForm((prev) =>
                  prev ? { ...prev, businessName: e.target.value } : prev,
                )
              }
              required
            />
            <Input
              label="Contact"
              value={editForm.personName}
              onChange={(e) =>
                setEditForm((prev) =>
                  prev ? { ...prev, personName: e.target.value } : prev,
                )
              }
              required
            />
            <Input
              label="Phone"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((prev) =>
                  prev ? { ...prev, phone: e.target.value } : prev,
                )
              }
              required
            />
            <div className={styles.selectField}>
              <label className={styles.selectLabel} htmlFor="edit-host-active">
                Status
              </label>
              <select
                id="edit-host-active"
                className={styles.select}
                value={editForm.active ? "active" : "inactive"}
                onChange={(e) =>
                  setEditForm((prev) =>
                    prev
                      ? { ...prev, active: e.target.value === "active" }
                      : prev,
                  )
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className={styles.editActions}>
            <Button
              type="submit"
              variant="primary"
              disabled={busyId === editingId}
            >
              {busyId === editingId ? "Saving…" : "Save host"}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <div className={styles.panel}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Business</th>
              <th scope="col">Contact</th>
              <th scope="col">Phone</th>
              <th scope="col">Status</th>
              <th scope="col">Listings</th>
              <th scope="col">
                <span className={styles.srOnly}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>
                  <p className={styles.title}>{row.businessName}</p>
                </td>
                <td>{row.personName}</td>
                <td className={styles.phone}>{row.phone}</td>
                <td>
                  <Badge tone={row.active ? "positive" : "notice"}>
                    {row.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td>{row.experienceCount}</td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => setActive(row, !row.active)}
                      disabled={busyId === row.id}
                    >
                      {row.active ? "Set inactive" : "Set active"}
                    </button>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => startEdit(row)}
                      disabled={busyId === row.id}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => onDelete(row)}
                      disabled={busyId === row.id}
                    >
                      {busyId === row.id ? "…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
