"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { ImageUploadField } from "@/shared/components/ImageUploadField";
import { Input } from "@/shared/components/Input";
import { PlusIcon, UsersIcon } from "@/shared/components/icons";
import {
  deleteHostAdmin,
  patchHostAdmin,
  uploadHostAvatarAdmin,
  type CatalogHostSummary,
  type HostCredit,
} from "@/shared/utils/catalogApi";
import { patchHostLocal, removeHostLocal, useCatalog } from "@/shared/utils/useCatalog";
import { useToast } from "@/shared/components/Toast";
import styles from "../styles/HostsScreen.module.css";

type EditForm = {
  businessName: string;
  personName: string;
  phone: string;
  active: boolean;
  avatarUrl?: string;
  avatarAlt?: string;
  credit: HostCredit;
};

type ActiveFilter = "all" | "active" | "inactive";

export function HostsScreen() {
  const toast = useToast();
  const { hosts: rows, error, reload: load } = useCatalog();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

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
      credit: row.credit ?? "hosted",
    });
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
    void load();
    toast.success("Avatar uploaded.");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function onSave(e: FormEvent) {
    e.preventDefault();
    if (!editingId || !editForm) return;
    if (
      !editForm.businessName.trim() ||
      !editForm.personName.trim() ||
      !editForm.phone.trim()
    ) {
      toast.error("Business, contact, and phone can't be empty.");
      return;
    }
    const id = editingId;
    const patch = {
      businessName: editForm.businessName.trim(),
      personName: editForm.personName.trim(),
      phone: editForm.phone.trim(),
      active: editForm.active,
      credit: editForm.credit,
    };
    const undo = patchHostLocal(id, patch);
    toast.success("Host saved.");
    cancelEdit();
    patchHostAdmin(id, patch).catch((err: unknown) => {
      undo();
      toast.error(err instanceof Error ? err.message : "Couldn't save host. Put it back.");
    });
  }

  function setActive(row: CatalogHostSummary, active: boolean) {
    const undo = patchHostLocal(row.id, { active });
    toast.success(active ? "Host set active." : "Host set inactive.");
    patchHostAdmin(row.id, { active }).catch((err: unknown) => {
      undo();
      toast.error(err instanceof Error ? err.message : "Couldn't update host. Put it back.");
    });
  }

  function onDelete(row: CatalogHostSummary) {
    if (row.experienceCount > 0) {
      toast.error(
        `Delete or move this host's ${row.experienceCount} listing${row.experienceCount === 1 ? "" : "s"} first.`,
      );
      return;
    }
    if (!window.confirm(`Delete host “${row.businessName}”?`)) return;
    const undo = removeHostLocal(row.id);
    if (editingId === row.id) cancelEdit();
    toast.success("Host deleted.");
    deleteHostAdmin(row.id).catch((err: unknown) => {
      undo();
      toast.error(err instanceof Error ? err.message : "Couldn't delete host. Restored it.");
    });
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

  if (rows === null) {
    return <p className={`t-body-sm ${styles.meta}`}>Loading hosts…</p>;
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

      {editingId && editForm ? (
        <form className={styles.editPanel} onSubmit={onSave}>
          <h2 className={`t-title-sm ${styles.editTitle}`}>Edit host</h2>
          <ImageUploadField
            label="Avatar"
            previewUrl={editForm.avatarUrl}
            previewAlt={editForm.avatarAlt || editForm.personName}
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
              <label className={styles.selectLabel} htmlFor="edit-host-credit">
                Credit line
              </label>
              <select
                id="edit-host-credit"
                className={styles.select}
                value={editForm.credit}
                onChange={(e) =>
                  setEditForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          credit: e.target.value as HostCredit,
                        }
                      : prev,
                  )
                }
              >
                <option value="hosted">Hosted by</option>
                <option value="run">Run by</option>
                <option value="owned">Owned by</option>
              </select>
            </div>
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
            >
              Save host
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
                    >
                      {row.active ? "Set inactive" : "Set active"}
                    </button>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => startEdit(row)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => onDelete(row)}
                    >
                      Delete
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
