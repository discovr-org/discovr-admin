import styles from "./ProgressBar.module.css";

type Segment = { value: number; tone: "bone" | "positive" | "notice" | "critical" | "muted" };

type Props = {
  segments: Segment[];
};

export function ProgressBar({ segments }: Props) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <div className={styles.track} aria-hidden>
      {segments.map((s, i) => (
        <span
          key={i}
          className={[styles.seg, styles[s.tone]].join(" ")}
          style={{ width: `${(s.value / total) * 100}%` }}
        />
      ))}
    </div>
  );
}
