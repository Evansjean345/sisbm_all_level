import type { StatusTone } from "@/components/status-badge";
import type { PaginationParams } from "@/types/api";
import type { OfferPeriodicity, OfferStatus } from "@/types/offer";

/**
 * Souscriptions (migration 027) — routes `/admin/subscriptions/*` (niveau 1).
 *
 * Une souscription = une organisation × une offre × UNE cible (migration 030) :
 *   - une FLOTTE (`vehicleGroupId`) — le distributeur et ses opérateurs sans
 *     souscription propre en reçoivent l'offre ;
 *   - un CLIENT FINAL (`operatorId`) — un opérateur qui ne gère pas de groupes
 *     de véhicules ; il ne voit alors que cette offre.
 *
 * Tarif FORFAITAIRE, indépendant des véhicules (migration 028) : prix de
 * l'offre figé à la souscription − remise en montant = `totalPrice`, le tarif
 * appliqué par période, calculé par la base.
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

export const SUBSCRIPTION_TARGETS = ["vehicle_group", "operator"] as const;
export type SubscriptionTarget = (typeof SUBSCRIPTION_TARGETS)[number];
export const subscriptionTargetMeta: Record<SubscriptionTarget, { label: string; short: string }> = {
  vehicle_group: { label: "Flotte (groupe de véhicules)", short: "Flotte" },
  operator: { label: "Client final (opérateur)", short: "Client final" },
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
  target: SubscriptionTarget;
  vehicleGroupId: string | null;
  vehicleGroup: { id: string; name: string; color: string | null } | null;
  operatorId: string | null;
  operator: { id: string; fullName: string; email: string } | null;
  /** Prix de l'offre figé à la souscription — `numeric` en chaîne (« 15000.00 »). */
  offerPrice: string;
  /** Remise en montant, dans la devise de la souscription. */
  discount: string;
  /** Tarif appliqué = prix − remise, par période (calculé par la base). */
  totalPrice: string;
  currency: string;
  periodicity: OfferPeriodicity | null;
  /** Véhicules du groupe — information seulement ; `null` pour un client final. */
  vehiclesCount: number | null;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionListParams extends PaginationParams {
  /** Référence, nom / code du client ou nom / e-mail de l'opérateur. */
  search?: string;
  organizationId?: string;
  offerId?: string;
  vehicleGroupId?: string;
  operatorId?: string;
  target?: SubscriptionTarget;
  status?: SubscriptionStatus;
}

/** Client final d'une organisation et sa souscription en cours (non résiliée). */
export interface SubscriptionOperator {
  id: string;
  fullName: string;
  email: string;
  status: string;
  roleCode: string;
  subscription: { id: string; reference: string; status: SubscriptionStatus; offerName: string } | null;
}

export interface CreateSubscriptionPayload {
  reference?: string;
  organizationId: string;
  offerId: string;
  /** Exactement une cible : `vehicleGroupId` OU `operatorId`. */
  vehicleGroupId?: string;
  operatorId?: string;
  /** Prix de l'offre figé. Absent : prix actuel de l'offre. */
  offerPrice?: number;
  /** Remise en montant. Absente : 0. Jamais supérieure au prix. */
  discount?: number;
  status?: Extract<SubscriptionStatus, "draft" | "active">;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

/**
 * L'organisation ne change pas. Donner `vehicleGroupId` OU `operatorId`
 * remplace la cible. Changer d'offre sans `offerPrice` reprend le prix de la nouvelle offre. */
export interface UpdateSubscriptionPayload {
  reference?: string;
  offerId?: string;
  vehicleGroupId?: string;
  operatorId?: string;
  offerPrice?: number;
  discount?: number;
  startDate?: string;
  endDate?: string | null;
  notes?: string | null;
}
