import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit (in-memory store)", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it("allows requests under the limit and blocks once it's exceeded", async () => {
    const bucket = `test-bucket-${Date.now()}`;
    const opts = { limit: 3, windowMs: 60_000 };

    const r1 = await rateLimit(bucket, "user-a", opts);
    const r2 = await rateLimit(bucket, "user-a", opts);
    const r3 = await rateLimit(bucket, "user-a", opts);
    const r4 = await rateLimit(bucket, "user-a", opts);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("tracks separate identifiers independently", async () => {
    const bucket = `test-bucket-iso-${Date.now()}`;
    const opts = { limit: 1, windowMs: 60_000 };

    const a1 = await rateLimit(bucket, "user-a", opts);
    const b1 = await rateLimit(bucket, "user-b", opts);
    const a2 = await rateLimit(bucket, "user-a", opts);

    expect(a1.allowed).toBe(true);
    expect(b1.allowed).toBe(true);
    expect(a2.allowed).toBe(false);
  });

  it("tracks separate buckets independently for the same identifier", async () => {
    const opts = { limit: 1, windowMs: 60_000 };
    const suffix = Date.now();

    const r1 = await rateLimit(`bucket-x-${suffix}`, "shared-user", opts);
    const r2 = await rateLimit(`bucket-y-${suffix}`, "shared-user", opts);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });
});
