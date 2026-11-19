import type { StatusTone } from "@/components/status-badge";
import type { PaginationParams } from "@/types/api";
import type { OfferPeriodicity, OfferStatus } from "@/types/offer";

/**
 * Souscriptions (migration 027) — routes `/admin/subscriptions/*` (niveau 1).
 *
 * Une souscription = une organisation × une offre × UN groupe de véhicules de
 * cette organisation. Une organisation souscrit donc à plusieurs offres (une
 * par flotte). `vehiclesCount` et `amount` (= tarif appliqué × véhicules, par
 * période de l'offre) sont calculés par l'API, jamais saisis.
 */

export const SUBSCRIPTION_STATUSES = ["draft", "active", "suspended", "terminated"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export const subscriptionStatusMeta: Record<SubscriptionStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "Brouillon", tone: "neutral" },
  active: { label: "Active", tone: "success" },
  suspended: { label: "Suspendue", tone: "warning" },
  terminated: { label: "Résiliée", tone: "danger" },
};

/** Transitions autorisées — mêmes règles que l'API (`subscription_policy.ts`). */
export const SUBSCRIPTION_TRANSITIONS: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
  draft: ["active", "terminated"],
  active: ["suspended", "terminated"],
  suspended: ["active", "terminated"],
  terminated: [],
};

/** Référence saisie (facultative à la création : `SUB-AAAA-00001` sinon). */
export const SUBSCRIPTION_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_/.-]{1,39}$/;

export interface Subscription {
  id: string;
  reference: string;
  organizationId: string;
  organization: { id: string; code: string; name: string } | null;
  offerId: string;
  offer: {
    id: string;
    code: string;
    name: string;
    periodicity: OfferPeriodicity;
    price: string;
    currency: string;
    status: OfferStatus;
  } | null;
  vehicleGroupId: string;
  vehicleGroup: { id: string; name: string; color: string | null } | null;
  /** Tarif appliqué, par véhicule et par période — `numeric` en chaîne. */
  unitPrice: string;
  currency: string;
  periodicity: OfferPeriodicity | null;
  /** Véhicules du groupe à l'instant T. */
  vehiclesCount: number;
  /** Tarif appliqué × véhicules, en chaîne (« 45000.00 »). */
  amount: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionListParams extends PaginationParams {
  /** Référence ou nom / code du client. */
  search?: string;
  organizationId?: string;
  offerId?: string;
  vehicleGroupId?: string;
  status?: SubscriptionStatus;
}

export interface CreateSubscriptionPayload {
  reference?: string;
  organizationId: string;
  offerId: string;
  vehicleGroupId: string;
  /** Absent : prix de l'offre. */
  unitPrice?: number;
  status?: Extract<SubscriptionStatus, "draft" | "active">;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

/** L'organisation ne change pas. Changer d'offre sans `unitPrice` applique le prix de la nouvelle offre. */
export interface UpdateSubscriptionPayload {
  reference?: string;
  offerId?: string;
  vehicleGroupId?: string;
  unitPrice?: number;
  startDate?: string;
  endDate?: string | null;
  notes?: string | null;
}
