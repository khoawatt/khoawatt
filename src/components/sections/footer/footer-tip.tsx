import type { TipContentView } from "@/content/tip";

interface FooterTipProps {
  tip: TipContentView;
}

export function FooterTip({ tip }: Readonly<FooterTipProps>) {
  // Reference: https://quan.hoabinh.vn/post/2024/11/so-sanh-he-thong-kieu-cua-python-va-typescript?cat=internet-of-things
  // <footer class="mt-4 pt-4 border-t flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 border-theme text-secondary">
  return (
    <div className="mt-4 flex flex-col items-center space-y-4 border-t border-[var(--color-border)] pt-4 text-[var(--color-text-muted)] transition-colors sm:flex-row sm:space-x-4 sm:space-y-0">
      <div className="text-sm font-medium">{tip.label}</div>
      <ul aria-label={tip.ariaLabel} className="flex flex-row items-center space-x-4">
        {tip.links.map((link) => {
          if (link.id === "buymeacoffee") {
            return (
              <li key={link.id}>
                <a
                  aria-label={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={link.label}
                    src="/images/brand/bmc-logo.svg"
                    className="h-8 w-auto rounded bg-current p-1 text-[var(--color-surface)]"
                    style={{ backgroundColor: "currentColor" }}
                  />
                </a>
              </li>
            );
          }
          if (link.id === "kofi") {
            return (
              <li key={link.id}>
                <a
                  aria-label={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={link.label}
                    src="https://storage.ko-fi.com/cdn/brandasset/v2/kofi_logo.png"
                    height={16}
                    width={64}
                    className="h-4 w-16 object-contain"
                  />
                </a>
              </li>
            );
          }
          if (link.id === "momo") {
            return (
              <li key={link.id}>
                <a
                  aria-label={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: "#ec4899" }}
                >
                  Momo
                </a>
              </li>
            );
          }
          // zalopay - blue like quan.hoabinh.vn
          return (
            <li key={link.id}>
              <a
                aria-label={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "#0B74E8" }}
              >
                Zalo Pay
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
