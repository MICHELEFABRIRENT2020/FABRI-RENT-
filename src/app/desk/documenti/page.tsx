import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireTenant } from "@/lib/session";
import { DocumentUploadForm } from "@/components/desk/document-upload-form";
import { formatItalianDate } from "@/lib/rental-time";

type Row = { id: string; category: string; label: string; fileUrl: string; date: Date };

export default async function DocumentsPage() {
  const { tenantId } = await requireTenant();

  const [documents, documentAudits, interventions, fines, blacklist, damages, claims, invoices, vehicles] = await Promise.all([
    prisma.document.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.documentAudit.findMany({ where: { tenantId }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.workshopIntervention.findMany({ where: { tenantId, OR: [{ documentUrl: { not: null } }, { invoiceUrl: { not: null } }] }, include: { vehicle: true }, orderBy: { date: "desc" }, take: 50 }),
    prisma.fine.findMany({ where: { tenantId, documentUrl: { not: null } }, orderBy: { violationDate: "desc" }, take: 50 }),
    prisma.blacklistEntry.findMany({ where: { tenantId }, orderBy: { date: "desc" }, take: 50 }),
    prisma.damageRecord.findMany({ where: { tenantId }, include: { vehicle: true }, orderBy: { date: "desc" }, take: 50 }),
    prisma.claim.findMany({ where: { tenantId }, include: { vehicle: true }, orderBy: { date: "desc" }, take: 50 }),
    prisma.invoice.findMany({ where: { tenantId, xmlUrl: { not: null } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.vehicle.findMany({ where: { tenantId, purchaseInvoiceUrl: { not: null } }, take: 50 }),
  ]);

  const rows: Row[] = [
    ...documents.map((d) => ({ id: d.id, category: "Generico", label: `${d.entityType} - ${d.fileName}`, fileUrl: d.fileUrl, date: d.createdAt })),
    ...documentAudits.map((d) => ({ id: d.id, category: "Cliente", label: `${d.user.fullName} - ${d.documentType}`, fileUrl: d.fileUrl, date: d.createdAt })),
    ...interventions.flatMap((i) =>
      [i.documentUrl && { id: `${i.id}-doc`, category: "Officina", label: `${i.vehicle.name} - ${i.label}`, fileUrl: i.documentUrl, date: i.date },
       i.invoiceUrl && { id: `${i.id}-inv`, category: "Officina", label: `${i.vehicle.name} - fattura`, fileUrl: i.invoiceUrl, date: i.date }].filter(Boolean) as Row[]
    ),
    ...fines.map((f) => ({ id: f.id, category: "Multa", label: `Verbale ${f.verbaleNumber} - ${f.plate}`, fileUrl: f.documentUrl as string, date: f.violationDate })),
    ...blacklist.flatMap((b) => b.documentUrls.map((url, idx) => ({ id: `${b.id}-${idx}`, category: "Blacklist", label: b.fullNameSnapshot, fileUrl: url, date: b.date }))),
    ...damages.flatMap((d) => d.documentUrls.map((url, idx) => ({ id: `${d.id}-${idx}`, category: "Danno", label: d.vehicle?.name ?? d.type, fileUrl: url, date: d.date }))),
    ...claims.flatMap((c) => c.documentUrls.map((url, idx) => ({ id: `${c.id}-${idx}`, category: "Sinistro", label: c.vehicle?.name ?? "Sinistro", fileUrl: url, date: c.date }))),
    ...invoices.map((i) => ({ id: i.id, category: "Fattura", label: `${i.number}`, fileUrl: i.xmlUrl as string, date: i.createdAt })),
    ...vehicles.map((v) => ({ id: v.id, category: "Veicolo", label: `${v.name} - fattura acquisto`, fileUrl: v.purchaseInvoiceUrl as string, date: v.purchaseDate ?? v.createdAt })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documenti</h1>
      <DocumentUploadForm />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repository documentale ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Riferimento</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={`${r.category}-${r.id}`}>
                  <TableCell className="whitespace-nowrap">{formatItalianDate(r.date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.category}</Badge>
                  </TableCell>
                  <TableCell>{r.label}</TableCell>
                  <TableCell>
                    <a href={r.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Apri
                    </a>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nessun documento.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
