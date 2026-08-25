import Link from "next/link";

import type { BlogCategoryNavEntry } from "@/features/blog/types";
import type { Locale } from "@/features/i18n/config";
import type { BlogMessages } from "@/features/i18n/messages/types";
import { getLocalizedPathname } from "@/features/i18n/routing";

interface CategoryNavProps {
  entries: BlogCategoryNavEntry[];
  locale: Locale;
  messages: BlogMessages;
}

/**
 * "Knowledge library" chip row: one link per category that has published
 * posts, with its post count. Hidden entirely when there is nothing to link.
 */
export function CategoryNav({
  entries,
  locale,
  messages,
}: Readonly<CategoryNavProps>) {
  if (entries.length === 0) return null;

  return (
    <nav aria-label={messages.topicsLabel} className="blog-topics">
      <h2 className="blog-topics__title">{messages.topicsLabel}</h2>
      <ul className="blog-topics__list">
        {entries.map((entry) => (
          <li key={entry.slug}>
            <Link
              className="blog-topics__chip"
              href={getLocalizedPathname(
                `/blog/category/${entry.slug}`,
                locale,
              )}
            >
              <span className="blog-topics__name">{entry.name}</span>
              <span className="blog-topics__count">
                {messages.categoryPostCount.replace(
                  "{count}",
                  String(entry.postCount),
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
