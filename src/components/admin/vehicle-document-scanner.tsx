"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentScanner } from "@/components/booking/document-scanner";

export function VehicleDocumentScanner() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documenti veicolo (libretto, ecc.)</CardTitle>
      </CardHeader>
      <CardContent>
        <DocumentScanner kind="libretto" />
      </CardContent>
    </Card>
  );
}
