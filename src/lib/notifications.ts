/**
 * Notification / alert center (section 25).
 *
 * There is no background job runner in this deployment, so alerts are
 * "computed on read": `refreshNotifications(tenantId)` recomputes every
 * open condition from the live tables (unsigned contracts, imminent
 * returns, expiring compliance dates, etc.) and reconciles that against
 * the stored `Notification` rows every time the desk/admin shell renders -
 * creating new alerts, refreshing changed ones, and auto-resolving ones
 * whose underlying condition cleared. Read/dismiss state set by a user is
 * preserved across refreshes since already-dismissed rows are left alone.
 */
import { prisma } from "@/lib/prisma";
import type { NotificationSeverity, NotificationType } from "@/generated/prisma/client";

const COMPLIANCE_WARNING_DAYS = 30;
const RETURN_WARNING_HOURS = 3;
const SIGNATURE_DEADLINE_HOUR = 17;

type Candidate = {
  type: NotificationType;
  severity: NotificationSeverity;
  entityType: string;
  entityId: string;
  message: string;
};

function withDeadlineHour(date: Date, hour: number): Date {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export async function refreshNotifications(tenantId: string): Promise<void> {
  const now = new Date();
  const complianceSoon = new Date(now.getTime() + COMPLIANCE_WARNING_DAYS * 24 * 60 * 60 * 1000);
  const returnSoon = new Date(now.getTime() + RETURN_WARNING_HOURS * 60 * 60 * 1000);
  const candidates: Candidate[] = [];

  const unsignedBookings = await prisma.booking.findMany({
    where: {
      tenantId,
      serviceType: "rent",
      status: { in: ["confirmed", "checked_in"] },
      signatureStatus: { not: "signed" },
    },
    select: { id: true, contractNumber: true, signatureSentAt: true, checkInAt: true, startDate: true },
  });
  for (const b of unsignedBookings) {
    const reference = b.signatureSentAt ?? b.checkInAt ?? b.startDate;
    const deadline = withDeadlineHour(reference, SIGNATURE_DEADLINE_HOUR);
    const overdue = now > deadline;
    candidates.push({
      type: "contratto_non_firmato",
      severity: overdue ? "critical" : "warning",
      entityType: "booking",
      entityId: b.id,
      message: `Contratto #${b.contractNumber ?? b.id.slice(0, 8)} non firmato${overdue ? " - termine ore 17:00 scaduto" : ""}.`,
    });
  }

  const imminentReturns = await prisma.booking.findMany({
    where: { tenantId, serviceType: "rent", status: "checked_in", actualReturnAt: null, endDate: { lte: returnSoon } },
    include: { vehicle: true },
  });
  for (const b of imminentReturns) {
    const late = b.endDate < now;
    candidates.push({
      type: "rientro_imminente",
      severity: late ? "critical" : "warning",
      entityType: "booking",
      entityId: b.id,
      message: `Rientro ${late ? "in ritardo" : "imminente"}: ${b.vehicle?.plate ?? b.vehicle?.name ?? "veicolo"} (contratto #${b.contractNumber ?? b.id.slice(0, 8)}).`,
    });
  }

  const unpaidBookings = await prisma.booking.findMany({
    where: { tenantId, serviceType: "rent", status: { not: "canceled" }, paymentStatus: { not: "paid" }, endDate: { lt: now } },
    select: { id: true, contractNumber: true },
  });
  for (const b of unpaidBookings) {
    candidates.push({
      type: "pagamento_scaduto",
      severity: "critical",
      entityType: "booking",
      entityId: b.id,
      message: `Pagamento scaduto per il contratto #${b.contractNumber ?? b.id.slice(0, 8)}.`,
    });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId, status: { not: "fuori_flotta" } },
    select: { id: true, name: true, plate: true, status: true, bolloExpiryDate: true, revisioneExpiryDate: true },
  });
  for (const v of vehicles) {
    const label = v.plate ?? v.name;
    if (v.bolloExpiryDate && v.bolloExpiryDate <= complianceSoon) {
      const expired = v.bolloExpiryDate < now;
      candidates.push({
        type: "bollo_scadenza",
        severity: expired ? "critical" : "warning",
        entityType: "vehicle",
        entityId: v.id,
        message: `Bollo ${expired ? "scaduto" : "in scadenza"} per ${label}.`,
      });
    }
    if (v.revisioneExpiryDate && v.revisioneExpiryDate <= complianceSoon) {
      const expired = v.revisioneExpiryDate < now;
      candidates.push({
        type: "revisione_scadenza",
        severity: expired ? "critical" : "warning",
        entityType: "vehicle",
        entityId: v.id,
        message: `Revisione ${expired ? "scaduta" : "in scadenza"} per ${label}.`,
      });
    }
    if (v.status === "maintenance" || v.status === "guasto") {
      candidates.push({
        type: "manutenzione_scadenza",
        severity: v.status === "guasto" ? "critical" : "info",
        entityType: "vehicle",
        entityId: v.id,
        message: `Veicolo ${label} ${v.status === "guasto" ? "guasto" : "in manutenzione"}.`,
      });
    }
  }

  const policies = await prisma.vehicleInsurancePolicy.findMany({
    where: { tenantId, periodEnd: { lte: complianceSoon } },
    include: { vehicle: true },
  });
  for (const p of policies) {
    const expired = p.periodEnd < now;
    candidates.push({
      type: "assicurazione_scadenza",
      severity: expired ? "critical" : "warning",
      entityType: "vehicle_insurance_policy",
      entityId: p.id,
      message: `Polizza assicurativa ${expired ? "scaduta" : "in scadenza"} per ${p.vehicle?.plate ?? p.vehicle?.name ?? "veicolo"} (${p.company}).`,
    });
  }

  const openDamages = await prisma.damageRecord.findMany({
    where: { tenantId, status: "aperto" },
    include: { vehicle: true },
  });
  for (const d of openDamages) {
    candidates.push({
      type: "danno",
      severity: "warning",
      entityType: "damage_record",
      entityId: d.id,
      message: `Danno aperto su ${d.vehicle?.plate ?? d.vehicle?.name ?? "veicolo"}.`,
    });
  }

  const fines = await prisma.fine.findMany({
    where: { tenantId, status: { notIn: ["pagata", "archiviata"] }, dueDate: { lte: complianceSoon } },
  });
  for (const f of fines) {
    const overdue = f.dueDate ? f.dueDate < now : false;
    candidates.push({
      type: "multa",
      severity: overdue ? "critical" : "warning",
      entityType: "fine",
      entityId: f.id,
      message: `Multa ${f.verbaleNumber} (targa ${f.plate}) ${overdue ? "scaduta" : "in scadenza"}.`,
    });
  }

  const pendingAppeals = await prisma.fine.findMany({
    where: { tenantId, status: "notificata", appealPdfUrl: null },
  });
  for (const f of pendingAppeals) {
    candidates.push({
      type: "pec_non_inviata",
      severity: "info",
      entityType: "fine",
      entityId: f.id,
      message: `Multa ${f.verbaleNumber}: ricorso/PEC non ancora predisposto per l'ente verbalizzante.`,
    });
  }

  const draftInvoices = await prisma.invoice.findMany({
    where: { tenantId, status: { in: ["draft", "error"] } },
  });
  for (const inv of draftInvoices) {
    candidates.push({
      type: "fattura_non_inviata",
      severity: inv.status === "error" ? "critical" : "info",
      entityType: "invoice",
      entityId: inv.id,
      message: `Fattura ${inv.number} non ancora inviata allo SDI${inv.status === "error" ? " (errore invio)" : ""}.`,
    });
  }

  await syncNotifications(tenantId, candidates);
}

async function syncNotifications(tenantId: string, candidates: Candidate[]): Promise<void> {
  const existing = await prisma.notification.findMany({
    where: { tenantId, dismissedAt: null },
    select: { id: true, type: true, entityId: true, message: true, severity: true },
  });
  const key = (type: string, entityId: string | null) => `${type}:${entityId ?? ""}`;
  const existingMap = new Map(existing.map((n) => [key(n.type, n.entityId), n]));
  const candidateKeys = new Set(candidates.map((c) => key(c.type, c.entityId)));

  const toCreate = candidates.filter((c) => !existingMap.has(key(c.type, c.entityId)));
  const toUpdate = candidates
    .map((c) => ({ candidate: c, existing: existingMap.get(key(c.type, c.entityId)) }))
    .filter((x): x is { candidate: Candidate; existing: NonNullable<typeof x.existing> } =>
      Boolean(x.existing && (x.existing.message !== x.candidate.message || x.existing.severity !== x.candidate.severity))
    );
  const toResolve = existing.filter((n) => !candidateKeys.has(key(n.type, n.entityId)));

  await Promise.all([
    ...toCreate.map((c) =>
      prisma.notification.create({
        data: {
          tenantId,
          type: c.type,
          severity: c.severity,
          entityType: c.entityType,
          entityId: c.entityId,
          message: c.message,
        },
      })
    ),
    ...toUpdate.map(({ candidate, existing: ex }) =>
      prisma.notification.update({ where: { id: ex.id }, data: { message: candidate.message, severity: candidate.severity } })
    ),
    toResolve.length > 0
      ? prisma.notification.updateMany({ where: { id: { in: toResolve.map((n) => n.id) } }, data: { dismissedAt: new Date() } })
      : Promise.resolve(undefined),
  ]);
}

export async function listActiveNotifications(tenantId: string) {
  return prisma.notification.findMany({
    where: { tenantId, dismissedAt: null },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 50,
  });
}
