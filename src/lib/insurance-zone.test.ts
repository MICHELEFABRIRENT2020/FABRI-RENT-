import { describe, it, expect } from "vitest";
import { resolveInsuranceZone, isKasko, assertInsuranceSelectable } from "@/lib/insurance-zone";

describe("resolveInsuranceZone", () => {
  it("classifies known southern regions as sud_italia", () => {
    expect(resolveInsuranceZone("Campania")).toBe("sud_italia");
    expect(resolveInsuranceZone("Sicilia")).toBe("sud_italia");
  });

  it("classifies everything else as centro_nord_italia", () => {
    expect(resolveInsuranceZone("Lombardia")).toBe("centro_nord_italia");
    expect(resolveInsuranceZone("Toscana")).toBe("centro_nord_italia");
    expect(resolveInsuranceZone("Non existent region")).toBe("centro_nord_italia");
  });
});

describe("isKasko", () => {
  it("is true only for the exact kasko_senza_cauzione tier", () => {
    expect(isKasko("kasko_senza_cauzione")).toBe(true);
    expect(isKasko("franchigia_base")).toBe(false);
  });
});

describe("assertInsuranceSelectable", () => {
  it("allows any option paid by credit card", () => {
    expect(() =>
      assertInsuranceSelectable({ zone: "centro_nord_italia", tier: "kasko_senza_cauzione", requiresCreditCard: true }, "credit_card")
    ).not.toThrow();
  });

  it("blocks a credit-card-only option paid by debit card", () => {
    expect(() =>
      assertInsuranceSelectable({ zone: "centro_nord_italia", tier: "kasko_senza_cauzione", requiresCreditCard: true }, "debit_card")
    ).toThrow(/Carta di Credito/);
  });

  it("allows a non-restricted option regardless of payment method", () => {
    expect(() =>
      assertInsuranceSelectable({ zone: "sud_italia", tier: "franchigia_base", requiresCreditCard: false }, "debit_card")
    ).not.toThrow();
  });
});
