import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  text: string;
  /** Usually a secondary <Button>. */
  action?: ReactNode;
  role?: "alert" | "status";
}

export function EmptyState({ icon, title, text, action, role }: EmptyStateProps) {
  return (
    <div className={styles.empty} role={role}>
      <span className={styles.icon}>{icon}</span>
      <h2 className={styles.title}>{title}</h2>
      <p className={`t-body-sm ${styles.text}`}>{text}</p>
      {action}
    </div>
  );
}
