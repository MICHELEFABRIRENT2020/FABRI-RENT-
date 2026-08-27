import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffUserForm } from "@/components/admin/staff-user-form";
import { StaffUserTable } from "@/components/admin/staff-user-table";
import { requireTenant } from "@/lib/session";

export default async function AdminUsersPage() {
  const { tenantId } = await requireTenant();
  const users = await prisma.user.findMany({
    where: { tenantId, role: { not: "client" } },
    orderBy: { fullName: "asc" },
  });

  const dto = users.map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestione Utenti</h1>
      <StaffUserForm />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffUserTable users={dto} />
        </CardContent>
      </Card>
    </div>
  );
}
