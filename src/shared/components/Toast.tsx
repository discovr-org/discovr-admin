"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./Toast.module.css";

type Tone = "success" | "error";
type ToastItem = { id: number; text: string; tone: Tone };
type ToastApi = { success: (text: string) => void; error: (text: string) => void };

const ToastContext = createContext<ToastApi | null>(null);

const SHOW_MS = { success: 3000, error: 6000 } as const;

/** One stack of toasts for the whole admin; survives route changes. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (text: string, tone: Tone) => {
      const id = ++nextId.current;
      setItems((prev) => [...prev.slice(-2), { id, text, tone }]);
      window.setTimeout(() => dismiss(id), SHOW_MS[tone]);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => push(text, "success"),
      error: (text) => push(text, "error"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region} aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={styles.toast}
            data-tone={t.tone}
            role={t.tone === "error" ? "alert" : "status"}
          >
            <span className={styles.text}>{t.text}</span>
            <button
              type="button"
              className={styles.close}
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast needs <ToastProvider>.");
  return api;
}
