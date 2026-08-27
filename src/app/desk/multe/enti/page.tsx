import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { IssuingAuthorityDirectory } from "@/components/desk/issuing-authority-directory";

export default async function IssuingAuthoritiesPage() {
  const { tenantId } = await requireTenant();
  const authorities = await prisma.issuingAuthority.findMany({ where: { tenantId }, orderBy: { name: "asc" } });

  const dto = authorities.map((a) => ({
    id: a.id,
    name: a.name,
    pec: a.pec,
    source: a.source,
    verifiedAt: a.verifiedAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Rubrica Enti Verbalizzanti / PEC</h1>
      <IssuingAuthorityDirectory authorities={dto} />
    </div>
  );
}
