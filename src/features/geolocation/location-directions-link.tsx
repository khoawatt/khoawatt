"use client";

import { useCallback } from "react";

interface LocationDirectionsLinkProps {
  searchHref: string;
  locationQuery: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Opens Google Maps directions from the user's current location to `locationQuery`.
 * Falls back to a search view when geolocation is unavailable or denied.
 * The `searchHref` is always the Maps search URL so the link works with JS disabled.
 */
export function LocationDirectionsLink({
  searchHref,
  locationQuery,
  className,
  children,
}: Readonly<LocationDirectionsLinkProps>) {
  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();

      const fallback = searchHref;

      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        window.open(fallback, "_blank", "noopener,noreferrer");
        return;
      }

      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 8000,
              maximumAge: 300_000,
            });
          },
        );

        const origin = `${position.coords.latitude},${position.coords.longitude}`;
        const dirUrl =
          `https://www.google.com/maps/dir/?api=1` +
          `&origin=${encodeURIComponent(origin)}` +
          `&destination=${encodeURIComponent(locationQuery)}` +
          `&travelmode=driving`;

        window.open(dirUrl, "_blank", "noopener,noreferrer");
      } catch {
        window.open(fallback, "_blank", "noopener,noreferrer");
      }
    },
    [searchHref, locationQuery],
  );

  return (
    <a
      className={className}
      href={searchHref}
      onClick={handleClick}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}
