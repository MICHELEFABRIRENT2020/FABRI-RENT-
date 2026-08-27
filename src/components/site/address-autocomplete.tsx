"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

declare global {
  interface Window {
    google?: typeof google;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

/**
 * Loads the Google Maps JS API + Places library exactly once per page,
 * however many AddressAutocomplete instances are mounted.
 *
 * Uses the classic `places.Autocomplete` widget rather than the newer
 * `PlaceAutocompleteElement` web component: it binds directly to a plain
 * `<input>` via a ref, which fits this form library's controlled-input
 * pattern with far less plumbing. Google still serves it (marked legacy,
 * not removed) - migrate to `PlaceAutocompleteElement` if it stops
 * receiving updates for existing callers.
 */
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossibile caricare Google Maps."));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export type AddressAutocompleteResult = { address: string; placeId?: string };

/**
 * Address input with Google Places autocomplete when
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is configured; otherwise it's a plain
 * text input (still fully usable, just without suggestions) - never
 * blocks the surrounding form on Maps being unavailable.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected?: (result: AddressAutocompleteResult) => void;
  placeholder?: string;
  id?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !inputRef.current) return;

    let autocomplete: google.maps.places.Autocomplete | null = null;
    let listener: google.maps.MapsEventListener | null = null;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!inputRef.current || !window.google) return;
        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "place_id"],
          types: ["address"],
        });
        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          if (place?.formatted_address) {
            onChange(place.formatted_address);
            onPlaceSelected?.({ address: place.formatted_address, placeId: place.place_id });
          }
        });
        setReady(true);
      })
      .catch(() => setReady(false));

    return () => {
      listener?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per mount, not per value change
  }, []);

  return (
    <Input
      id={id}
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? (ready ? "Inizia a digitare l'indirizzo..." : "Indirizzo")}
      autoComplete="off"
    />
  );
}
