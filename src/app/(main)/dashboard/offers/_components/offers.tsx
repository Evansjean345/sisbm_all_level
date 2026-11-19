"use client";

import { useState } from "react";

import { Package, Plus, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useOfferFeatures, useOffers } from "@/hooks/api/use-offers";

import { FeatureMatrix } from "./feature-matrix";
import { OfferCard } from "./offer-card";
import { OfferFormDialog } from "./offer-form-dialog";

/**
 * Catalogue des offres : cartes (tarif, organisations, limites, statut) puis
 * matrice modules × offres. Tout vient de l'API (`/admin/offers`,
 * `/admin/offers/features`).
 */
export function Offers() {
  const [createOpen, setCreateOpen] = useState(false);
  const offers = useOffers({ perPage: 100 });
  const features = useOfferFeatures();

  const rows = offers.data?.data ?? [];
  const featureList = features.data ?? [];
  const pending = offers.isPending || features.isPending;
  const error = offers.isError ? offers : features.isError ? features : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Catalogue des offres"
        description="Offres commerciales, tarifs de référence et fonctionnalités incluses."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                void offers.refetch();
                void features.refetch();
              }}
              disabled={offers.isFetching}
            >
              <RefreshCw data-icon="inline-start" className={offers.isFetching ? "animate-spin" : undefined} />
              Actualiser
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" />
              Nouvelle offre
            </Button>
          </>
        }
      />

      {pending ? (
        <Card>
          <CardContent>
            <LoadingRows rows={6} />
          </CardContent>
        </Card>
      ) : error ? (
        <ErrorState error={error.error} onRetry={() => error.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="Aucune offre"
          description="Créez la première offre du catalogue."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" />
              Nouvelle offre
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rows.map((offer) => (
              <OfferCard key={offer.id} offer={offer} featureCount={featureList.length} />
            ))}
          </div>
          <FeatureMatrix offers={rows} features={featureList} />
        </>
      )}

      <OfferFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
