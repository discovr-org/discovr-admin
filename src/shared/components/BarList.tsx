import styles from "./BarList.module.css";

export type BarListItem = {
  id: string;
  label: string;
  valueLabel: string;
  percent: number;
};

type Props = {
  items: BarListItem[];
};

export function BarList({ items }: Props) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.id} className={styles.row}>
          <span className={styles.label}>{item.label}</span>
          <span className={styles.value}>{item.valueLabel}</span>
          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{ width: `${Math.max(0, Math.min(100, item.percent))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
