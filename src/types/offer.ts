import type { StatusTone } from "@/components/status-badge";
import type { PaginationParams } from "@/types/api";

/**
 * Catalogue des offres (migrations 022 à 025) — routes `/admin/offers/*`,
 * réservées à l'exploitant (niveau 1).
 *
 * Les fonctionnalités ne sont PAS codées en dur ici : le catalogue
 * (modules → fonctionnalités, chacune ouvrant une page du tableau de bord
 * Admin) vient de `GET /admin/offers/features`, et chaque offre porte la liste
 * des clés qu'elle autorise (matrice modules × offres).
 *
 * Une offre est partagée par PLUSIEURS organisations ; une organisation ne
 * détient qu'UNE offre à la fois.
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

/** Code : lettres, chiffres, `-` et `_`, 2 à 40 caractères (stocké en majuscules). */
export const OFFER_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,39}$/;
export const GPS_HISTORY_DAYS = { min: 1, max: 3650, default: 30 } as const;

/** Une fonctionnalité vendable (ligne de la matrice), telle que l'API la décrit. */
export interface OfferFeature {
  key: string;
  label: string;
  /** Module de rattachement, pour grouper les lignes (même découpage que le menu). */
  module: string;
  /** Page du tableau de bord Admin ouverte par la fonctionnalité. */
  path: string;
}

/** Organisation détentrice d'une offre. */
export interface OfferOrganization {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  assignedAt: string;
  /** Véhicules de l'organisation — présent dans le DÉTAIL d'une offre (quota). */
  vehicles?: number;
}

export interface Offer {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** `numeric(14,2)` sérialisé en chaîne : « 25000.00 ». Montant par période. */
  price: string;
  currency: string;
  periodicity: OfferPeriodicity;
  status: OfferStatus;
  /** Date de commercialisation, AAAA-MM-JJ. */
  launchedOn: string | null;
  /** `null` = véhicules illimités. */
  maxVehicles: number | null;
  gpsHistoryDays: number;
  /** Clés des fonctionnalités incluses (voir `OfferFeature.key`). */
  features: string[];
  /** Pages du tableau de bord Admin ouvertes par l'offre. */
  paths: string[];
  organizations: OfferOrganization[];
  organizationsCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Détail : chaque organisation porte son nombre de véhicules. */
export interface OfferDetail extends Offer {
  organizations: Array<OfferOrganization & { vehicles: number }>;
}

/** Réponse de `POST /admin/offers/:id/organizations`. */
export interface OfferAttachResult extends OfferDetail {
  attached: string[];
  moved: { organizationId: string; fromOfferId: string }[];
}

export interface OfferListParams extends PaginationParams {
  search?: string;
  status?: OfferStatus;
  periodicity?: OfferPeriodicity;
  /** Offre détenue par cette organisation. */
  organizationId?: string;
  /** `true` : détenues par au moins une organisation ; `false` : aucune. */
  assigned?: boolean;
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
  features?: string[];
  organizationIds?: string[];
}

/** `null` efface (description, date, limite → illimité). Organisations : routes dédiées. */
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
  features?: string[];
}
