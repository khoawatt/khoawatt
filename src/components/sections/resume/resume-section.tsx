"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { ResumeContentView } from "@/content/resume";

import { ResumeMediaView } from "./resume-media-view";

interface ResumeSectionProps {
  content: ResumeContentView;
}

export function ResumeSection({ content }: Readonly<ResumeSectionProps>) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeEntry, setActiveEntry] = useState(0);
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">(
    "horizontal",
  );
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 64rem)");

    function syncOrientation(event: MediaQueryListEvent | MediaQueryList) {
      setOrientation(event.matches ? "vertical" : "horizontal");
    }

    syncOrientation(query);
    query.addEventListener("change", syncOrientation);

    return () => query.removeEventListener("change", syncOrientation);
  }, []);

  const category = content.categories[activeCategory];
  const totalEntries = category.entries.length;
  const entry = category.entries[activeEntry];

  function selectCategory(index: number) {
    setActiveCategory(index);
    setActiveEntry(0);
  }

  function selectAndFocusCategory(index: number) {
    const nextIndex = (index + content.categories.length) % content.categories.length;

    selectCategory(nextIndex);
    const tab = tabRefs.current[nextIndex];
    tab?.focus();
    tab?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "auto",
    });
  }

  function handleCategoryKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    let nextIndex: number | undefined;
    const isVertical = orientation === "vertical";

    switch (event.key) {
      case "ArrowDown":
        nextIndex = isVertical ? currentIndex + 1 : undefined;
        break;
      case "ArrowUp":
        nextIndex = isVertical ? currentIndex - 1 : undefined;
        break;
      case "ArrowRight":
        nextIndex = isVertical ? undefined : currentIndex + 1;
        break;
      case "ArrowLeft":
        nextIndex = isVertical ? undefined : currentIndex - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = content.categories.length - 1;
        break;
      default:
        return;
    }

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    selectAndFocusCategory(nextIndex);
  }

  function goToEntry(index: number) {
    setActiveEntry((index + totalEntries) % totalEntries);
  }

  return (
    <section
      aria-labelledby="resume-title"
      className="resume-section navigation-anchor"
      id="resume"
    >
      <Container>
        <div className="resume-section__intro">
          <SectionHeading
            description={content.description}
            eyebrow={content.eyebrow}
            title={content.title}
            titleId="resume-title"
          />
        </div>

        <div className="resume-layout">
          <div
            aria-label={content.categoriesLabel}
            aria-orientation={orientation}
            className="resume-categories"
            role="tablist"
          >
            {content.categories.map((categoryItem, index) => (
              <button
                aria-controls={`resume-panel-${categoryItem.id}`}
                aria-selected={activeCategory === index}
                className="resume-category__item"
                id={`resume-tab-${categoryItem.id}`}
                key={categoryItem.id}
                onClick={() => selectCategory(index)}
                onKeyDown={(event) => handleCategoryKeyDown(event, index)}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                role="tab"
                tabIndex={activeCategory === index ? 0 : -1}
                type="button"
              >
                {categoryItem.name}
              </button>
            ))}
          </div>

          <div className="resume-panel__controls resume-panel__controls--below">
            <button
              aria-label={content.previousEntry}
              className="resume-panel__control"
              disabled={totalEntries <= 1}
              onClick={() => goToEntry(activeEntry - 1)}
              type="button"
            >
              <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path
                  d="m14 6-6 6 6 6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
              <span>{content.previousEntry}</span>
            </button>

            <button
              aria-label={content.nextEntry}
              className="resume-panel__control"
              disabled={totalEntries <= 1}
              onClick={() => goToEntry(activeEntry + 1)}
              type="button"
            >
              <span>{content.nextEntry}</span>
              <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path
                  d="m10 6 6 6-6 6"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
          </div>

          {content.categories.map((categoryItem, index) => (
            <div
              aria-labelledby={`resume-tab-${categoryItem.id}`}
              className="resume-panel"
              hidden={activeCategory !== index}
              id={`resume-panel-${categoryItem.id}`}
              key={categoryItem.id}
              role="tabpanel"
              tabIndex={0}
            >
              <div className="resume-panel__toolbar">
                <p className="resume-panel__counter" aria-hidden="true">
                  {String(activeEntry + 1).padStart(2, "0")}
                  <span aria-hidden="true">/</span>
                  {String(categoryItem.entries.length).padStart(2, "0")}
                </p>
              </div>

              <article className="resume-entry">
                {entry.dateLabel ? (
                  <p className="resume-entry__date">{entry.dateLabel}</p>
                ) : null}
                <h3 className="resume-entry__title">{entry.title}</h3>
                {entry.organization ? (
                  <p className="resume-entry__organization">
                    {entry.organization}
                    {entry.location ? (
                      <>
                        <span aria-hidden="true"> · </span>
                        {entry.location}
                      </>
                    ) : null}
                  </p>
                ) : null}

                {entry.summary ? (
                  <p className="resume-entry__summary">{entry.summary}</p>
                ) : null}

                {entry.highlights ? (
                  <ul className="resume-entry__highlights">
                    {entry.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                ) : null}

                {entry.tags ? (
                  <ul className="resume-entry__tags" aria-label={entry.title}>
                    {entry.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                ) : null}

                {entry.media && entry.media.length > 0 ? (
                  <ResumeMediaView
                    closeLabel={content.closeLightbox}
                    lightboxLabel={content.lightboxLabel}
                    media={entry.media}
                    viewImageLabel={content.viewImage}
                  />
                ) : null}

                {entry.links && entry.links.length > 0 ? (
                  <ul className="resume-entry__links">
                    {entry.links.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>

              {totalEntries > 1 ? (
                <div className="resume-entry__dots" role="group" aria-label={entry.title}>
                  {categoryItem.entries.map((entryItem, entryIndex) => (
                    <button
                      aria-current={entryIndex === activeEntry ? "true" : undefined}
                      aria-label={`${content.entryCounter} ${entryItem.index}`}
                      className="resume-entry__dot"
                      key={entryItem.id}
                      onClick={() => goToEntry(entryIndex)}
                      type="button"
                    />
                  ))}
                </div>
              ) : null}

              <div aria-live="polite" className="sr-only">
                {entry.title}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
