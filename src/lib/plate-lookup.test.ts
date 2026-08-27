import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { normalizePlate, isValidItalianPlate, lookupPlate } from "@/lib/plate-lookup";

describe("normalizePlate", () => {
  it("uppercases and strips spaces/dashes", () => {
    expect(normalizePlate("ab-123-cd")).toBe("AB123CD");
    expect(normalizePlate(" ab 123 cd ")).toBe("AB123CD");
  });
});

describe("isValidItalianPlate", () => {
  it("accepts the standard modern format (2 letters, 3 digits, 2 letters)", () => {
    expect(isValidItalianPlate("AB123CD")).toBe(true);
    expect(isValidItalianPlate("ab-123-cd")).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(isValidItalianPlate("123ABCD")).toBe(false);
    expect(isValidItalianPlate("AB12CD")).toBe(false);
    expect(isValidItalianPlate("")).toBe(false);
    expect(isValidItalianPlate("HELLO")).toBe(false);
  });
});

describe("lookupPlate", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.PLATE_LOOKUP_API_KEY;
    delete process.env.PLATE_LOOKUP_ENDPOINT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("rejects an invalid plate before ever calling a provider", async () => {
    const result = await lookupPlate("not-a-plate");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Formato targa non valido/);
  });

  it("returns an honest not-configured result when no provider env is set", async () => {
    const result = await lookupPlate("AB123CD");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/non configurato/);
  });

  it("calls the configured provider and maps a successful response", async () => {
    process.env.PLATE_LOOKUP_API_KEY = "test-key";
    process.env.PLATE_LOOKUP_ENDPOINT = "https://example.test/lookup";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ brand: "Fiat", model: "Panda", year: 2020, fuelType: "Benzina", chassisNumber: null, category: "City Car" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupPlate("AB123CD");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        plate: "AB123CD",
        brand: "Fiat",
        model: "Panda",
        year: 2020,
        fuelType: "Benzina",
        chassisNumber: null,
        category: "City Car",
      });
    }
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/lookup",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer test-key" }) })
    );
  });

  it("returns a not-found result on a 404 without retrying", async () => {
    process.env.PLATE_LOOKUP_API_KEY = "test-key";
    process.env.PLATE_LOOKUP_ENDPOINT = "https://example.test/lookup";
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupPlate("AB123CD");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Nessun veicolo trovato/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
