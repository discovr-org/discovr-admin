import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary";

type Common = { variant?: Variant; icon?: ReactNode; children: ReactNode; className?: string };
type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = Common & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/**
 * Primary (52px, bone, one per screen) or secondary (44px, hairline border).
 * Pass `href` to render a link that looks like a button, e.g. tel: for "Call to book".
 */
export function Button(props: AsButton | AsLink) {
  const { variant = "primary", icon, children, className, ...rest } = props;
  const cls = [styles.button, styles[variant], className ?? ""].join(" ").trim();
  if (typeof rest.href === "string") {
    return (
      <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {icon}
        {children}
      </a>
    );
  }
  const { type = "button", ...b } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={cls} {...b}>
      {icon}
      {children}
    </button>
  );
}
