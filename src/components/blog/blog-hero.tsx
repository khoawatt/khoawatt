import Image from "next/image";

interface BlogHeroProps {
  badge?: string;
  eyebrow: string;
  intro?: string;
  size?: "default" | "compact";
  title: string;
}

const HERO_IMAGE = {
  src: "/images/projects/readingtime.jpg",
  width: 800,
  height: 800,
};

/**
 * Feaon-style blog hero: oversized display title laid over a real photo.
 * The image is decorative (empty alt) and a theme-aware scrim keeps the
 * text contrast in both light and dark themes. Server component, no layout
 * shift (explicit dimensions, object-fit cover).
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
      <Image
        alt=""
        aria-hidden="true"
        className="blog-hero__image"
        height={HERO_IMAGE.height}
        sizes="100vw"
        src={HERO_IMAGE.src}
        width={HERO_IMAGE.width}
      />
      <div aria-hidden="true" className="blog-hero__scrim" />
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
