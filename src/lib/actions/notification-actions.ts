"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertTenant } from "@/lib/session";

export async function markNotificationRead(id: string) {
  const { tenantId } = await assertTenant();
  await prisma.notification.update({ where: { id, tenantId }, data: { readAt: new Date() } });
  revalidatePath("/desk");
  revalidatePath("/admin");
}

export async function dismissNotification(id: string) {
  const { tenantId } = await assertTenant();
  await prisma.notification.update({ where: { id, tenantId }, data: { dismissedAt: new Date() } });
  revalidatePath("/desk");
  revalidatePath("/admin");
}

export async function dismissAllNotifications() {
  const { tenantId } = await assertTenant();
  await prisma.notification.updateMany({ where: { tenantId, dismissedAt: null }, data: { dismissedAt: new Date() } });
  revalidatePath("/desk");
  revalidatePath("/admin");
}
