import { describe, it, expect } from "vitest";
import { haversineDistanceKm, googleMapsDirectionsUrl } from "@/lib/geo";

describe("haversineDistanceKm", () => {
  it("returns ~0 for the same point", () => {
    const point = { latitude: 40.8518, longitude: 14.2681 }; // Napoli
    expect(haversineDistanceKm(point, point)).toBeCloseTo(0, 5);
  });

  it("returns a plausible distance between two known cities (Napoli -> Roma, ~186km great-circle)", () => {
    const napoli = { latitude: 40.8518, longitude: 14.2681 };
    const roma = { latitude: 41.9028, longitude: 12.4964 };
    const distance = haversineDistanceKm(napoli, roma);
    expect(distance).toBeGreaterThan(170);
    expect(distance).toBeLessThan(200);
  });

  it("is symmetric", () => {
    const a = { latitude: 45.0, longitude: 9.0 };
    const b = { latitude: 41.0, longitude: 12.0 };
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 10);
  });
});

describe("googleMapsDirectionsUrl", () => {
  it("builds a valid directions URL from coordinates", () => {
    const url = googleMapsDirectionsUrl({ latitude: 40.85, longitude: 14.27 });
    expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=40.85%2C14.27");
  });

  it("builds a valid directions URL from a free-text address", () => {
    const url = googleMapsDirectionsUrl("Via Roma 1, Napoli");
    expect(url).toContain("https://www.google.com/maps/dir/?api=1&destination=");
    expect(url).toContain(encodeURIComponent("Via Roma 1, Napoli"));
  });
});
