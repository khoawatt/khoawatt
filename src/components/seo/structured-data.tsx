import { getPortfolioProfile } from "@/content/profile";
import type { Locale } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/messages";
import { getLocalizedPathname } from "@/features/i18n/routing";
import { getAbsoluteUrl } from "@/features/seo/config";
import { getContactContent as getCmsContactContent, getGithubUrl } from "@/features/cms/repository";

interface StructuredDataProps {
  locale: Locale;
}

export async function StructuredData({
  locale,
}: Readonly<StructuredDataProps>) {
  const messages = await getMessages(locale);
  const profile = getPortfolioProfile(locale);
  const url = getAbsoluteUrl(getLocalizedPathname("/", locale));

  // Social sameAs from DB (https only) + githubUrl, with fallback to local defaults
  let sameAs: string[] = [profile.githubUrl];
  try {
    const contact = await getCmsContactContent(locale);
    const socialUrls = contact.socials.map((s) => s.href).filter((href) => href.startsWith("https://"));
    // Also fetch githubUrl from DB (social_links priority) if available
    const githubUrl = await getGithubUrl();
    const allUrls = new Set<string>([githubUrl, ...socialUrls].filter((u) => u.startsWith("https://")));
    sameAs = Array.from(allUrls);
  } catch {
    // fallback to profile.githubUrl
  }

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
        sameAs,
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
