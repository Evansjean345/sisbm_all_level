"use client";

import { useState } from "react";

import Link from "next/link";

import { Archive, FileSignature, MoreVertical, Pencil, Rocket, Trash2 } from "lucide-react";
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
import { useDeleteOffer, useUpdateOffer } from "@/hooks/api/use-offers";
import { getErrorMessage } from "@/lib/axios";
import type { Offer, OfferStatus } from "@/types/offer";

import { OfferFormDialog } from "./offer-form-dialog";

type DialogKind = "edit" | "activate" | "delete";

export function OfferRowActions({ offer }: { offer: Offer }) {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const update = useUpdateOffer();
  const remove = useDeleteOffer();
  const close = (o: boolean) => !o && setDialog(null);

  function setStatus(status: OfferStatus, message: string) {
    // Commercialiser sans date : le formulaire la demande.
    if (status === "active" && !offer.launchedOn) {
      toast.info("Date de commercialisation requise", { description: "Renseignez-la pour commercialiser l'offre." });
      setDialog("activate");
      return;
    }
    update.mutate(
      { id: offer.id, payload: { status } },
      {
        onSuccess: () => toast.success(message, { description: offer.name }),
        onError: (error) => toast.error("Changement impossible", { description: getErrorMessage(error) }),
      },
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions pour l'offre ${offer.name}`}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60" align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setDialog("edit")}>
              <Pencil />
              Modifier
            </DropdownMenuItem>
            {offer.status === "active" ? (
              <DropdownMenuItem onClick={() => setStatus("inactive", "Offre retirée du catalogue")}>
                <Archive />
                Retirer du catalogue
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setStatus("active", "Offre commercialisée")}>
                <Rocket />
                Commercialiser
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/subscriptions?offerId=${offer.id}`} prefetch={false}>
                <FileSignature />
                Voir les souscriptions
                {offer.stats.subscriptions ? (
                  <span className="ml-auto text-muted-foreground text-xs">{offer.stats.subscriptions}</span>
                ) : null}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDialog("delete")}>
            <Trash2 />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <OfferFormDialog
        offer={offer}
        open={dialog === "edit" || dialog === "activate"}
        activate={dialog === "activate"}
        onOpenChange={close}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={close}
        title={`Supprimer l'offre ${offer.name} ?`}
        description={
          offer.stats.subscriptions
            ? `${offer.stats.subscriptions} souscription(s) utilisent cette offre : la suppression sera refusée. Retirez-la plutôt du catalogue.`
            : "Suppression logique : l'offre sort du catalogue mais reste lisible dans le journal d'audit."
        }
        confirmLabel="Supprimer"
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(offer.id, {
            onSuccess: () => {
              toast.success("Offre supprimée", { description: offer.name });
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
