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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useChangeIncidentStatus } from "@/hooks/api/use-incidents";
import { getErrorMessage } from "@/lib/axios";
import {
  INCIDENT_RESOLUTION_MIN_LENGTH,
  type Incident,
  type IncidentStatus,
  incidentStatusMeta,
} from "@/types/incident";

const AIDE: Record<IncidentStatus, string> = {
  open: "",
  in_progress: "Le dossier est pris en charge. La date de prise en charge est enregistrée.",
  resolved: "Décrivez ce qui a été fait : la résolution est conservée dans le dossier et le journal d'audit.",
  closed: "Un dossier clos ne peut plus changer de statut.",
};

/** Faire avancer un dossier : prise en charge, résolution, réouverture, clôture. */
export function IncidentStatusDialog({
  incident,
  target,
  onClose,
}: {
  incident: Incident | null;
  target: IncidentStatus | null;
  onClose: () => void;
}) {
  const change = useChangeIncidentStatus();
  const [resolution, setResolution] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const open = Boolean(incident && target);
  const exigeResolution = target === "resolved" || target === "closed";

  useEffect(() => {
    if (open) {
      setResolution(target === "in_progress" ? "" : (incident?.resolution ?? ""));
      setSubmitted(false);
    }
  }, [open, incident, target]);

  if (!incident || !target) return null;
  const meta = incidentStatusMeta[target];
  const resolutionInvalide = exigeResolution && resolution.trim().length < INCIDENT_RESOLUTION_MIN_LENGTH;
  const reouverture = incident.status === "resolved" && target === "in_progress";

  function confirmer() {
    setSubmitted(true);
    if (!incident || !target || resolutionInvalide) return;
    change.mutate(
      { id: incident.id, payload: { status: target, resolution: exigeResolution ? resolution.trim() : null } },
      {
        onSuccess: (apres) => {
          toast.success(`${apres.reference} : ${incidentStatusMeta[apres.status].label.toLowerCase()}`);
          onClose();
        },
        onError: (error) => toast.error("Changement impossible", { description: getErrorMessage(error) }),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !change.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {reouverture ? "Rouvrir" : meta.action} — {incident.reference}
          </DialogTitle>
          <DialogDescription>
            {reouverture ? "La résolution actuelle sera effacée : le dossier repasse « En cours »." : AIDE[target]}
          </DialogDescription>
        </DialogHeader>
        {exigeResolution ? (
          <Field className="gap-1.5" data-invalid={submitted && resolutionInvalide}>
            <FieldLabel htmlFor="incident-resolution">Résolution</FieldLabel>
            <Textarea
              id="incident-resolution"
              rows={4}
              maxLength={2000}
              value={resolution}
              aria-invalid={submitted && resolutionInvalide}
              placeholder={target === "closed" ? "Motif de la clôture…" : "Mesures prises…"}
              onChange={(e) => setResolution(e.target.value)}
            />
            <FieldDescription className={submitted && resolutionInvalide ? "text-destructive" : undefined}>
              {INCIDENT_RESOLUTION_MIN_LENGTH} caractères au moins.
            </FieldDescription>
          </Field>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={change.isPending}>
            Annuler
          </Button>
          <Button
            onClick={confirmer}
            disabled={change.isPending}
            variant={target === "closed" ? "destructive" : "default"}
          >
            {reouverture ? "Rouvrir" : meta.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
