import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

type Props = {
  pretitle?: string;
  title: string;
  actions?: ReactNode;
};

export function PageHeader({ pretitle = "Overview", title, actions }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.copy}>
        {pretitle ? <p className={`t-caption ${styles.pretitle}`}>{pretitle}</p> : null}
        <h2 className={styles.title}>{title}</h2>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
