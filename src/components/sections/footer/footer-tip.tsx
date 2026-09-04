import type { TipContentView } from "@/content/tip";

interface FooterTipProps {
  tip: TipContentView;
}

export function FooterTip({ tip }: Readonly<FooterTipProps>) {
  return (
    <div className="flex flex-col items-center gap-3 text-[var(--color-text-muted)] sm:flex-row sm:flex-nowrap sm:items-center sm:gap-4">
      <div className="whitespace-nowrap text-sm font-medium">{tip.label}</div>
      <ul aria-label={tip.ariaLabel} className="flex flex-row flex-nowrap items-center gap-4">
        {tip.links.map((link) => {
          if (link.id === "buymeacoffee") {
            return (
              <li key={link.id} className="shrink-0">
                <a
                  aria-label={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block shrink-0 rounded bg-white p-1 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={link.label}
                    src="/images/brand/bmc-logo.svg"
                    className="h-6 w-auto shrink-0"
                  />
                </a>
              </li>
            );
          }
          if (link.id === "kofi") {
            return (
              <li key={link.id} className="shrink-0">
                <a
                  aria-label={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={link.label}
                    src="https://storage.ko-fi.com/cdn/brandasset/v2/kofi_logo.png"
                    height={16}
                    width={64}
                    className="h-4 w-16 shrink-0 object-contain"
                  />
                </a>
              </li>
            );
          }
          if (link.id === "momo") {
            return (
              <li key={link.id} className="shrink-0">
                <a
                  aria-label={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: "#ec4899" }}
                >
                  Momo
                </a>
              </li>
            );
          }
          // zalopay - blue like quan.hoabinh.vn
          return (
            <li key={link.id} className="shrink-0">
              <a
                aria-label={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap text-sm font-medium transition-colors hover:opacity-80"
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
