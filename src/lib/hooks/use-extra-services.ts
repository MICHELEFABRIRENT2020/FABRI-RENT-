"use client";

import { useEffect, useState } from "react";
import type { ExtraServiceDto } from "@/components/booking/extras-selector";

export function useExtraServices() {
  const [extras, setExtras] = useState<ExtraServiceDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/extra-services")
      .then((r) => r.json())
      .then((data) => setExtras(data.extras ?? []))
      .finally(() => setLoading(false));
  }, []);

  return { extras, loading };
}

export function computeExtrasTotalPreview(
  extras: ExtraServiceDto[],
  selected: { extraServiceId: string; quantity: number }[],
  days: number
): number {
  return selected.reduce((sum, sel) => {
    const extra = extras.find((e) => e.id === sel.extraServiceId);
    if (!extra) return sum;
    const multiplier = extra.perDay ? days : 1;
    return sum + Number(extra.price) * sel.quantity * multiplier;
  }, 0);
}
