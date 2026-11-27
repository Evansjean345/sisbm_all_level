"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { DriverVehicleSelect } from "@/features/driver/driver-selects";
import { useCreateIncident } from "@/hooks/api/use-incidents";
import { getErrorMessage } from "@/lib/axios";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  type IncidentCategory,
  type IncidentSeverity,
  incidentCategoryLabels,
  incidentSeverityMeta,
} from "@/types/incident";

interface Draft {
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  vehicleId: string | null;
  description: string;
  /** `datetime-local` (heure du poste). */
  occurredAt: string;
}

/** Maintenant, au format de `<input type="datetime-local">`. */
function maintenantLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const vide = (): Draft => ({
  title: "",
  category: "other",
  severity: "warning",
  vehicleId: null,
  description: "",
  occurredAt: maintenantLocal(),
});

/** Ouvrir un dossier d'incident pour l'organisation de l'espace. */
export function IncidentFormDialog({
  organizationId,
  open,
  onOpenChange,
}: {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateIncident();
  const [draft, setDraft] = useState<Draft>(vide);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(vide());
      setSubmitted(false);
    }
  }, [open]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const titreInvalide = draft.title.trim().length < 3;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (titreInvalide) return;
    create.mutate(
      {
        organizationId,
        title: draft.title.trim(),
        category: draft.category,
        severity: draft.severity,
        vehicleId: draft.vehicleId,
        description: draft.description.trim() || null,
        occurredAt: draft.occurredAt ? new Date(draft.occurredAt).toISOString() : undefined,
      },
      {
        onSuccess: (incident) => {
          toast.success("Incident ouvert", { description: `${incident.reference} — ${incident.title}` });
          onOpenChange(false);
        },
        onError: (error) => toast.error("Ouverture impossible", { description: getErrorMessage(error) }),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !create.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel incident</DialogTitle>
          <DialogDescription>
            Le dossier reçoit une référence (INC-AAAA-000123) et s'ouvre au statut « Ouvert ».
          </DialogDescription>
        </DialogHeader>
        <form id="incident-form" noValidate onSubmit={submit}>
          <FieldGroup className="gap-4">
            <Field className="gap-1.5" data-invalid={submitted && titreInvalide}>
              <FieldLabel htmlFor="incident-title">Titre</FieldLabel>
              <Input
                id="incident-title"
                value={draft.title}
                maxLength={160}
                placeholder="Ex. : vol de carburant signalé"
                aria-invalid={submitted && titreInvalide}
                onChange={(e) => set("title", e.target.value)}
              />
              {submitted && titreInvalide ? (
                <FieldDescription className="text-destructive">3 caractères au moins.</FieldDescription>
              ) : null}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="incident-category">Catégorie</FieldLabel>
                <Select value={draft.category} onValueChange={(v) => set("category", v as IncidentCategory)}>
                  <SelectTrigger id="incident-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectGroup>
                      {INCIDENT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {incidentCategoryLabels[c]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="incident-severity">Gravité</FieldLabel>
                <Select value={draft.severity} onValueChange={(v) => set("severity", v as IncidentSeverity)}>
                  <SelectTrigger id="incident-severity" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectGroup>
                      {INCIDENT_SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {incidentSeverityMeta[s].label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="incident-vehicle">Véhicule</FieldLabel>
                <DriverVehicleSelect
                  id="incident-vehicle"
                  organizationId={organizationId}
                  value={draft.vehicleId}
                  onChange={(id) => set("vehicleId", id)}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="incident-occurred">Survenu le</FieldLabel>
                <Input
                  id="incident-occurred"
                  type="datetime-local"
                  value={draft.occurredAt}
                  max={maintenantLocal()}
                  onChange={(e) => set("occurredAt", e.target.value)}
                />
              </Field>
            </div>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="incident-description">Description</FieldLabel>
              <Textarea
                id="incident-description"
                rows={4}
                maxLength={2000}
                value={draft.description}
                placeholder="Circonstances, lieu, personnes prévenues…"
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Annuler
          </Button>
          <Button type="submit" form="incident-form" disabled={create.isPending}>
            Ouvrir l'incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
