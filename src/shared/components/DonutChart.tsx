import styles from "./DonutChart.module.css";

export type DonutSlice = {
  label: string;
  value: number;
  tone: "bone" | "positive" | "notice" | "critical" | "muted";
};

type Props = {
  slices: DonutSlice[];
  centerValue: string;
  centerLabel: string;
};

const TONE_VAR: Record<DonutSlice["tone"], string> = {
  bone: "var(--brand-primary)",
  positive: "var(--state-positive)",
  notice: "var(--state-notice)",
  critical: "var(--state-critical)",
  muted: "var(--ink-subtle)",
};

export function DonutChart({ slices, centerValue, centerLabel }: Props) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.chart}>
        <svg viewBox="0 0 110 110" className={styles.svg} aria-hidden>
          <g transform="rotate(-90 55 55)">
            {slices.map((slice) => {
              const len = (slice.value / total) * c;
              const el = (
                <circle
                  key={slice.label}
                  cx="55"
                  cy="55"
                  r={r}
                  fill="none"
                  stroke={TONE_VAR[slice.tone]}
                  strokeWidth="12"
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
          </g>
        </svg>
        <div className={styles.center}>
          <p className={styles.num}>{centerValue}</p>
          <p className={`t-caption ${styles.sub}`}>{centerLabel}</p>
        </div>
      </div>
      <ul className={styles.legend}>
        {slices.map((slice) => (
          <li key={slice.label} className={styles.legendItem}>
            <span
              className={styles.dot}
              style={{ background: TONE_VAR[slice.tone] }}
              aria-hidden
            />
            <span>{slice.label}</span>
            <span className={styles.pct}>
              {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
