import { getPortfolioProfile } from "@/content/profile";
import type { Locale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/messages";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { getAbsoluteUrl } from "@/features/seo/config";

interface StructuredDataProps {
  locale: Locale;
}

export async function StructuredData({
  locale,
}: Readonly<StructuredDataProps>) {
  const messages = await getMessages(locale);
  const profile = getPortfolioProfile(locale);
  const url = getAbsoluteUrl(getLocalizedPathname("/", locale));

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${url}#person`,
        name: profile.name,
        url,
        image: getAbsoluteUrl(profile.hero.image.src),
        jobTitle: profile.role,
        sameAs: [profile.githubUrl],
      },
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        url,
        name: messages.metadata.title,
        description: messages.metadata.description,
        inLanguage: locale,
        publisher: { "@id": `${url}#person` },
      },
    ],
  };

  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      type="application/ld+json"
    />
  );
}
