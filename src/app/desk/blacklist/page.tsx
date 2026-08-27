import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole, BLACKLIST_ROLES } from "@/lib/session";
import { BlacklistForm } from "@/components/desk/blacklist-form";
import { BlacklistList } from "@/components/desk/blacklist-list";
import { logAudit } from "@/lib/audit";

export default async function BlacklistPage() {
  const user = await requireRole(...BLACKLIST_ROLES);
  const tenantId = user.tenantId as string;

  await logAudit({ tenantId, actorId: user.id, action: "blacklist_viewed", entityType: "blacklist_entry" });

  const entries = await prisma.blacklistEntry.findMany({
    where: { tenantId },
    orderBy: { date: "desc" },
    take: 200,
  });

  const dto = entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    fullNameSnapshot: e.fullNameSnapshot,
    reason: e.reason,
    details: e.details,
    plate: e.plate,
    amountDue: e.amountDue?.toString() ?? null,
    status: e.status,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Blacklist</h1>
      <BlacklistForm />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Segnalazioni ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <BlacklistList entries={dto} />
        </CardContent>
      </Card>
    </div>
  );
}
