"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/shared/components/EmptyState";
import { LayersIcon } from "@/shared/components/icons";
import { Input } from "@/shared/components/Input";
import { useToast } from "@/shared/components/Toast";
import { useCatalog } from "@/shared/utils/useCatalog";
import { Ic } from "@/features/listings/components/EditorIcon";
import { ListingLayers, type LayerItem, type Sel } from "@/features/listings/components/ListingLayers";
import { LivePreview } from "@/features/listings/components/LivePreview";
import { PaneHead } from "@/features/listings/components/PaneHead";
import { PART_ICON, layoutBlockIcon } from "@/features/listings/utils/layerIcons";
import { PART_META, readFixedShown, readSections, writeSections, type PartId, type SectionState } from "@/features/listings/utils/pageLayout";
import { ActionButtonsField } from "@/features/listings/components/ActionButtonsField";
import type { ActionButtonId } from "@/shared/utils/catalogApi";
import { downloadCsv } from "@/features/listings/utils/csv";
import { hintRow, sheetHeader } from "@/features/listings/utils/listingSheet";
import { moveBlock } from "@/features/listings/utils/storyBlocks";
import styles from "@/features/listings/styles/ListingEditor.module.css";
import { deleteCategory, fetchCategory, patchCategory } from "../utils/categoryApi";
import { LAYOUT_HALF_OK, LAYOUT_LABEL, LAYOUT_WIDGETS, layoutBlockLabel, type Category, type LayoutBlock } from "../utils/layout";
import { LayoutBlockEditor } from "./LayoutBlockEditor";

type Snap = { story: LayoutBlock[]; order: SectionState[]; fixed: { more: boolean; booking: boolean }; buttons: ActionButtonId[] | undefined };

/** Edit a category's layout: the order of the page, its story blocks, and which listing field each block shows. */
export function CategoryEditor({ id }: { id: string }) {
  const toast = useToast();
  const router = useRouter();
  const { experiences } = useCatalog();
  const [category, setCategory] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [story, setStory] = useState<LayoutBlock[]>([]);
  const [order, setOrder] = useState<SectionState[]>(() => readSections(undefined));
  const [fixed, setFixed] = useState({ more: true, booking: true });
  const [buttons, setButtons] = useState<ActionButtonId[] | undefined>(undefined);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sel, setSel] = useState<Sel>(null);
  const [tab, setTab] = useState<"widgets" | "edit">("edit");
  const [arranging, setArranging] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [scrollTo, setScrollTo] = useState<{ id: string; n: number } | null>(null);
  const [pickedSample, setSampleId] = useState("");
  // The listing the preview shows: the one picked, else the first.
  const sampleId = pickedSample || experiences?.[0]?.id || "";
  const [past, setPast] = useState<Snap[]>([]);
  const [future, setFuture] = useState<Snap[]>([]);
  const typing = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetchCategory(id)
      .then((c) => {
        if (cancelled) return;
        setCategory(c);
        setName(c.name);
        setSlug(c.slug);
        setStory((c.layout.story ?? []) as LayoutBlock[]);
        setButtons(c.layout.actionButtons);
        setOrder(readSections(c.layout.sections));
        setFixed({ more: readFixedShown(c.layout.sections, "more"), booking: readFixedShown(c.layout.sections, "booking") });
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Couldn't load this category."));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const snap = (): Snap => ({ story, order, fixed, buttons });
  function restore(s: Snap) {
    setStory(s.story);
    setOrder(s.order);
    setFixed(s.fixed);
    setButtons(s.buttons);
    setDirty(true);
    setSel(null);
  }
  function undo() {
    if (!past.length) return;
    setFuture((f) => [snap(), ...f]);
    setPast(past.slice(0, -1));
    restore(past[past.length - 1]);
  }
  function redo() {
    if (!future.length) return;
    setPast((p) => [...p, snap()]);
    setFuture(future.slice(1));
    restore(future[0]);
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const inField = (e.target as HTMLElement | null)?.closest("input, textarea, select");
      if (e.key === "Escape") return void (arranging ? setArranging(false) : !inField && setSel(null));
      if (inField || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /** One place that changes the layout, so each change is one undo step. */
  function apply(next: { story?: LayoutBlock[]; order?: SectionState[]; fixed?: Partial<typeof fixed>; buttons?: ActionButtonId[] | undefined }, to?: Sel, coalesce = false) {
    const quick = typing.current !== 0;
    window.clearTimeout(typing.current);
    typing.current = coalesce ? window.setTimeout(() => (typing.current = 0), 700) : 0;
    if (!(coalesce && quick)) {
      setPast((p) => [...p.slice(-119), snap()]);
      setFuture([]);
    }
    if (next.story) setStory(next.story);
    if (next.order) setOrder(next.order);
    if (next.fixed) setFixed({ ...fixed, ...next.fixed });
    if ("buttons" in next) setButtons(next.buttons);
    setDirty(true);
    if (to !== undefined) select(to);
  }
  function select(next: Sel) {
    setSel(next);
    setTab("edit");
  }

  async function onSave() {
    if (!category) return;
    if (!name.trim()) return void toast.error("Give the category a name.");
    if (category.listingCount && !window.confirm(`This changes the page for ${category.listingCount} listing${category.listingCount === 1 ? "" : "s"}. Save?`)) return;
    setSaving(true);
    try {
      const saved = await patchCategory(id, { name: name.trim(), slug: slug.trim(), layout: { sections: writeSections(order, fixed), story, actionButtons: buttons } });
      setCategory({ ...saved, listingCount: category.listingCount });
      setDirty(false);
      toast.success("Saved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!category || !window.confirm(`Delete the ${category.name} category?`)) return;
    try {
      await deleteCategory(id);
      router.push("/categories");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete.");
    }
  }

  if (error) return <EmptyState icon={<LayersIcon />} title="Can't load category" text={error} role="alert" />;
  if (!category) return <p style={{ padding: "var(--space-5)" }}>Loading category…</p>;

  const selPart = sel?.kind === "part" ? sel.id : null;
  const block = sel?.kind === "block" ? story[sel.index] : undefined;
  const items: LayerItem[] = story.map((b) => ({ label: layoutBlockLabel(b), type: LAYOUT_LABEL[b.type], icon: layoutBlockIcon(b), half: b.size === "half", hidden: b.show === false, partId: b.type === "part" ? b.id : undefined }));
  const pvId = (s: Sel): string | null => (s?.kind === "block" ? `block:${s.index}` : s?.kind === "part" && s.id !== "faqs" && s.id !== "tags" ? `part:${s.id}` : null);
  const selectFromLayers = (next: Sel) => {
    select(next);
    const pv = pvId(next);
    if (pv) setScrollTo((c) => ({ id: pv, n: (c?.n ?? 0) + 1 }));
  };
  const fromPv = (pv: string): Sel => (pv.startsWith("block:") ? { kind: "block", index: Number(pv.slice(6)) } : { kind: "part", id: pv.slice(5) as PartId });
  const dropIndex = (from: number, target: number, after: boolean) => {
    const at = target + (after ? 1 : 0);
    return from < at ? at - 1 : at;
  };
  const moveSection = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = order.slice();
    next.splice(to, 0, ...next.splice(from, 1));
    apply({ order: next });
  };
  const toggleSection = (sid: SectionState["id"]) => apply({ order: order.map((x) => (x.id === sid ? { ...x, show: !x.show } : x)) });
  const toggleBlock = (i: number) => apply({ story: story.map((b, j) => (j === i ? { ...b, show: b.show === false ? undefined : false } : b)) });
  const patchBlock = (i: number, b: LayoutBlock, coalesce = false) => apply({ story: story.map((x, j) => (j === i ? b : x)) }, undefined, coalesce);
  const widgetCard = (w: (typeof LAYOUT_WIDGETS)[number], i: number) => (
    <button
      key={w.name}
      type="button"
      className={styles.wcard}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/widget", String(i));
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => insertAt(sel?.kind === "block" ? sel.index + 1 : story.length, i)}
    >
      <div className={styles.wmeta}>
        <span className={styles.wname}>{w.name}</span>
        <span className={styles.chip}>{w.block.type === "part" ? "Part" : w.block.size === "half" ? "Half" : "Full"}</span>
      </div>
    </button>
  );
  const insertAt = (at: number, widget: number) => apply({ story: [...story.slice(0, at), structuredClone(LAYOUT_WIDGETS[widget].block), ...story.slice(at)] }, { kind: "block", index: at });
  const partShown = (pid: PartId) => (pid === "more" || pid === "booking" ? fixed[pid] : order.find((x) => x.id === pid)?.show);

  return (
    <div className={styles.app}>
      <header className={styles.top}>
        <Link
          href="/categories"
          className={styles.back}
          onClick={(e) => dirty && !window.confirm("You have unsaved changes. If you leave this category now, you'll lose them. Leave anyway?") && e.preventDefault()}
        >
          ← Categories
        </Link>
        <div className={styles.logo}>
          discovr<span className={styles.logoTag}>Admin</span>
        </div>
        <div className={styles.crumb}>
          / <span className={styles.crumbTitle}>{name.trim() || "Untitled category"}</span>
          <span className={styles.pill}>Category</span>
        </div>
        <div className={styles.spacer} />
        <span className={styles.saveState} role="status">
          {dirty ? "Unsaved changes" : "All changes saved"} · {category.listingCount ?? 0} listing{category.listingCount === 1 ? "" : "s"}
        </span>
        <button type="button" className={styles.ibtn} aria-label="Undo" title="Undo (⌘Z)" disabled={!past.length} onClick={undo}>
          <Ic name="undo" size={17} />
        </button>
        <button type="button" className={styles.ibtn} aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!future.length} onClick={redo}>
          <Ic name="redo" size={17} />
        </button>
        <button
          type="button"
          className={styles.btn}
          title="Download a sheet with the columns this layout needs"
          onClick={() => {
            const layout = { sections: writeSections(order, fixed), story, actionButtons: buttons };
            downloadCsv(`${slug.trim() || "category"}-sheet.csv`, [sheetHeader(layout), hintRow(layout)]);
          }}
        >
          <Ic name="file" size={15} />
          Export sheet
        </button>
        <Link
          href={`/listings/import?category=${id}`}
          className={styles.btn}
          onClick={(e) => dirty && !window.confirm("You have unsaved changes. Save the layout first so the import uses it. Leave anyway?") && e.preventDefault()}
        >
          Import listings
        </Link>
        <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={onDelete}>
          <Ic name="trash" size={15} />
          Delete
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving || !dirty} onClick={onSave}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </header>

      <div className={styles.main}>
        <ListingLayers
          sel={sel}
          onSel={selectFromLayers}
          hover={hoverId}
          onHover={setHoverId}
          items={items}
          order={order}
          fixed={fixed}
          venue={false}
          onMoveSection={moveSection}
          onToggleSection={toggleSection}
          onToggleFixed={(fid) => apply({ fixed: { [fid]: !fixed[fid] } })}
          onMoveBlock={(from, to) => {
            const next = moveBlock(story as never, from, to) as unknown as LayoutBlock[];
            apply({ story: next }, { kind: "block", index: to });
          }}
          onToggleBlock={toggleBlock}
          onDuplicate={(i) => apply({ story: [...story.slice(0, i + 1), structuredClone(story[i]), ...story.slice(i + 1)] }, { kind: "block", index: i + 1 })}
          onDelete={(i) => apply({ story: story.filter((_, j) => j !== i) }, null)}
          onAdd={() => setTab("widgets")}
          onStart={() => setTab("widgets")}
          onDropWidget={(w, at) => insertAt(at, w)}
        />

        <section className={styles.mid}>
          <div className={styles.tabs}>
            <button type="button" className={`${styles.tab} ${tab === "widgets" ? styles.tabOn : ""}`} onClick={() => setTab("widgets")}>
              <Ic name="widgets" size={15} />
              <span>Blocks</span>
            </button>
            <button type="button" className={`${styles.tab} ${tab === "edit" ? styles.tabOn : ""}`} onClick={() => setTab("edit")}>
              <Ic name="edit" size={15} />
              <span>{block ? `Edit · ${layoutBlockLabel(block)}` : selPart ? `Edit · ${PART_META[selPart].label}` : "Edit"}</span>
            </button>
          </div>
          <div className={styles.pane}>
            {tab === "widgets" ? (
              <div className={styles.lib}>
                <div className={styles.libTop}>
                  <h3 className={styles.paneTitle}>Blocks</h3>
                </div>
                <p className={styles.note}>Click one to add it after the selected block, or drag it onto Layers or the phone. Each block shows a field from the listing, and hides itself when that field is empty.</p>
                <div className={styles.group}>Story blocks</div>
                <div className={styles.widgetGrid}>{LAYOUT_WIDGETS.map((w, i) => (w.block.type === "part" ? null : widgetCard(w, i)))}</div>
                <div className={styles.group}>Page parts</div>
                <p className={styles.note}>Put a part of the page, like Menu or Reviews, in the middle of the story. It leaves its usual place and shows here.</p>
                <div className={styles.widgetGrid}>{LAYOUT_WIDGETS.map((w, i) => (w.block.type === "part" ? widgetCard(w, i) : null))}</div>
              </div>
            ) : null}

            {tab === "edit" && !sel ? (
              <div className={styles.paneInner}>
                <PaneHead icon="edit" title="Category" sub="Name it, then shape the layout in Layers." />
                <div className={styles.isec}>
                  <h4 className={styles.isecTitle}>Details</h4>
                  <div className={styles.isecBody}>
                    <Input
                      label="Name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setDirty(true);
                      }}
                    />
                    <Input
                      label="Slug"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setDirty(true);
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "edit" && block && sel?.kind === "block" ? (
              <div className={styles.paneInner}>
                <PaneHead icon={layoutBlockIcon(block)} title={layoutBlockLabel(block)} sub={LAYOUT_LABEL[block.type]} />
                {block.type === "part" && block.id === "actions" ? <ActionButtonsField value={buttons} onChange={(v) => apply({ buttons: v })} /> : null}
                {LAYOUT_HALF_OK.includes(block.type) ? (
                  <div className={styles.isec}>
                    <h4 className={styles.isecTitle}>Widget size</h4>
                    <div className={styles.seg} role="group" aria-label="Width">
                      <button type="button" className={block.size === "half" ? styles.segOn : ""} aria-pressed={block.size === "half"} onClick={() => patchBlock(sel.index, { ...block, size: "half" })}>
                        <span className={styles.szic}>
                          <i className="f" />
                          <i />
                        </span>
                        Half width
                      </button>
                      <button type="button" className={block.size !== "half" ? styles.segOn : ""} aria-pressed={block.size !== "half"} onClick={() => patchBlock(sel.index, { ...block, size: undefined })}>
                        <span className={styles.szic}>
                          <i className="f" />
                          <i className="f" />
                        </span>
                        Full width
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className={styles.isec}>
                  <h4 className={styles.isecTitle}>Content</h4>
                  <div className={styles.isecBody}>
                    <LayoutBlockEditor block={block} onChange={(b) => patchBlock(sel.index, b, true)} />
                  </div>
                </div>
                <div className={styles.ifoot}>
                  <button type="button" className={styles.btn} onClick={() => toggleBlock(sel.index)}>
                    <Ic name={block.show === false ? "eye" : "eyeoff"} size={15} />
                    {block.show === false ? "Show on page" : "Hide from page"}
                  </button>
                  <button type="button" className={styles.btn} disabled={sel.index === 0} onClick={() => apply({ story: moveBlock(story as never, sel.index, sel.index - 1) as unknown as LayoutBlock[] }, { kind: "block", index: sel.index - 1 })}>
                    <Ic name="up" size={15} />
                    Move up
                  </button>
                  <button type="button" className={styles.btn} disabled={sel.index === story.length - 1} onClick={() => apply({ story: moveBlock(story as never, sel.index, sel.index + 1) as unknown as LayoutBlock[] }, { kind: "block", index: sel.index + 1 })}>
                    <Ic name="chev" size={15} />
                    Move down
                  </button>
                  <button type="button" className={styles.btn} onClick={() => apply({ story: [...story.slice(0, sel.index + 1), structuredClone(block), ...story.slice(sel.index + 1)] }, { kind: "block", index: sel.index + 1 })}>
                    <Ic name="copy" size={15} />
                    Duplicate
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => apply({ story: story.filter((_, j) => j !== sel.index) }, null)}>
                    <Ic name="trash" size={15} />
                    Delete
                  </button>
                </div>
              </div>
            ) : null}

            {tab === "edit" && selPart ? (
              <div className={styles.paneInner}>
                <PaneHead icon={PART_ICON[selPart]} title={PART_META[selPart].label} sub={PART_META[selPart].hint} />
                <p className={styles.note}>
                  {selPart === "about"
                    ? "The About story is the blocks listed under it in Layers."
                    : selPart === "faqs" || selPart === "tags"
                      ? "These fields aren't part of the page layout."
                      : "The content of this part comes from the listing. Here you choose where it sits and whether it shows."}
                </p>
                {selPart === "actions" ? <ActionButtonsField value={buttons} onChange={(v) => apply({ buttons: v })} /> : null}
                {order.some((x) => x.id === selPart) ? (
                  <>
                    <label className={styles.area}>
                      <span className={styles.areaLabel}>Space above</span>
                      <select
                        className={styles.select}
                        value={order.find((x) => x.id === selPart)?.space ?? ""}
                        onChange={(ev) => apply({ order: order.map((x) => (x.id === selPart ? { ...x, space: (ev.target.value || undefined) as SectionState["space"] } : x)) })}
                      >
                        <option value="">Normal</option>
                        <option value="none">None (stick to the part above)</option>
                        <option value="large">Large</option>
                      </select>
                    </label>
                    <label className={styles.area}>
                      <span className={styles.areaLabel}>Hide on</span>
                      <select
                        className={styles.select}
                        value={order.find((x) => x.id === selPart)?.hide ?? ""}
                        onChange={(ev) => apply({ order: order.map((x) => (x.id === selPart ? { ...x, hide: (ev.target.value || undefined) as SectionState["hide"] } : x)) })}
                      >
                        <option value="">Nowhere (show everywhere)</option>
                        <option value="mobile">Phones</option>
                        <option value="desktop">Desktop</option>
                      </select>
                    </label>
                  </>
                ) : null}
                {partShown(selPart) !== undefined && selPart !== "faqs" && selPart !== "tags" ? (
                  <div className={styles.ifoot}>
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() => (selPart === "more" || selPart === "booking" ? apply({ fixed: { [selPart]: !fixed[selPart] } }) : toggleSection(selPart as SectionState["id"]))}
                    >
                      <Ic name={partShown(selPart) ? "eyeoff" : "eye"} size={15} />
                      {partShown(selPart) ? "Hide from page" : "Show on page"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className={styles.stage} aria-label="Mobile preview">
          <div className={styles.stagebar}>
            <div>
              <div className={styles.t}>Mobile preview</div>
              <div className={styles.s}>
                <select
                  className={styles.crumbSelect}
                  style={{ padding: "3px 26px 3px 8px", fontSize: 12 }}
                  aria-label="Preview with listing"
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                >
                  {(experiences ?? []).map((x) => (
                    <option key={x.id} value={x.id}>
                      Preview with {x.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="button" className={`${styles.btn} ${styles.btnSm} ${arranging ? styles.btnActive : ""}`} aria-pressed={arranging} onClick={() => setArranging(!arranging)}>
              <Ic name={arranging ? "check" : "move"} size={14} />
              {arranging ? "Done" : "Arrange"}
            </button>
          </div>
          {sampleId ? (
            <LivePreview
              id={sampleId}
              draft={{ categoryId: id, categoryLayout: { sections: writeSections(order, fixed), story, actionButtons: buttons } } as never}
              mediaKey=""
              selected={pvId(sel)}
              hover={hoverId}
              arranging={arranging}
              scrollTo={scrollTo}
              onSelect={(pv) => select(fromPv(pv))}
              onHover={setHoverId}
              onArrange={setArranging}
              onAdd={() => setTab("widgets")}
              onMove={(from, to, after) => {
                if (from.startsWith("block:")) {
                  const a = Number(from.slice(6));
                  const b = dropIndex(a, Number(to.slice(6)), after);
                  apply({ story: moveBlock(story as never, a, b) as unknown as LayoutBlock[] }, { kind: "block", index: b });
                } else {
                  const a = order.findIndex((x) => `part:${x.id}` === from);
                  moveSection(a, dropIndex(a, order.findIndex((x) => `part:${x.id}` === to), after));
                }
              }}
              onRemove={(pv) => {
                if (pv.startsWith("block:")) apply({ story: story.filter((_, j) => j !== Number(pv.slice(6))) }, null);
                else toggleSection(pv.slice(5) as SectionState["id"]);
              }}
            />
          ) : (
            <p className={styles.note} style={{ padding: "var(--space-5)" }}>
              Add a listing first, to preview this layout on it.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
