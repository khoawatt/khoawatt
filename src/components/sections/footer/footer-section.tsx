import { Container } from "@/components/layout/container";
import type { FooterContentView } from "@/content/footer";
import type { Locale } from "@/features/i18n/config";
import type { HeaderMessages } from "@/features/i18n/messages/types";
import {
  blogNavigationPath,
  primaryNavigationIds,
} from "@/features/navigation/config";
import { getLocalizedPathname } from "@/features/i18n/routing";

import { LocationDirectionsLink } from "@/features/geolocation/location-directions-link";

import { BackToTop } from "./back-to-top";
import { NewsletterForm } from "./newsletter-form";

interface FooterSectionProps {
  content: FooterContentView;
  locale: Locale;
  messages: HeaderMessages;
}

function isExternalHref(href: string) {
  return href.startsWith("https://") || href.startsWith("http://");
}

function externalLinkProps(href: string) {
  return isExternalHref(href)
    ? { rel: "noopener noreferrer", target: "_blank" }
    : {};
}

export function FooterSection({
  content,
  locale,
  messages,
}: Readonly<FooterSectionProps>) {
  const rootPath = getLocalizedPathname("/", locale);
  const year = new Date().getFullYear();

  return (
    <footer aria-label={content.aria.footerLabel} className="site-footer">
      <Container>
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <h2 className="site-footer__brand-name">{content.brand.name}</h2>
            <p className="site-footer__brand-description">
              {content.brand.description}
            </p>
            <ul className="site-footer__socials">
              {content.details.map((detail) => {
                const isLocation = detail.id === "location";
                return (
                  <li key={detail.id}>
                    {detail.href ? (
                      isLocation ? (
                        <LocationDirectionsLink
                          className="site-footer__social"
                          locationQuery={detail.value}
                          searchHref={detail.href}
                        >
                          <span className="site-footer__social-label">
                            {detail.label}
                          </span>
                        </LocationDirectionsLink>
                      ) : (
                        <a
                          className="site-footer__social"
                          href={detail.href}
                          {...externalLinkProps(detail.href)}
                        >
                          <span className="site-footer__social-label">
                            {detail.label}
                          </span>
                        </a>
                      )
                    ) : (
                      <span className="site-footer__social">
                        <span className="site-footer__social-label">
                          {detail.label}
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <nav aria-label={content.navigationLabel} className="site-footer__column">
            <h3 className="site-footer__heading">
              {content.navigationLabel}
            </h3>
            <ul className="site-footer__links">
              {primaryNavigationIds.map((itemId) => {
                const isBlog = itemId === "blog";
                const href = isBlog
                  ? getLocalizedPathname(blogNavigationPath, locale)
                  : itemId === "home"
                    ? rootPath
                    : `${rootPath}#${itemId}`;

                return (
                  <li key={itemId}>
                    <a className="site-footer__link" href={href}>
                      {messages.sections[itemId]}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="site-footer__column">
            <h3 className="site-footer__heading">{content.contactLabel}</h3>
            <ul className="site-footer__links">
              {content.details.map((detail) => {
                const isLocation = detail.id === "location";
                return (
                  <li key={detail.id}>
                    {detail.href ? (
                      isLocation ? (
                        <LocationDirectionsLink
                          className="site-footer__link"
                          locationQuery={detail.value}
                          searchHref={detail.href}
                        >
                          <span className="site-footer__link-label">
                            {detail.label}:
                          </span>{" "}
                          {detail.value}
                        </LocationDirectionsLink>
                      ) : (
                        <a
                          className="site-footer__link"
                          href={detail.href}
                          {...externalLinkProps(detail.href)}
                        >
                          <span className="site-footer__link-label">
                            {detail.label}:
                          </span>{" "}
                          {detail.value}
                        </a>
                      )
                    ) : (
                      <span className="site-footer__link">
                        <span className="site-footer__link-label">
                          {detail.label}:
                        </span>{" "}
                        {detail.value}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="site-footer__column">
            <h3 className="site-footer__heading">{content.newsletter.label}</h3>
            <NewsletterForm content={content} locale={locale} />
          </div>
        </div>

        <div className="site-footer__bottom">
          <p className="site-footer__copyright">
            © {year} {content.brand.name}. {content.bottom.rights}
          </p>
          <BackToTop label={content.bottom.backToTop} />
        </div>
      </Container>
    </footer>
  );
}
