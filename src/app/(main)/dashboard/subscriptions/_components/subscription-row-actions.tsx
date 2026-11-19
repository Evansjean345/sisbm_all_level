"use client";

import { useState } from "react";

import { Ban, CirclePause, CirclePlay, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteSubscription } from "@/hooks/api/use-subscriptions";
import { getErrorMessage } from "@/lib/axios";
import { SUBSCRIPTION_TRANSITIONS, type Subscription, type SubscriptionStatus } from "@/types/subscription";

import { SubscriptionFormDialog } from "./subscription-form-dialog";
import { STATUS_ACTIONS, SubscriptionStatusDialog } from "./subscription-status-dialog";

const STATUS_ICONS: Partial<Record<SubscriptionStatus, typeof CirclePlay>> = {
  active: CirclePlay,
  suspended: CirclePause,
  terminated: Ban,
};

export function SubscriptionRowActions({ subscription }: { subscription: Subscription }) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [target, setTarget] = useState<SubscriptionStatus | null>(null);
  const remove = useDeleteSubscription();
  const transitions = SUBSCRIPTION_TRANSITIONS[subscription.status];
  const editable = subscription.status !== "terminated";
  const deletable = subscription.status !== "active";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions pour la souscription ${subscription.reference}`}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={!editable} onClick={() => setDialog("edit")}>
              <Pencil />
              Modifier
            </DropdownMenuItem>
            {transitions.map((status) => {
              const Icon = STATUS_ICONS[status] ?? CirclePlay;
              return (
                <DropdownMenuItem
                  key={status}
                  variant={status === "terminated" ? "destructive" : "default"}
                  onClick={() => setTarget(status)}
                >
                  <Icon />
                  {STATUS_ACTIONS[status].verb(subscription.status)}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={!deletable} onClick={() => setDialog("delete")}>
            <Trash2 />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SubscriptionFormDialog
        subscription={subscription}
        open={dialog === "edit"}
        onOpenChange={(o) => !o && setDialog(null)}
      />
      <SubscriptionStatusDialog
        subscription={subscription}
        target={target}
        onOpenChange={(o) => !o && setTarget(null)}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Supprimer la souscription ${subscription.reference} ?`}
        description="Suppression logique : elle sort des listes mais reste lisible dans le journal d'audit."
        confirmLabel="Supprimer"
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(subscription.id, {
            onSuccess: () => {
              toast.success("Souscription supprimée", { description: subscription.reference });
              setDialog(null);
            },
            onError: (error) => {
              toast.error("Suppression impossible", { description: getErrorMessage(error) });
              setDialog(null);
            },
          })
        }
      />
    </>
  );
}
