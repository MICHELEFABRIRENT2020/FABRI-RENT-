import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Resolves the tenant that powers the public, unauthenticated storefront
 * (home page + booking wizard). This MVP serves a single active company per
 * deployment; per-tenant public storefronts (custom domain/subdomain
 * routing) are a follow-up once multiple companies onboard.
 */
export const getPublicTenant = cache(async () => {
  return prisma.tenant.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
});
