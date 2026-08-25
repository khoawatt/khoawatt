import Link from "next/link";

import type { Locale } from "@/features/i18n/config";
import type { BlogMessages } from "@/features/i18n/messages/types";
import { getLocalizedPathname } from "@/features/i18n/routing";

interface PaginationProps {
  /** Route prefix the numbered pages hang off, e.g. "/blog" or "/blog/category/x". */
  basePath?: string;
  locale: Locale;
  messages: BlogMessages;
  page: number;
  totalPages: number;
}

export function Pagination({
  basePath = "/blog",
  locale,
  messages,
  page,
  totalPages,
}: Readonly<PaginationProps>) {
  if (totalPages <= 1) return null;

  const base = getLocalizedPathname(basePath, locale);
  const pageHref = (n: number) =>
    n === 1 ? base : getLocalizedPathname(`${basePath}/page/${n}`, locale);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label={messages.paginationLabel} className="blog-pagination">
      {page > 1 ? (
        <Link
          className="blog-pagination__direction"
          href={pageHref(page - 1)}
          rel="prev"
        >
          {messages.paginationPrev}
        </Link>
      ) : (
        <span aria-hidden="true" className="blog-pagination__direction blog-pagination__direction--disabled" />
      )}

      <ol className="blog-pagination__pages">
        {pages.map((n) => {
          const isCurrent = n === page;
          const label = messages.pageNumberLabel.replace("{n}", String(n));
          return (
            <li key={n}>
              {isCurrent ? (
                <span
                  aria-current="page"
                  aria-label={label}
                  className="blog-pagination__page blog-pagination__page--current"
                >
                  {n}
                </span>
              ) : (
                <Link aria-label={label} className="blog-pagination__page" href={pageHref(n)}>
                  {n}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {page < totalPages ? (
        <Link
          className="blog-pagination__direction"
          href={pageHref(page + 1)}
          rel="next"
        >
          {messages.paginationNext}
        </Link>
      ) : (
        <span aria-hidden="true" className="blog-pagination__direction blog-pagination__direction--disabled" />
      )}
    </nav>
  );
}