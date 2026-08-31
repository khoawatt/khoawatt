"use client";

import { useEffect } from "react";

const STORAGE_KEY = "qvak.geolocationRequested";

/**
 * Asks for geolocation permission on first visit so the Location
 * directions link can route from the user's current position.
 *
 * Browsers that block permission requests without a user gesture will
 * simply get a denied fallback — the directions link handles that gracefully.
 */
export function GeolocationPermissionPrompt() {
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;

    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // localStorage may be blocked (private mode); still try once
    }

    const requestOnce = () => {
      navigator.geolocation.getCurrentPosition(
        () => {
          try {
            window.localStorage.setItem(STORAGE_KEY, "granted");
          } catch {}
        },
        () => {
          try {
            window.localStorage.setItem(STORAGE_KEY, "denied");
          } catch {}
        },
        { timeout: 8000, maximumAge: 60_000, enableHighAccuracy: false },
      );
    };

    // Prefer the Permissions API when available so we only prompt when
    // the state is "prompt". Falls back to a delayed one-shot request.
    const permissions = (
      navigator as Navigator & {
        permissions?: { query: (desc: { name: string }) => Promise<{ state: string }> };
      }
    ).permissions;

    if (permissions?.query) {
      permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          if (result.state === "prompt") {
            const timer = window.setTimeout(requestOnce, 1500);
            return () => window.clearTimeout(timer);
          }
          try {
            window.localStorage.setItem(STORAGE_KEY, result.state);
          } catch {}
          return undefined;
        })
        .catch(() => {
          const timer = window.setTimeout(requestOnce, 1500);
          return () => window.clearTimeout(timer);
        });
      return;
    }

    const timer = window.setTimeout(requestOnce, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
