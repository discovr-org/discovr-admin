import styles from "../styles/ListingEditor.module.css";
import { Ic, type IconName } from "./EditorIcon";

/** The icon, title and one-line subtitle at the top of the Edit tab. */
export function PaneHead({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
  return (
    <div className={styles.ihead}>
      <span className={styles.iheadIc}>
        <Ic name={icon} size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 className={styles.paneTitle}>{title}</h3>
        <p>{sub}</p>
      </div>
    </div>
  );
}
