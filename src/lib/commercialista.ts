import { prisma } from "@/lib/prisma";
import type { ExpenseCategory, PaymentMethod } from "@/generated/prisma/client";

/**
 * Commercialista Virtuale (section: Commercialista Virtuale) - DATI
 * CONTABILI + CALCOLI DETERMINISTICI half. Every figure here comes
 * straight from a Prisma aggregate/groupBy over real rows (Payment,
 * Expense, Invoice) - there is no AI involved in this file. The AI
 * narrative (src/lib/actions/commercialista-actions.ts,
 * generateFinancialNarrative) only ever *explains* the object this
 * module returns; it is never allowed to compute or alter a number.
 *
 * This is NOT a substitute for a real accountant: it aggregates what is
 * already recorded in this system (captured payments, logged expenses,
 * issued invoices). It has no visibility into anything outside this
 * database (bank reconciliation, taxes beyond VAT already on invoices,
 * payroll, etc.).
 */

export type FinancialReport = {
  period: { from: Date; to: Date };
  entrate: { total: number; byMethod: { method: PaymentMethod; total: number; count: number }[] };
  uscite: { total: number; byCategory: { category: ExpenseCategory; total: number; count: number }[] };
  saldoNetto: number;
  iva: { imponibile: number; imposta: number; totale: number; fattureCount: number };
  anomalie: Anomaly[];
};

export type Anomaly = {
  type: "spesa_anomala" | "fattura_in_errore" | "fattura_non_inviata" | "pagamento_fallito";
  severity: "warning" | "critical";
  message: string;
  entityId: string;
};

export async function computeFinancialReport(tenantId: string, from: Date, to: Date): Promise<FinancialReport> {
  const [paymentsByMethod, expensesByCategory, invoiceAgg, failedPayments, errorInvoices, draftInvoices, expenses] =
    await Promise.all([
      prisma.payment.groupBy({
        by: ["method"],
        where: { tenantId, status: "captured", capturedAt: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.expense.groupBy({
        by: ["category"],
        where: { tenantId, date: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.invoice.aggregate({
        where: { tenantId, status: { in: ["sent", "accepted"] }, createdAt: { gte: from, lte: to } },
        _sum: { taxableAmount: true, vatAmount: true, totalAmount: true },
        _count: { _all: true },
      }),
      prisma.payment.findMany({
        where: { tenantId, status: "failed", createdAt: { gte: from, lte: to } },
        select: { id: true, amount: true, bookingId: true },
      }),
      prisma.invoice.findMany({
        where: { tenantId, status: "rejected", createdAt: { gte: from, lte: to } },
        select: { id: true, number: true, errorMessage: true },
      }),
      prisma.invoice.findMany({
        where: { tenantId, status: { in: ["draft", "error"] }, createdAt: { gte: from, lte: to } },
        select: { id: true, number: true },
      }),
      prisma.expense.findMany({ where: { tenantId, date: { gte: from, lte: to } }, select: { id: true, category: true, amount: true, description: true } }),
    ]);

  const entrateTotal = paymentsByMethod.reduce((sum, p) => sum + Number(p._sum.amount ?? 0), 0);
  const usciteTotal = expensesByCategory.reduce((sum, e) => sum + Number(e._sum.amount ?? 0), 0);

  const anomalie: Anomaly[] = [
    ...failedPayments.map((p): Anomaly => ({
      type: "pagamento_fallito",
      severity: "warning",
      message: `Pagamento fallito di EUR ${Number(p.amount).toFixed(2)} (prenotazione ${p.bookingId.slice(0, 8)}).`,
      entityId: p.id,
    })),
    ...errorInvoices.map((inv): Anomaly => ({
      type: "fattura_in_errore",
      severity: "critical",
      message: `Fattura ${inv.number} respinta dallo SDI${inv.errorMessage ? `: ${inv.errorMessage}` : "."}`,
      entityId: inv.id,
    })),
    ...draftInvoices.map((inv): Anomaly => ({
      type: "fattura_non_inviata",
      severity: "warning",
      message: `Fattura ${inv.number} non ancora inviata allo SDI.`,
      entityId: inv.id,
    })),
    ...detectAnomalousExpenses(expenses),
  ];

  return {
    period: { from, to },
    entrate: {
      total: Number(entrateTotal.toFixed(2)),
      byMethod: paymentsByMethod.map((p) => ({ method: p.method, total: Number((p._sum.amount ?? 0).toFixed(2)), count: p._count._all })),
    },
    uscite: {
      total: Number(usciteTotal.toFixed(2)),
      byCategory: expensesByCategory.map((e) => ({ category: e.category, total: Number((e._sum.amount ?? 0).toFixed(2)), count: e._count._all })),
    },
    saldoNetto: Number((entrateTotal - usciteTotal).toFixed(2)),
    iva: {
      imponibile: Number((invoiceAgg._sum.taxableAmount ?? 0).toFixed(2)),
      imposta: Number((invoiceAgg._sum.vatAmount ?? 0).toFixed(2)),
      totale: Number((invoiceAgg._sum.totalAmount ?? 0).toFixed(2)),
      fattureCount: invoiceAgg._count._all,
    },
    anomalie,
  };
}

/**
 * Deterministic outlier rule: an expense more than 2.5x its category's
 * average (within the same report period, minimum 3 samples to have a
 * meaningful average) is flagged for a human to review. Not machine
 * learning - a fixed, explainable threshold.
 */
function detectAnomalousExpenses(expenses: { id: string; category: ExpenseCategory; amount: unknown; description: string | null }[]): Anomaly[] {
  const byCategory = new Map<ExpenseCategory, number[]>();
  for (const e of expenses) {
    const list = byCategory.get(e.category) ?? [];
    list.push(Number(e.amount));
    byCategory.set(e.category, list);
  }

  const anomalies: Anomaly[] = [];
  const THRESHOLD_MULTIPLIER = 2.5;
  const MIN_SAMPLES = 3;

  for (const e of expenses) {
    const categoryAmounts = byCategory.get(e.category)!;
    if (categoryAmounts.length < MIN_SAMPLES) continue;
    const avg = categoryAmounts.reduce((s, v) => s + v, 0) / categoryAmounts.length;
    const amount = Number(e.amount);
    if (amount > avg * THRESHOLD_MULTIPLIER) {
      anomalies.push({
        type: "spesa_anomala",
        severity: "warning",
        message: `Spesa "${e.category}" di EUR ${amount.toFixed(2)} e' ${(amount / avg).toFixed(1)}x la media di categoria (EUR ${avg.toFixed(2)})${e.description ? `: ${e.description}` : ""}.`,
        entityId: e.id,
      });
    }
  }
  return anomalies;
}
