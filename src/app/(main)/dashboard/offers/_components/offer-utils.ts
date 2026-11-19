import { formatNumber } from "@/lib/format";
import { type Offer, type OfferFeature, offerPeriodicityMeta } from "@/types/offer";

/** Regroupe les fonctionnalités par module, dans l'ordre du catalogue renvoyé par l'API. */
export function groupFeaturesByModule(features: OfferFeature[]): Array<{ module: string; items: OfferFeature[] }> {
  const groups = new Map<string, OfferFeature[]>();
  for (const feature of features) {
    const items = groups.get(feature.module) ?? [];
    items.push(feature);
    groups.set(feature.module, items);
  }
  return [...groups].map(([module, items]) => ({ module, items }));
}

/** « 15 000 XOF / mois » */
export function formatOfferPrice(offer: Pick<Offer, "price" | "currency" | "periodicity">): string {
  return `${formatNumber(offer.price, 2)} ${offer.currency} / ${offerPeriodicityMeta[offer.periodicity]?.short ?? offer.periodicity}`;
}

/** `null` = illimité. */
export function formatLimit(value: number | null, unit: string): string {
  return value === null ? "Illimité" : `${formatNumber(value)} ${unit}`;
}

/** Pied de carte : date de commercialisation. */
export function launchLabel(offer: Pick<Offer, "status" | "launchedOn">, format: (d: string) => string): string {
  if (!offer.launchedOn) return "Non commercialisée";
  return `${offer.status === "active" ? "Depuis le" : "Lancement le"} ${format(offer.launchedOn)}`;
}
