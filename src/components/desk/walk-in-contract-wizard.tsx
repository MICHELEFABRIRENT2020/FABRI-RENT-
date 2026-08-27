"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { defaultPickupValue, defaultReturnValue, datetimeLocalToISO } from "@/lib/datetime-input";
import {
  createWalkInCustomer,
  createWalkInContract,
  listVehicleCategories,
  listAvailableVehiclesForDates,
  listInsuranceOptionsForDesk,
  listExtraServicesForDesk,
} from "@/lib/actions/desk-booking-actions";

type Customer = { id: string; fullName: string; email: string; phone: string };
type Vehicle = { id: string; name: string; plate: string | null; dailyRate: string };
type InsuranceOption = { id: string; label: string; zone: string; tier: string; dailyCost: string; requiresCreditCard: boolean };
type ExtraService = { id: string; label: string; price: string; perDay: boolean };

export function WalkInContractWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Step 1: customer
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ fullName: "", email: "", phone: "" });

  // Step 2: dates + vehicle
  const [startDate, setStartDate] = useState(defaultPickupValue());
  const [endDate, setEndDate] = useState(defaultReturnValue());
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");

  // Step 3: insurance + extras
  const [insuranceOptions, setInsuranceOptions] = useState<InsuranceOption[]>([]);
  const [insuranceOptionId, setInsuranceOptionId] = useState("");
  const [extraServices, setExtraServices] = useState<ExtraService[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());
  const [paymentIntent, setPaymentIntent] = useState<"stripe" | "other">("other");

  useEffect(() => {
    listVehicleCategories().then(setCategories);
    listInsuranceOptionsForDesk().then(setInsuranceOptions);
    listExtraServicesForDesk().then(setExtraServices);
  }, []);

  useEffect(() => {
    if (customerQuery.trim().length < 2) {
      const t = setTimeout(() => setCustomerResults([]), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      fetch(`/api/desk/search-customers?q=${encodeURIComponent(customerQuery)}`)
        .then((r) => r.json())
        .then((data) => setCustomerResults(data.results ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [customerQuery]);

  useEffect(() => {
    if (!category) {
      const t = setTimeout(() => setVehicles([]), 0);
      return () => clearTimeout(t);
    }
    listAvailableVehiclesForDates({ category, startDate: datetimeLocalToISO(startDate), endDate: datetimeLocalToISO(endDate) }).then(
      (v) => {
        setVehicles(v);
        setVehicleId("");
      }
    );
  }, [category, startDate, endDate]);

  function handleCreateCustomer() {
    if (!newCustomer.fullName || !newCustomer.email || !newCustomer.phone) {
      toast.error("Compila nome, email e telefono.");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createWalkInCustomer(newCustomer);
        setCustomer(created);
        setShowNewCustomerForm(false);
        toast.success("Cliente creato.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore.");
      }
    });
  }

  function toggleExtra(id: string) {
    setSelectedExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (!customer) return toast.error("Seleziona o crea un cliente.");
    if (!vehicleId) return toast.error("Seleziona un veicolo.");
    if (!insuranceOptionId) return toast.error("Seleziona un'opzione assicurativa.");

    startTransition(async () => {
      try {
        const result = await createWalkInContract({
          customerId: customer.id,
          vehicleId,
          startDate: datetimeLocalToISO(startDate),
          endDate: datetimeLocalToISO(endDate),
          insuranceOptionId,
          extras: [...selectedExtras].map((id) => ({ extraServiceId: id, quantity: 1 })),
          paymentIntent,
        });
        toast.success("Contratto creato.");
        router.push(`/desk/prenotazioni/${result.bookingId}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {customer ? (
            <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <span>
                <span className="font-medium">{customer.fullName}</span> - {customer.email} - {customer.phone}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setCustomer(null)}>
                Cambia
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input className="pl-8" value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} placeholder="Cerca cliente per nome, email o telefono..." />
              </div>
              {customerResults.length > 0 && (
                <div className="space-y-1 rounded-md border p-1">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        setCustomer(c);
                        setCustomerResults([]);
                        setCustomerQuery("");
                      }}
                    >
                      {c.fullName} - {c.email} - {c.phone}
                    </button>
                  ))}
                </div>
              )}
              {!showNewCustomerForm ? (
                <Button variant="outline" size="sm" onClick={() => setShowNewCustomerForm(true)}>
                  + Nuovo cliente
                </Button>
              ) : (
                <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome completo</Label>
                    <Input value={newCustomer.fullName} onChange={(e) => setNewCustomer((v) => ({ ...v, fullName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer((v) => ({ ...v, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefono</Label>
                    <Input value={newCustomer.phone} onChange={(e) => setNewCustomer((v) => ({ ...v, phone: e.target.value }))} />
                  </div>
                  <Button className="sm:col-span-3 w-fit" size="sm" onClick={handleCreateCustomer} disabled={isPending}>
                    Crea cliente
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Date e veicolo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Ritiro</Label>
              <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Riconsegna</Label>
              <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {category && (
            <div className="space-y-1">
              <Label className="text-xs">Veicolo disponibile</Label>
              {vehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun veicolo disponibile in questa categoria per le date scelte.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVehicleId(v.id)}
                      className={`rounded-md border p-2 text-left text-sm transition-colors ${vehicleId === v.id ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}
                    >
                      <span className="font-medium">{v.name}</span>{" "}
                      {v.plate && <span className="font-mono text-xs text-muted-foreground">{v.plate}</span>}
                      <br />
                      <span className="text-xs text-muted-foreground">EUR {Number(v.dailyRate).toFixed(2)}/giorno</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Assicurazione ed extra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Metodo di pagamento previsto</Label>
            <RadioGroup value={paymentIntent} onValueChange={(v) => setPaymentIntent(v as "stripe" | "other")} className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="other" /> Contanti / POS / Bonifico / SumUp
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="stripe" /> Carta di credito (Stripe)
              </label>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Opzione assicurativa</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {insuranceOptions.map((o) => {
                const disabled = o.requiresCreditCard && paymentIntent !== "stripe";
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setInsuranceOptionId(o.id)}
                    className={`rounded-md border p-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${insuranceOptionId === o.id ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}
                  >
                    <span className="font-medium">{o.label}</span>{" "}
                    {o.requiresCreditCard && <Badge variant="outline">Solo carta</Badge>}
                    <br />
                    <span className="text-xs text-muted-foreground">EUR {Number(o.dailyCost).toFixed(2)}/giorno</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Extra</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {extraServices.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={selectedExtras.has(e.id)} onCheckedChange={() => toggleExtra(e.id)} />
                  {e.label} - EUR {Number(e.price).toFixed(2)}
                  {e.perDay ? "/giorno" : ""}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button size="lg" onClick={handleSubmit} disabled={isPending}>
        {isPending ? "Creazione in corso..." : "Crea contratto"}
      </Button>
    </div>
  );
}
