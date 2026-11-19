import type { StatusTone } from "@/components/status-badge";
import type { PaginationParams } from "@/types/api";

/**
 * Catalogue des offres (migrations 022 à 027) — routes `/admin/offers/*`,
 * réservées à l'exploitant (niveau 1).
 *
 * Le catalogue n'est PAS codé en dur : fonctionnalités → sous-fonctionnalités
 * (chacune ouvrant une page du tableau de bord du distributeur) viennent de
 * `GET /admin/offers/features`. Chaque offre porte les clés qu'elle autorise
 * (matrice fonctionnalités × offres).
 *
 * Les organisations accèdent aux offres par des SOUSCRIPTIONS (une par groupe
 * de véhicules) : voir `@/types/subscription`. Quatre offres sont
 * prédéfinies (Standard, Gold, Premium, Platinum) ; toutes sont modifiables.
 */

export const OFFER_STATUSES = ["active", "inactive"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];
export const offerStatusMeta: Record<OfferStatus, { label: string; tone: StatusTone }> = {
  active: { label: "Commercialisée", tone: "success" },
  inactive: { label: "Inactive", tone: "neutral" },
};

export const OFFER_PERIODICITIES = ["monthly", "quarterly", "semiannual", "annual"] as const;
export type OfferPeriodicity = (typeof OFFER_PERIODICITIES)[number];
export const offerPeriodicityMeta: Record<OfferPeriodicity, { label: string; short: string }> = {
  monthly: { label: "Mensuelle", short: "mois" },
  quarterly: { label: "Trimestrielle", short: "trimestre" },
  semiannual: { label: "Semestrielle", short: "semestre" },
  annual: { label: "Annuelle", short: "an" },
};

/**
 * Ordre d'affichage des offres prédéfinies, par code. Les offres
 * personnalisées viennent ensuite, par ordre alphabétique.
 */
export const OFFER_DISPLAY_ORDER = ["STANDARD", "GOLD", "PREMIUM", "PLATINUM"] as const;

/** Trie : Standard, Gold, Premium, Platinum, puis les autres offres par nom. */
export function compareOffers(a: Pick<Offer, "code" | "name">, b: Pick<Offer, "code" | "name">): number {
  const rank = (code: string) => {
    const i = (OFFER_DISPLAY_ORDER as readonly string[]).indexOf(code.toUpperCase());
    return i === -1 ? OFFER_DISPLAY_ORDER.length : i;
  };
  return rank(a.code) - rank(b.code) || a.name.localeCompare(b.name, "fr");
}

/** Code : lettres, chiffres, `-` et `_`, 2 à 40 caractères (stocké en majuscules). */
export const OFFER_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,39}$/;
export const GPS_HISTORY_DAYS = { min: 1, max: 3650, default: 30 } as const;

/** Sous-fonctionnalité : une page du tableau de bord du distributeur (ligne de la matrice). */
export interface SubFeature {
  id: number;
  key: string;
  label: string;
  path: string;
}

/** Fonctionnalité du catalogue : un nom et ses sous-fonctionnalités (même découpage que le menu). */
export interface Feature {
  id: number;
  name: string;
  subFeatures: SubFeature[];
}

export interface Offer {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** `numeric(14,2)` sérialisé en chaîne : « 15000.00 ». Prix de référence par véhicule et par période. */
  price: string;
  currency: string;
  periodicity: OfferPeriodicity;
  status: OfferStatus;
  /** Date de commercialisation, AAAA-MM-JJ. */
  launchedOn: string | null;
  /** `null` = véhicules illimités. */
  maxVehicles: number | null;
  gpsHistoryDays: number;
  /** Clés des sous-fonctionnalités incluses (voir `SubFeature.key`). */
  featureKeys: string[];
  /** Les mêmes, rangées sous leur fonctionnalité (sous-objets). */
  features: Feature[];
  /** Pages du tableau de bord du distributeur ouvertes par l'offre. */
  paths: string[];
  /** Calculées à partir des souscriptions non résiliées. */
  stats: {
    subscriptions: number;
    activeSubscriptions: number;
    /** Véhicules couverts par les souscriptions actives. */
    vehicles: number;
  };
  /** Organisations ayant souscrit (souscription non résiliée). */
  organizations: { id: string; code: string; name: string }[];
  organizationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OfferListParams extends PaginationParams {
  search?: string;
  status?: OfferStatus;
  periodicity?: OfferPeriodicity;
  /** Offres souscrites par cette organisation. */
  organizationId?: string;
}

export interface CreateOfferPayload {
  code: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  periodicity: OfferPeriodicity;
  status?: OfferStatus;
  launchedOn?: string;
  maxVehicles?: number | null;
  gpsHistoryDays?: number;
  featureKeys?: string[];
}

/** Toute offre est modifiable. `null` efface (description, date, limite → illimité). */
export interface UpdateOfferPayload {
  code?: string;
  name?: string;
  description?: string | null;
  price?: number;
  currency?: string;
  periodicity?: OfferPeriodicity;
  status?: OfferStatus;
  launchedOn?: string | null;
  maxVehicles?: number | null;
  gpsHistoryDays?: number;
  featureKeys?: string[];
}
