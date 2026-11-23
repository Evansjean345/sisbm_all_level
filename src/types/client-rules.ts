import { EVENT_TYPES, type EventType, type NotificationChannel, type Severity } from "./alerting";

/** Organisation propriétaire, telle que l'API la joint. */
export interface OrganizationRef {
  id: string;
  name: string;
  code: string;
}

/**
 * Rubriques opérationnelles du client (plateforme Client, ouvertes aussi depuis la fiche client
 * du SuperAdmin) : zones géographiques, contrôle de vitesse, moteur de règles.
 * Entités du modèle de données : Geofence, GeofenceAssignment, SpeedPolicy, Rule, RuleCondition,
 * RuleAction.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export type GeofenceShape = "circle" | "polygon";

export interface Geofence {
  id: string;
  organizationId: string;
  organization: OrganizationRef;
  name: string;
  description: string | null;
  shape: GeofenceShape;
  /** Cercle. */
  center: LatLng | null;
  radiusM: number | null;
  /** Polygone (3 sommets minimum). */
  points: LatLng[];
  /** Zone autorisée (alerte à la sortie) ou interdite (alerte à l'entrée). */
  kind: "authorized" | "forbidden";
  alertOnEntry: boolean;
  alertOnExit: boolean;
  /** GeofenceAssignment : véhicules surveillés (vide = tous ceux du client). */
  vehicleIds: string[];
  color: string;
  active: boolean;
  updatedAt: string;
}

export type GeofencePayload = Omit<Geofence, "id" | "organization" | "updatedAt">;

/** Portée d'une politique : la plus précise l'emporte (véhicule > zone > globale) — à valider (§15). */
export type SpeedScope = "global" | "zone" | "vehicle";

export interface SpeedPolicy {
  id: string;
  organizationId: string;
  organization: OrganizationRef;
  name: string;
  scope: SpeedScope;
  zoneId: string | null;
  vehicleIds: string[];
  limitKph: number;
  /** Tolérance avant alerte (km/h au-dessus de la limite). */
  toleranceKph: number;
  /** Durée minimale de dépassement avant alerte (secondes). */
  minDurationSeconds: number;
  severity: Severity;
  /** Bridage actif : nécessite un boîtier compatible (§III.6). */
  limiterEnabled: boolean;
  active: boolean;
  updatedAt: string;
}

export type SpeedPolicyPayload = Omit<SpeedPolicy, "id" | "organization" | "updatedAt">;

export const RULE_FIELDS = [
  "speed",
  "speed_policy",
  "zone",
  "time",
  "duration",
  "schedule",
  "ignition",
  "vehicle",
] as const;
export type RuleField = (typeof RULE_FIELDS)[number];

/** Only expose configured resources that can actually trigger the selected event. */
const EVENT_RULE_FIELDS: Partial<Record<EventType, readonly RuleField[]>> = {
  overspeed: ["speed_policy"],
  geofence_exit: ["zone"],
  geofence_entry: ["zone"],
  schedule_violation: ["schedule"],
};

export function getRuleFieldsForEvent(event: EventType): RuleField[] {
  return [...(EVENT_RULE_FIELDS[event] ?? [])];
}

export const RULE_OPERATORS = ["gt", "lt", "eq", "neq", "in", "outside"] as const;
export type RuleOperator = (typeof RULE_OPERATORS)[number];

export const RULE_OPERATORS_BY_FIELD: Record<RuleField, readonly RuleOperator[]> = {
  speed: ["gt", "lt", "eq", "neq"],
  speed_policy: ["eq"],
  zone: ["eq"],
  time: ["in", "outside"],
  duration: ["gt", "lt", "eq", "neq"],
  schedule: ["eq"],
  ignition: ["eq", "neq"],
  vehicle: ["eq", "neq"],
};

export const DEFAULT_RULE_OPERATOR_BY_FIELD: Record<RuleField, RuleOperator> = {
  speed: "gt",
  speed_policy: "eq",
  zone: "eq",
  time: "outside",
  duration: "gt",
  schedule: "eq",
  ignition: "eq",
  vehicle: "eq",
};

export function getRuleOperatorsForField(field: RuleField): readonly RuleOperator[] {
  return RULE_OPERATORS_BY_FIELD[field];
}

export interface RuleCondition {
  id: string;
  field: RuleField;
  operator: RuleOperator;
  value: string;
  /** One condition may match any selected geofence (OR), currently used for geofence exits. */
  values?: string[];
  valueLabel?: string;
  valueLabels?: string[];
  target?: RuleConditionTarget;
}

export type RuleConditionTarget =
  | { type: "all" }
  | { type: "vehicle"; id: string; label?: string }
  | { type: "fleet"; id: string; label?: string };

/** Events hidden from rule forms; their notification channel is always push. */
export const RULE_PUSH_ONLY_EVENT_TYPES: readonly EventType[] = [
  "towing",
  "sos",
  "jamming",
  "engine_stop",
  "harsh_driving",
  "tamper",
  "disconnection",
];

export const RULE_FORM_EVENT_TYPES = EVENT_TYPES.filter((event) => !RULE_PUSH_ONLY_EVENT_TYPES.includes(event));

export function isRulePushOnlyEvent(event: EventType): boolean {
  return RULE_PUSH_ONLY_EVENT_TYPES.includes(event);
}

export function getRuleNotificationChannels(
  event: EventType,
  channels: readonly NotificationChannel[] = [],
): NotificationChannel[] {
  if (isRulePushOnlyEvent(event)) return ["push"];
  return [
    ...new Set<NotificationChannel>([
      "push",
      ...channels.filter((channel) => channel === "sms" || channel === "email"),
    ]),
  ];
}

export const RULE_ACTION_TYPES = ["alert", "notify", "incident", "command"] as const;
export type RuleActionType = (typeof RULE_ACTION_TYPES)[number];

export interface RuleAction {
  id: string;
  type: RuleActionType;
  /** Gravité (alert), configuration (notify), file (incident), commande (command). */
  value: string;
  channels?: NotificationChannel[];
}

export interface Rule {
  id: string;
  organizationId: string;
  organization: OrganizationRef;
  name: string;
  description: string | null;
  trigger: EventType;
  /** Toutes les conditions sont combinées en ET, sauf les zones d'une même sortie combinées en OU. */
  conditions: RuleCondition[];
  actions: RuleAction[];
  severity: Severity;
  active: boolean;
  triggerCount: number;
  lastTriggeredAt: string | null;
  updatedAt: string;
}

export type RulePayload = Omit<Rule, "id" | "organization" | "updatedAt" | "triggerCount" | "lastTriggeredAt">;
