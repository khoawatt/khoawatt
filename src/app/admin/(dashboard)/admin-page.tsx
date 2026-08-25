import Link from "next/link";
import type { ReactNode } from "react";

interface AdminPageProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  /** Optional action rendered on the right of the title (e.g. a "New X" link). */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Consistent wrapper for admin pages: optional back link, a title row (with an
 * optional action), and the page body. Form pages pass their fields via
 * AdminFormCard.
 */
export function AdminPage({
  title,
  backHref,
  backLabel = "Back",
  action,
  children,
}: AdminPageProps) {
  return (
    <main className="admin-dashboard">
      {backHref ? (
        <Link className="admin-back-link" href={backHref}>
          ← {backLabel}
        </Link>
      ) : null}
      <div className="admin-page-head">
        <h1>{title}</h1>
        {action ? <div className="admin-page-head__action">{action}</div> : null}
      </div>
      {children}
    </main>
  );
}

interface AdminFormCardProps {
  children: ReactNode;
  className?: string;
}

/** Card container for a form page's fields. */
export function AdminFormCard({ children, className }: AdminFormCardProps) {
  const classes = ["admin-form-card", className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}

interface AdminTableProps {
  label: string;
  children: ReactNode;
}

/** Keeps semantic tables usable at narrow viewports without scrolling the page. */
export function AdminTable({ label, children }: AdminTableProps) {
  return (
    <div className="admin-table-wrap" role="region" aria-label={label} tabIndex={0}>
      <table className="admin-table">{children}</table>
    </div>
  );
}
