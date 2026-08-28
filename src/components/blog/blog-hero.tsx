interface BlogHeroProps {
  badge?: string;
  eyebrow: string;
  intro?: string;
  size?: "default" | "compact";
  title: string;
}

/**
 * Blog hero — gradient variant (no photo).
 * Uses a subtle token-driven gradient that works in both light/dark themes
 * and keeps the same typographic hierarchy as the previous photo hero.
 */
export function BlogHero({
  badge,
  eyebrow,
  intro,
  size = "default",
  title,
}: Readonly<BlogHeroProps>) {
  return (
    <header className="blog-hero" data-size={size}>
      <p className="blog-hero__eyebrow">{eyebrow}</p>
      <h1 className="blog-hero__title">{title}</h1>
      {intro ? <p className="blog-hero__intro">{intro}</p> : null}
      {badge ? (
        <p aria-hidden="true" className="blog-hero__badge">
          {badge}
        </p>
      ) : null}
    </header>
  );
}
