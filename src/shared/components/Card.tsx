import type { ReactNode } from "react";
import styles from "./Card.module.css";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <section className={[styles.card, className].filter(Boolean).join(" ")}>
      {children}
    </section>
  );
}

type CardHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerCopy}>
        <h2 className={`t-title-sm ${styles.title}`}>{title}</h2>
        {subtitle ? (
          <p className={`t-body-sm ${styles.subtitle}`}>{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className={styles.headerAction}>{action}</div> : null}
    </div>
  );
}

export function CardBody({
  children,
  flush,
}: {
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <div className={[styles.body, flush ? styles.flush : ""].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export function CardFooter({ children }: { children: ReactNode }) {
  return <div className={styles.footer}>{children}</div>;
}
