"use client";

import { useCallback, useState } from "react";

/**
 * One-shot browser geolocation (section 4). Deliberately NOT a
 * `watchPosition` subscription: the only use case wired to this hook is
 * "how far am I from the rental office" on the public site, a single
 * point-in-time read, not continuous tracking - see
 * `src/components/site/directions-card.tsx`. Never call `getPosition`
 * automatically on mount; it must be triggered by an explicit user action
 * so the permission prompt has clear context.
 */
export type GeolocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; latitude: number; longitude: number }
  | { status: "denied" }
  | { status: "unavailable"; reason: string };

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: "idle" });

  const getPosition = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable", reason: "Geolocalizzazione non supportata da questo browser." });
      return;
    }
    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({ status: "success", latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setState({ status: "denied" });
        } else if (error.code === error.TIMEOUT) {
          setState({ status: "unavailable", reason: "Richiesta posizione scaduta." });
        } else {
          setState({ status: "unavailable", reason: "Posizione non disponibile." });
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  return { state, getPosition };
}
