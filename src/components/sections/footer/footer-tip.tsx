import type { TipContentView, TipPlatform } from "@/content/tip";

interface FooterTipProps {
  tip: TipContentView;
}

function isExternalHref(href: string) {
  return href.startsWith("https://") || href.startsWith("http://");
}

function externalLinkProps(href: string) {
  return isExternalHref(href)
    ? { rel: "noopener noreferrer", target: "_blank" as const }
    : {};
}

function TipIcon({ platform }: { platform: TipPlatform }) {
  if (platform === "buymeacoffee") {
    return (
      <svg
        aria-hidden="true"
        fill="none"
        height="18"
        viewBox="0 0 24 24"
        width="18"
      >
        <path
          d="M7 8h10a2 2 0 0 1 2 2v3a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-3a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <path
          d="M7 4v4M11 4v4M15 4v4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  if (platform === "kofi") {
    return (
      <svg
        aria-hidden="true"
        fill="none"
        height="18"
        viewBox="0 0 24 24"
        width="18"
      >
        <path
          d="M12 20.2 5.6 13.8a4.5 4.5 0 0 1 6.4-6.35A4.5 4.5 0 0 1 18.4 13.8L12 20.2Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <path
          d="M9 9.2c0-1 .8-1.7 1.7-1.7.5 0 1 .2 1.3.6.3-.4.8-.6 1.3-.6C14.2 7.5 15 8.2 15 9.2c0 1.2-1.1 2.1-3 3.7-1.9-1.6-3-2.5-3-3.7Z"
          fill="currentColor"
          stroke="none"
          opacity="0.95"
        />
      </svg>
    );
  }

  if (platform === "momo") {
    return (
      <span
        aria-hidden="true"
        className="site-footer__tip-icon-text"
        data-platform="momo"
      >
        MoMo
      </span>
    );
  }

  // zalopay
  return (
    <span
      aria-hidden="true"
      className="site-footer__tip-icon-text"
      data-platform="zalopay"
    >
      ZP
    </span>
  );
}

export function FooterTip({ tip }: Readonly<FooterTipProps>) {
  return (
    <div className="site-footer__tip">
      <p className="site-footer__tip-label">{tip.label}</p>
      <ul aria-label={tip.ariaLabel} className="site-footer__tip-links">
        {tip.links.map((link) => (
          <li key={link.id}>
            <a
              aria-label={link.label}
              className="site-footer__tip-link"
              data-platform={link.id}
              href={link.href}
              {...externalLinkProps(link.href)}
            >
              <TipIcon platform={link.id} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
