import { formatNumber } from "@/lib/format";
import { type Feature, type Offer, offerPeriodicityMeta } from "@/types/offer";

/** Nombre total de sous-fonctionnalités du catalogue. */
export function countSubFeatures(catalogue: Feature[]): number {
  return catalogue.reduce((n, f) => n + f.subFeatures.length, 0);
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
