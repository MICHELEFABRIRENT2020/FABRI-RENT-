"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertTenant, WRITE_ROLES } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { ExpenseCategory } from "@/generated/prisma/client";

export async function createExpense(params: { category: ExpenseCategory; amount: number; description?: string; date: string }) {
  const { user, tenantId } = await assertTenant();
  if (!WRITE_ROLES.includes(user.role)) throw new Error("Non autorizzato.");

  const expense = await prisma.expense.create({
    data: {
      tenantId,
      category: params.category,
      amount: params.amount,
      description: params.description,
      date: new Date(params.date),
      operatorId: user.id,
    },
  });

  await logAudit({ tenantId, actorId: user.id, action: "expense_created", entityType: "expense", entityId: expense.id, metadata: { category: params.category, amount: params.amount } });
  revalidatePath("/desk/cassa");
}

export async function deleteExpense(id: string) {
  const { user, tenantId } = await assertTenant();
  if (!WRITE_ROLES.includes(user.role)) throw new Error("Non autorizzato.");

  await prisma.expense.delete({ where: { id, tenantId } });
  await logAudit({ tenantId, actorId: user.id, action: "expense_deleted", entityType: "expense", entityId: id });
  revalidatePath("/desk/cassa");
}
