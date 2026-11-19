import { formatNumber } from "@/lib/format";
import { offerPeriodicityMeta } from "@/types/offer";
import type { Subscription } from "@/types/subscription";

const per = (s: Pick<Subscription, "periodicity">) =>
  s.periodicity ? (offerPeriodicityMeta[s.periodicity]?.short ?? s.periodicity) : "période";

/** « 15 000 XOF » */
export function formatMoney(value: string | number, currency: string): string {
  return `${formatNumber(value, 2)} ${currency}`;
}

/** Tarif appliqué : « 15 000 XOF / véhicule / mois » */
export function formatUnitPrice(s: Pick<Subscription, "unitPrice" | "currency" | "periodicity">): string {
  return `${formatMoney(s.unitPrice, s.currency)} / véhicule / ${per(s)}`;
}

/** Montant : « 45 000 XOF / mois » */
export function formatAmount(s: Pick<Subscription, "amount" | "currency" | "periodicity">): string {
  return `${formatMoney(s.amount, s.currency)} / ${per(s)}`;
}

/** Montant prévisionnel côté formulaire (affichage seulement : l'API fait foi). */
export function previewAmount(unitPrice: string, vehicles: number): number {
  const n = Number(unitPrice.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100 * vehicles) / 100 : 0;
}
