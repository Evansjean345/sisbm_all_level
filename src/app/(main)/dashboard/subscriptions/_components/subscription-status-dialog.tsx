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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useSetSubscriptionStatus } from "@/hooks/api/use-subscriptions";
import { getErrorMessage } from "@/lib/axios";
import type { Subscription, SubscriptionStatus } from "@/types/subscription";

/** Libellés des actions de changement de statut, selon le statut visé. */
export const STATUS_ACTIONS: Record<
  SubscriptionStatus,
  { verb: (from: SubscriptionStatus) => string; done: string; effect: string; destructive?: boolean }
> = {
  draft: { verb: () => "Repasser en brouillon", done: "Souscription en brouillon", effect: "" },
  active: {
    verb: (from) => (from === "suspended" ? "Réactiver" : "Activer"),
    done: "Souscription active",
    effect: "Les pages de l'offre s'ouvrent dans le tableau de bord du client.",
  },
  suspended: {
    verb: () => "Suspendre",
    done: "Souscription suspendue",
    effect: "Les pages de l'offre disparaissent du tableau de bord du client jusqu'à la réactivation.",
  },
  terminated: {
    verb: () => "Résilier",
    done: "Souscription résiliée",
    effect:
      "Définitif : la souscription est figée, la date de fin est renseignée et la flotte peut souscrire une nouvelle offre.",
    destructive: true,
  },
};

/** Changement de statut avec motif facultatif (tracé dans le journal d'audit). */
export function SubscriptionStatusDialog({
  subscription,
  target,
  onOpenChange,
}: {
  subscription: Subscription;
  /** Statut visé ; `null` = fermé. */
  target: SubscriptionStatus | null;
  onOpenChange: (open: boolean) => void;
}) {
  const setStatus = useSetSubscriptionStatus();
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (target) setReason("");
  }, [target]);

  const action = target ? STATUS_ACTIONS[target] : null;

  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => !setStatus.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action?.verb(subscription.status)} la souscription {subscription.reference} ?
          </DialogTitle>
          <DialogDescription>
            {subscription.organization?.name} · {subscription.offer?.name} · {subscription.vehicleGroup?.name}.{" "}
            {action?.effect}
          </DialogDescription>
        </DialogHeader>
        <Field className="gap-1.5">
          <FieldLabel htmlFor="subscription-status-reason">Motif</FieldLabel>
          <Textarea
            id="subscription-status-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Facultatif — ex. : impayé, fin de contrat"
          />
          <FieldDescription>Conservé dans le journal d'audit.</FieldDescription>
        </Field>
        <DialogFooter>
          <Button variant="outline" disabled={setStatus.isPending} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant={action?.destructive ? "destructive" : "default"}
            disabled={setStatus.isPending || !target}
            onClick={() =>
              target &&
              setStatus.mutate(
                { id: subscription.id, status: target, reason: reason.trim() || undefined },
                {
                  onSuccess: () => {
                    toast.success(STATUS_ACTIONS[target].done, { description: subscription.reference });
                    onOpenChange(false);
                  },
                  onError: (error) => toast.error("Changement impossible", { description: getErrorMessage(error) }),
                },
              )
            }
          >
            {setStatus.isPending ? <Spinner data-icon="inline-start" /> : null}
            {action?.verb(subscription.status)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
