import { StatusBadge } from "@/components/status-badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, formatNumber } from "@/lib/format";
import { type Offer, offerPeriodicityMeta, offerStatusMeta } from "@/types/offer";

import { OfferRowActions } from "./offer-row-actions";
import { formatLimit, formatOfferPrice, launchLabel } from "./offer-utils";

export function OfferCard({ offer, featureCount }: { offer: Offer; featureCount: number }) {
  const meta = offerStatusMeta[offer.status] ?? { label: offer.status, tone: "neutral" as const };
  const organizations = offer.organizations;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardDescription className="font-mono text-xs">{offer.code}</CardDescription>
        <CardTitle className="text-xl">{offer.name}</CardTitle>
        <CardAction>
          <OfferRowActions offer={offer} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-lg tabular-nums">{formatOfferPrice(offer)}</span>
          <span className="text-muted-foreground text-xs">
            Facturation {offerPeriodicityMeta[offer.periodicity]?.label.toLowerCase() ?? offer.periodicity}
          </span>
        </div>
        {offer.description ? <p className="text-muted-foreground text-sm">{offer.description}</p> : null}

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs">Organisations</dt>
            <dd className="tabular-nums">
              {organizations.length === 0 ? (
                <span className="text-muted-foreground">Aucune</span>
              ) : (
                <Tooltip>
                  <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4">
                    {formatNumber(organizations.length)}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="flex flex-col gap-0.5">
                    {organizations.map((g) => (
                      <span key={g.id}>{g.name}</span>
                    ))}
                  </TooltipContent>
                </Tooltip>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs">Véhicules max.</dt>
            <dd className="tabular-nums">{formatLimit(offer.maxVehicles, "véhicules")}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs">Fonctionnalités</dt>
            <dd className="tabular-nums">
              {offer.features.length} / {featureCount}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs">Historique GPS</dt>
            <dd>{formatLimit(offer.gpsHistoryDays, "jours")}</dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          <span className="text-muted-foreground text-xs">{launchLabel(offer, (d) => formatDate(d))}</span>
        </div>
      </CardContent>
    </Card>
  );
}
