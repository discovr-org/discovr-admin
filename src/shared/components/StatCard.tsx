import type { ReactNode } from "react";
import styles from "./StatCard.module.css";

type Tone = "bone" | "positive" | "notice" | "critical" | "muted";

type Props = {
  label: string;
  value: string;
  change?: string;
  changeTone?: "up" | "down" | "flat";
  subtext?: string;
  icon?: ReactNode;
  iconTone?: Tone;
  bars?: number[];
  progress?: number;
  progressTone?: Tone;
};

export function StatCard({
  label,
  value,
  change,
  changeTone = "flat",
  subtext,
  icon,
  iconTone = "muted",
  bars,
  progress,
  progressTone = "positive",
}: Props) {
  return (
    <article className={styles.card}>
      <div className={styles.stat}>
        {icon ? (
          <div className={[styles.icon, styles[`icon_${iconTone}`]].join(" ")}>
            {icon}
          </div>
        ) : null}
        <div className={styles.content}>
          <p className={`t-caption ${styles.label}`}>{label}</p>
          <div className={styles.valueRow}>
            <p className={styles.value}>{value}</p>
            {change ? (
              <span className={[styles.change, styles[changeTone]].join(" ")}>
                {change}
              </span>
            ) : null}
          </div>
          {subtext ? (
            <p className={`t-body-sm ${styles.subtext}`}>{subtext}</p>
          ) : null}
        </div>
        {bars && bars.length > 0 ? (
          <div className={styles.spark} aria-hidden>
            {bars.map((h, i) => (
              <span
                key={i}
                className={styles.bar}
                style={{ height: `${Math.max(8, Math.min(100, h))}%` }}
              />
            ))}
          </div>
        ) : null}
      </div>
      {typeof progress === "number" ? (
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div
              className={[
                styles.progressFill,
                styles[`fill_${progressTone}`],
              ].join(" ")}
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}
