"use client";

import { useEffect, useState } from "react";

import { Cpu, Gauge, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { severityMeta } from "@/components/alerting-labels";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/query-state";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrganizationFilter, OrganizationSelect } from "@/features/common/organization/organization-select";
import { useGeofences, useSaveSpeedPolicy, useSpeedPolicies, useToggleClientRule } from "@/hooks/api/use-client-rules";
import { useVehicles } from "@/hooks/api/use-vehicles";
import { getErrorMessage } from "@/lib/axios";
import { SEVERITIES, type Severity } from "@/types/alerting";
import type { SpeedPolicy, SpeedPolicyPayload, SpeedScope } from "@/types/client-rules";

const SCOPE_LABELS: Record<SpeedScope, string> = {
  global: "Tous les véhicules",
  zone: "Dans une zone",
  vehicle: "Véhicules précis",
};

/** Contrôle de vitesse (rubrique client) — même écran pour la plateforme Client et la fiche client. */
export function SpeedControl({ organizationId: scoped }: { organizationId?: string } = {}) {
  const [filterOrg, setFilterOrg] = useState<string | undefined>();
  const organizationId = scoped ?? filterOrg;
  const policies = useSpeedPolicies(organizationId);
  const zones = useGeofences(organizationId);
  const toggle = useToggleClientRule();
  const [editing, setEditing] = useState<{ open: boolean; policy: SpeedPolicy | null }>({ open: false, policy: null });
  const rows = policies.data ?? [];
  const zoneName = (id: string | null) => zones.data?.find((z) => z.id === id)?.name ?? "—";

  const newButton = (
    <Button onClick={() => setEditing({ open: true, policy: null })}>
      <Plus data-icon="inline-start" />
      Nouvelle politique
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {scoped ? (
        <div className="flex justify-end">{newButton}</div>
      ) : (
        <PageHeader
          title="Contrôle de vitesse"
          description="Limites de vitesse par client, zone ou véhicule, avec tolérance, durée minimale et bridage éventuel."
          actions={
            <>
              <OrganizationFilter value={filterOrg} onChange={setFilterOrg} />
              {newButton}
            </>
          }
        />
      )}
      <Alert>
        <Gauge />
        <AlertTitle>Ordre de priorité des limites</AlertTitle>
        <AlertDescription>
          Appliqué ici : véhicule, puis zone, puis limite globale (la plus précise l'emporte). Décision SISBM à valider
          (§15). Le bridage nécessite un boîtier compatible.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="px-0">
          {policies.isPending ? (
            <LoadingRows rows={4} />
          ) : policies.isError ? (
            <div className="px-4">
              <ErrorState error={policies.error} onRetry={() => policies.refetch()} />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4">
              <EmptyState icon={<Gauge />} title="Aucune politique de vitesse" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    {scoped ? null : <TableHead className="hidden md:table-cell">Client</TableHead>}
                    <TableHead>Portée</TableHead>
                    <TableHead className="text-right">Limite</TableHead>
                    <TableHead className="hidden sm:table-cell">Déclenchement</TableHead>
                    <TableHead className="hidden lg:table-cell">Gravité</TableHead>
                    <TableHead className="hidden lg:table-cell">Bridage</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Modifier</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      {scoped ? null : <TableCell className="hidden md:table-cell">{p.organization.name}</TableCell>}
                      <TableCell>
                        {SCOPE_LABELS[p.scope]}
                        <span className="block text-muted-foreground text-xs">
                          {p.scope === "zone"
                            ? zoneName(p.zoneId)
                            : p.scope === "vehicle"
                              ? `${p.vehicleIds.length} véhicule(s)`
                              : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{p.limitKph} km/h</TableCell>
                      <TableCell className="hidden text-muted-foreground text-xs sm:table-cell">
                        Au-delà de {p.limitKph + p.toleranceKph} km/h pendant {p.minDurationSeconds} s
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <StatusBadge tone={severityMeta[p.severity].tone}>{severityMeta[p.severity].label}</StatusBadge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {p.limiterEnabled ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Cpu className="size-3.5" /> Actif
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Non</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={p.active}
                          aria-label={p.active ? "Désactiver" : "Activer"}
                          onCheckedChange={(active) => toggle.mutate({ kind: "speed", id: p.id, active })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Modifier ${p.name}`}
                          onClick={() => setEditing({ open: true, policy: p })}
                        >
                          <Pencil />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SpeedPolicyDialog
        open={editing.open}
        policy={editing.policy}
        organizationId={scoped ?? filterOrg}
        lockOrganization={Boolean(scoped)}
        onOpenChange={(open) => setEditing((s) => ({ ...s, open }))}
      />
    </div>
  );
}

function SpeedPolicyDialog({
  open,
  policy,
  organizationId,
  lockOrganization,
  onOpenChange,
}: {
  open: boolean;
  policy: SpeedPolicy | null;
  organizationId?: string;
  lockOrganization: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<SpeedPolicyPayload | null>(null);
  const save = useSaveSpeedPolicy();
  const zones = useGeofences(form?.organizationId ? form.organizationId : undefined);
  const vehicles = useVehicles(
    { organizationId: form?.organizationId ? form.organizationId : undefined, perPage: 100 },
    { enabled: Boolean(form?.organizationId) },
  );

  useEffect(() => {
    if (!open) return;
    if (policy) {
      const { id: _i, organization: _o, updatedAt: _u, ...rest } = policy;
      setForm(rest);
    } else {
      setForm({
        organizationId: organizationId ?? "",
        name: "",
        scope: "global",
        zoneId: null,
        vehicleIds: [],
        limitKph: 90,
        toleranceKph: 5,
        minDurationSeconds: 30,
        severity: "medium",
        limiterEnabled: false,
        active: true,
      });
    }
  }, [open, policy, organizationId]);

  if (!form) return null;
  const set = <K extends keyof SpeedPolicyPayload>(k: K, v: SpeedPolicyPayload[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));
  const num = (v: string) => Math.max(0, Number(v) || 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !save.isPending && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{policy ? "Modifier la politique" : "Nouvelle politique de vitesse"}</DialogTitle>
          <DialogDescription>
            Une alerte est déclenchée lorsque le seuil de vitesse est dépassé pendant la durée minimale.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4">
          {lockOrganization ? null : (
            <Field className="gap-1.5">
              <FieldLabel htmlFor="sp-org">Client</FieldLabel>
              <OrganizationSelect
                id="sp-org"
                className="w-full"
                value={form.organizationId || undefined}
                onChange={(id) => set("organizationId", id ?? "")}
              />
            </Field>
          )}
          <Field className="gap-1.5">
            <FieldLabel htmlFor="sp-name">Nom</FieldLabel>
            <Input
              id="sp-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex. : Limite ville 50 km/h"
            />
          </Field>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="sp-scope">Portée</FieldLabel>
            <Select value={form.scope} onValueChange={(v) => set("scope", v as SpeedScope)}>
              <SelectTrigger id="sp-scope" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {(Object.keys(SCOPE_LABELS) as SpeedScope[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SCOPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          {form.scope === "zone" ? (
            <Field className="gap-1.5">
              <FieldLabel htmlFor="sp-zone">Zone</FieldLabel>
              <Select value={form.zoneId ?? ""} onValueChange={(v) => set("zoneId", v)}>
                <SelectTrigger id="sp-zone" className="w-full">
                  <SelectValue placeholder="Choisir une zone du client" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    {(zones.data ?? []).map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          {form.scope === "vehicle" ? (
            <Field className="gap-1.5">
              <FieldLabel htmlFor="sp-vehicles">Véhicules ({form.vehicleIds.length})</FieldLabel>
              <Select
                value=""
                onValueChange={(v) => !form.vehicleIds.includes(v) && set("vehicleIds", [...form.vehicleIds, v])}
              >
                <SelectTrigger id="sp-vehicles" className="w-full">
                  <SelectValue placeholder="Ajouter un véhicule" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-64">
                  <SelectGroup>
                    {(vehicles.data?.data ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.registration}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                {form.vehicleIds
                  .map((id) => vehicles.data?.data.find((v) => v.id === id)?.registration ?? "…")
                  .join(", ") || "Aucun véhicule sélectionné."}
              </FieldDescription>
            </Field>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="sp-limit">Limite (km/h)</FieldLabel>
              <Input
                id="sp-limit"
                type="number"
                value={form.limitKph}
                onChange={(e) => set("limitKph", num(e.target.value))}
              />
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="sp-dur">Durée (s)</FieldLabel>
              <Input
                id="sp-dur"
                type="number"
                value={form.minDurationSeconds}
                onChange={(e) => set("minDurationSeconds", num(e.target.value))}
              />
            </Field>
          </div>
          <Field className="gap-1.5">
            <FieldLabel htmlFor="sp-sev">Gravité de l'alerte</FieldLabel>
            <Select value={form.severity} onValueChange={(v) => set("severity", v as Severity)}>
              <SelectTrigger id="sp-sev" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {severityMeta[s].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" disabled={save.isPending} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                { payload: form, id: policy?.id },
                {
                  onSuccess: () => {
                    toast.success("Politique enregistrée", { description: form.name });
                    onOpenChange(false);
                  },
                  onError: (e) => toast.error("Enregistrement impossible", { description: getErrorMessage(e) }),
                },
              )
            }
          >
            {save.isPending ? <Spinner data-icon="inline-start" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
