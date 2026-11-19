"use client";

import { Fragment } from "react";

import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUpdateOffer } from "@/hooks/api/use-offers";
import { getErrorMessage } from "@/lib/axios";
import type { Feature, Offer, SubFeature } from "@/types/offer";

/**
 * Matrice fonctionnalités × offres : chaque case ajoute ou retire une
 * sous-fonctionnalité d'une offre (`PATCH /admin/offers/:id { featureKeys }`).
 * Fonctionnalités et sous-fonctionnalités viennent du catalogue de l'API.
 */
export function FeatureMatrix({ offers, catalogue }: { offers: Offer[]; catalogue: Feature[] }) {
  const update = useUpdateOffer();

  function toggle(offer: Offer, feature: SubFeature, checked: boolean) {
    const keys = new Set(offer.featureKeys);
    if (checked) keys.add(feature.key);
    else keys.delete(feature.key);
    update.mutate(
      { id: offer.id, payload: { featureKeys: [...keys] } },
      {
        onSuccess: () =>
          toast.success(checked ? "Fonctionnalité ajoutée" : "Fonctionnalité retirée", {
            description: `${feature.label} — ${offer.name}`,
          }),
        onError: (error) => toast.error("Modification impossible", { description: getErrorMessage(error) }),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matrice des fonctionnalités</CardTitle>
        <CardDescription>
          Droits commerciaux par offre, rangés par module. Chaque fonctionnalité ouvre une page du tableau de bord Admin
          aux organisations qui détiennent l'offre.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-64">Fonctionnalité</TableHead>
                {offers.map((offer) => (
                  <TableHead key={offer.id} className="text-center">
                    {offer.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogue.map(({ id, name, subFeatures }) => (
                <Fragment key={id}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell
                      colSpan={offers.length + 1}
                      className="py-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide"
                    >
                      {name}
                    </TableCell>
                  </TableRow>
                  {subFeatures.map((feature) => (
                    <TableRow key={feature.key}>
                      <TableCell>
                        <span className="flex flex-col">
                          <span>{feature.label}</span>
                          <span className="font-mono text-muted-foreground text-xs">{feature.path}</span>
                        </span>
                      </TableCell>
                      {offers.map((offer) => (
                        <TableCell key={offer.id} className="text-center">
                          <Checkbox
                            className="align-middle"
                            checked={offer.featureKeys.includes(feature.key)}
                            disabled={update.isPending}
                            onCheckedChange={(c) => toggle(offer, feature, c === true)}
                            aria-label={`${feature.label} dans l'offre ${offer.name}`}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
