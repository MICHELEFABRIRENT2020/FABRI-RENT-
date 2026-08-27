import { logger } from "@/lib/logger";

/**
 * Rate limiting (section 9). Fixed-window counter behind a pluggable
 * store: an in-memory Map by default (correct for a single Node process,
 * which is what this app runs as today - see docker-compose.yml), and a
 * Redis-backed store automatically when `REDIS_URL` is set, which is
 * required as soon as the app runs on more than one instance behind a
 * load balancer (otherwise each instance enforces its own separate
 * counter and the effective limit multiplies by instance count).
 *
 * Limits are per (bucket, identifier) - e.g. bucket "login" keyed by
 * email+IP, bucket "plate-lookup" keyed by tenantId. Call `rateLimit` at
 * the top of the handler and reject with 429 when `allowed` is false.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

class InMemoryStore implements RateLimitStore {
  private hits = new Map<string, { count: number; resetAt: number }>();

  async increment(key: string, windowMs: number) {
    const now = Date.now();
    const existing = this.hits.get(key);
    if (!existing || existing.resetAt <= now) {
      const entry = { count: 1, resetAt: now + windowMs };
      this.hits.set(key, entry);
      if (this.hits.size > 50_000) this.sweep(now);
      return entry;
    }
    existing.count += 1;
    return existing;
  }

  private sweep(now: number) {
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
  }
}

class RedisStore implements RateLimitStore {
  private clientPromise: Promise<import("ioredis").default>;

  constructor(url: string) {
    // Dynamic import: keeps ioredis out of the connection pool unless
    // REDIS_URL is actually configured.
    this.clientPromise = import("ioredis").then(({ default: Redis }) => {
      const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
      client.on("error", (err: Error) => logger.error({ err }, "[rate-limit] Redis connection error"));
      return client;
    });
  }

  async increment(key: string, windowMs: number) {
    const client = await this.clientPromise;
    const redisKey = `ratelimit:${key}`;
    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.pexpire(redisKey, windowMs);
    }
    const ttl = await client.pttl(redisKey);
    return { count, resetAt: Date.now() + (ttl > 0 ? ttl : windowMs) };
  }
}

let store: RateLimitStore | null = null;
function getStore(): RateLimitStore {
  if (store) return store;
  store = process.env.REDIS_URL ? new RedisStore(process.env.REDIS_URL) : new InMemoryStore();
  return store;
}

/** Named limit presets, tuned to the sensitivity/cost of each endpoint. */
export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 5 * 60 * 1000 }, // 8 attempts / 5 min per email+IP
  twoFactorVerify: { limit: 6, windowMs: 5 * 60 * 1000 },
  plateLookup: { limit: 30, windowMs: 60 * 1000 },
  aiAssistant: { limit: 20, windowMs: 60 * 1000 },
  paymentCreate: { limit: 15, windowMs: 60 * 1000 },
  publicApi: { limit: 60, windowMs: 60 * 1000 },
  fileUpload: { limit: 20, windowMs: 60 * 1000 },
  bookingCreate: { limit: 10, windowMs: 60 * 1000 },
} as const;

export async function rateLimit(
  bucket: string,
  identifier: string,
  opts: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  try {
    const { count, resetAt } = await getStore().increment(`${bucket}:${identifier}`, opts.windowMs);
    return {
      allowed: count <= opts.limit,
      remaining: Math.max(0, opts.limit - count),
      resetAt,
      limit: opts.limit,
    };
  } catch (error) {
    // Fail open: a rate-limit store outage must not take down login/checkout.
    logger.error({ err: error, bucket }, "[rate-limit] store error, failing open");
    return { allowed: true, remaining: opts.limit, resetAt: Date.now() + opts.windowMs, limit: opts.limit };
  }
}

/** Best-effort client identifier for anonymous/public endpoints. */
export function clientIp(headerList: Headers): string {
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? "unknown";
}
