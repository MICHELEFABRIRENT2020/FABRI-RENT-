// Never statically prerendered/cached - every route here reads request-time state (session, DB, query params) or must run per-request.
export const dynamic = "force-dynamic";

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
