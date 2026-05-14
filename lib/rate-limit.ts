import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW = "15 m" as const;
const LIMIT = 5;

let cached: { limiter: Ratelimit | null } | null = null;

function describeError(e: unknown): string {
  if (e instanceof Error) {
    const cause = (e as { cause?: unknown }).cause;
    const causeMsg =
      cause instanceof Error
        ? `; cause=${cause.name}: ${cause.message}`
        : cause
          ? `; cause=${String(cause)}`
          : "";
    return `${e.name}: ${e.message}${causeMsg}`;
  }
  return String(e);
}

function getLoginLimiter(): Ratelimit | null {
  if (cached) return cached.limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN non configurati: rate limiting disabilitato (fail-open).",
    );
    cached = { limiter: null };
    return null;
  }
  try {
    const redis = new Redis({ url, token });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LIMIT, WINDOW),
      prefix: "rl:login",
      analytics: false,
    });
    cached = { limiter };
    return limiter;
  } catch (e) {
    console.warn(`[rate-limit] init fallita, fail-open: ${describeError(e)}`);
    cached = { limiter: null };
    return null;
  }
}

export function loginRateLimitKey(ip: string, email: string): string {
  const normIp = (ip || "unknown").trim().toLowerCase();
  const normEmail = (email || "").trim().toLowerCase();
  return `${normIp}|${normEmail}`;
}

export type LoginRateLimitResult = {
  allowed: boolean;
  resetAt?: number;
  remaining?: number;
};

export async function checkLoginRateLimit(
  key: string,
): Promise<LoginRateLimitResult> {
  const limiter = getLoginLimiter();
  if (!limiter) return { allowed: true };
  try {
    const r = await limiter.limit(key);
    return { allowed: r.success, resetAt: r.reset, remaining: r.remaining };
  } catch (e) {
    console.warn(`[rate-limit] limit() ha lanciato, fail-open: ${describeError(e)}`);
    return { allowed: true };
  }
}
