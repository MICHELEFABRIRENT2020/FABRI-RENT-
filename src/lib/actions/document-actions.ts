"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertTenant, WRITE_ROLES } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import type { DocumentEntityType } from "@/lib/document-types";

export async function createDocumentRecord(params: {
  entityType: DocumentEntityType;
  entityId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  notes?: string;
}) {
  const { user, tenantId } = await assertTenant();
  if (!WRITE_ROLES.includes(user.role)) throw new Error("Non autorizzato.");

  const doc = await prisma.document.create({
    data: {
      tenantId,
      entityType: params.entityType,
      entityId: params.entityId,
      fileUrl: params.fileUrl,
      fileName: params.fileName,
      fileType: params.fileType,
      notes: params.notes,
      uploadedById: user.id,
    },
  });

  await logAudit({ tenantId, actorId: user.id, action: "document_uploaded", entityType: "document", entityId: doc.id });
  revalidatePath("/desk/documenti");
}

export async function deleteDocumentRecord(id: string) {
  const { user, tenantId } = await assertTenant();
  if (!WRITE_ROLES.includes(user.role)) throw new Error("Non autorizzato.");

  await prisma.document.delete({ where: { id, tenantId } });
  await logAudit({ tenantId, actorId: user.id, action: "document_deleted", entityType: "document", entityId: id });
  revalidatePath("/desk/documenti");
}
