import type { ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "positive" | "notice" | "critical" | "pink";

export type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

/** Small status chip. NEW HOST uses neutral. */
export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[tone], className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}
