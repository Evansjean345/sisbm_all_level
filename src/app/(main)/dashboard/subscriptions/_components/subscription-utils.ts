import { formatNumber } from "@/lib/format";
import { offerPeriodicityMeta } from "@/types/offer";
import type { Subscription } from "@/types/subscription";

const per = (s: Pick<Subscription, "periodicity">) =>
  s.periodicity ? (offerPeriodicityMeta[s.periodicity]?.short ?? s.periodicity) : "période";

/** « 15 000 XOF » */
export function formatMoney(value: string | number, currency: string): string {
  return `${formatNumber(value, 2)} ${currency}`;
}

/** Tarif appliqué : « 13 000 XOF / mois » */
export function formatTotal(s: Pick<Subscription, "totalPrice" | "currency" | "periodicity">): string {
  return `${formatMoney(s.totalPrice, s.currency)} / ${per(s)}`;
}

/** « 15 000,5 » ou « 15000.5 » → 15000.5 ; NaN si invalide. */
export function parseAmount(value: string): number {
  return Number(value.trim().replace(/\s/g, "").replace(",", "."));
}

/** Tarif appliqué prévisionnel côté formulaire (affichage seulement : la base fait foi). */
export function previewTotal(offerPrice: string, discount: string): number {
  const prix = parseAmount(offerPrice || "0");
  const remise = parseAmount(discount || "0");
  if (!Number.isFinite(prix) || !Number.isFinite(remise)) return 0;
  return Math.round((prix - remise) * 100) / 100;
}
