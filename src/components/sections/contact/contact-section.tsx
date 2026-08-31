import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { ContactContentView } from "@/content/contact";
import { LocationDirectionsLink } from "@/features/geolocation/location-directions-link";

import { ContactForm } from "./contact-form";
import { DetailGlyphIcon, SocialGlyphIcon } from "./social-glyph-icon";

interface ContactSectionProps {
  content: ContactContentView;
}

export function ContactSection({ content }: Readonly<ContactSectionProps>) {
  return (
    <section
      aria-labelledby="contact-title"
      className="contact-section navigation-anchor"
      id="contact"
    >
      <Container>
        <div className="contact-section__intro">
          <SectionHeading
            align="center"
            description={content.description}
            eyebrow={content.eyebrow}
            title={content.title}
            titleId="contact-title"
          />
        </div>

        <div className="contact-card">
          <div className="contact-layout">
            <div className="contact-info">
              {content.details.length > 0 ? (
                <>
                  <h3
                    className="contact-heading"
                    id="contact-details-title"
                  >
                    {content.detailsHeading}
                  </h3>
                  <ul
                    className="contact-info__list"
                    aria-labelledby="contact-details-title"
                  >
                    {content.details.map((detail) => {
                      const isLocation = detail.id === "location";
                      return (
                        <li className="contact-detail" key={detail.id}>
                          <span className="contact-detail__chip">
                            <DetailGlyphIcon id={detail.id} />
                          </span>
                          <span className="contact-detail__text">
                            <span className="contact-info__label">
                              {detail.label}
                            </span>
                            {detail.href ? (
                              isLocation ? (
                                <LocationDirectionsLink
                                  className="contact-detail__value"
                                  locationQuery={detail.value}
                                  searchHref={detail.href}
                                >
                                  {detail.value}
                                </LocationDirectionsLink>
                              ) : (
                                <a
                                  className="contact-detail__value"
                                  href={detail.href}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  {detail.value}
                                </a>
                              )
                            ) : (
                              <span className="contact-detail__value">
                                {detail.value}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}

              <h4
                className="contact-heading contact-heading--socials"
                id="contact-socials-title"
              >
                {content.detailsLabel}
              </h4>
              <ul
                aria-labelledby="contact-socials-title"
                className="contact-socials"
              >
                {content.socials.map((social) => {
                  const isConfigured = social.href.startsWith("https://");

                  return (
                    <li key={social.id}>
                      {isConfigured ? (
                        <a
                          aria-label={social.label}
                          className="contact-socials__link"
                          href={social.href}
                          rel="noopener noreferrer"
                          target="_blank"
                          title={social.label}
                        >
                          <SocialGlyphIcon platform={social.id} />
                        </a>
                      ) : (
                        <span
                          aria-disabled="true"
                          className="contact-socials__link contact-socials__link--pending"
                          title={social.label}
                        >
                          <SocialGlyphIcon platform={social.id} />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="contact-panel">
              <h3 className="contact-heading" id="contact-form-title">
                {content.formHeading}
              </h3>
              <ContactForm content={content} labelledById="contact-form-title" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
