import Image from "next/image";

import { Section } from "@/components/layout/section";
import type {
  HeroActionId,
  PortfolioProfileView,
} from "@/content/profile";

interface HeroSectionProps {
  profile: PortfolioProfileView;
}

function ActionIcon({ action }: Readonly<{ action: HeroActionId }>) {
  if (action === "case-studies") {
    return (
      <path
        d="m8 9-3 3 3 3m8-6 3 3-3 3m-3.5-8-1 10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    );
  }

  if (action === "discussion") {
    return (
      <path
        d="M5 6.5h14v9H9l-4 3v-12Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    );
  }

  return (
    <path
      d="M12 4v10m0 0 4-4m-4 4-4-4M5 16v3h14v-3"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  );
}

export function HeroSection({ profile }: Readonly<HeroSectionProps>) {
  return (
    <Section
      aria-labelledby="home-title"
      className="home-hero navigation-anchor"
      containerSize="wide"
    >
      <div className="home-hero__layout">
        <div className="home-hero__content">
          <p className="home-hero__eyebrow">{profile.hero.eyebrow}</p>
          <h1 className="home-hero__title" id="home-title">
            {profile.hero.title}
          </h1>
          <p className="home-hero__identity">
            <strong>{profile.name}</strong>
            <span aria-hidden="true">/</span>
            {profile.role}
          </p>
          <div className="home-hero__about" id="about">
            <p className="home-hero__description">
              {profile.hero.description}
            </p>
            <nav
              aria-label={profile.hero.eyebrow}
              className="home-hero__actions"
            >
              {profile.hero.actions.map((action, index) => (
                <a
                  className="home-hero__action"
                  data-emphasis={index === 0 ? "primary" : "secondary"}
                  href={action.href}
                  key={action.id}
                >
                  <svg
                    aria-hidden="true"
                    fill="none"
                    height="20"
                    viewBox="0 0 24 24"
                    width="20"
                  >
                    <ActionIcon action={action.id} />
                  </svg>
                  <span>{action.label}</span>
                </a>
              ))}
            </nav>

            <div className="home-hero__about-intro">
              <span aria-hidden="true" className="home-hero__about-line" />
              <p>{profile.about.intro}</p>
            </div>
          </div>
        </div>

        <div className="home-hero__visual">
          <div className="home-hero__frame-bar" aria-hidden="true">
            <span />
            <span />
            <span />
            <code>portfolio.tsx</code>
          </div>
          <div className="home-hero__image-wrap">
            <div className="home-hero__image-crop">
              <Image
                alt={profile.hero.image.alt}
                className="home-hero__image"
                fetchPriority="high"
                height={profile.hero.image.height}
                priority
                sizes="(min-width: 64rem) 42vw, (min-width: 48rem) 68vw, calc(100vw - 2rem)"
                src={profile.hero.image.src}
                style={{ objectPosition: profile.hero.image.focalPoint }}
                width={profile.hero.image.width}
              />
              <div className="home-hero__image-overlay" aria-hidden="true" />
            </div>

            <div className="home-hero__portrait-bubbles">
              {profile.about.portraits.map((portrait, index) => (
                <div
                  className="home-hero__portrait-bubble"
                  data-position={index === 0 ? "upper" : "lower"}
                  key={portrait.src}
                >
                  <Image
                    alt={portrait.alt}
                    className="home-hero__portrait-image"
                    height={portrait.height}
                    sizes="(min-width: 64rem) 6rem, 4.75rem"
                    src={portrait.src}
                    style={{ objectPosition: portrait.focalPoint }}
                    width={portrait.width}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
