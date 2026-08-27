import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingRuleForm } from "@/components/admin/pricing-rule-form";
import { PricingRuleTable } from "@/components/admin/pricing-rule-table";
import { ParkingBaseRateForm } from "@/components/admin/parking-base-rate-form";

export default async function AdminPricingPage() {
  const [rules, parkingRates] = await Promise.all([
    prisma.pricingRule.findMany({ orderBy: [{ priority: "desc" }, { createdAt: "desc" }] }),
    prisma.parkingBaseRate.findMany(),
  ]);

  const rulesDto = rules.map((r) => ({
    id: r.id,
    name: r.name,
    scope: r.scope,
    type: r.type,
    category: r.category,
    multiplier: r.multiplier.toString(),
    active: r.active,
    priority: r.priority,
  }));

  const ratesDto = parkingRates.map((r) => ({
    category: r.category,
    dailyRate: r.dailyRate.toString(),
    copertoUplift: r.copertoUplift.toString(),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tariffe Dinamiche</h1>
      <PricingRuleForm />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tariffe configurate</CardTitle>
        </CardHeader>
        <CardContent>
          <PricingRuleTable rules={rulesDto} />
        </CardContent>
      </Card>
      <ParkingBaseRateForm rates={ratesDto} />
    </div>
  );
}
