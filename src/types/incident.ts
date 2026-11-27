import type { StatusTone } from "@/components/status-badge";

/**
 * Incidents — routes `/admin/incidents` (toutes organisations, filtre `organizationId`).
 *
 * Cycle : open → in_progress → resolved → closed. Résoudre ou clore exige une
 * résolution ; un dossier résolu peut être rouvert ; un dossier clos est définitif.
 */
export const INCIDENT_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_SEVERITIES = ["info", "warning", "critical"] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_CATEGORIES = [
  "theft",
  "accident",
  "breakdown",
  "speeding",
  "unauthorized_use",
  "geofence_breach",
  "device_issue",
  "other",
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

/** Mêmes transitions que l'API (domain/incident/code_legacy/incident/incident_statuses.ts). */
export const INCIDENT_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  open: ["in_progress", "resolved", "closed"],
  in_progress: ["resolved", "closed"],
  resolved: ["in_progress", "closed"],
  closed: [],
};

export const INCIDENT_RESOLUTION_MIN_LENGTH = 5;

export const incidentStatusMeta: Record<IncidentStatus, { label: string; tone: StatusTone; action: string }> = {
  open: { label: "Ouvert", tone: "danger", action: "Rouvrir" },
  in_progress: { label: "En cours", tone: "warning", action: "Prendre en charge" },
  resolved: { label: "Résolu", tone: "success", action: "Résoudre" },
  closed: { label: "Clos", tone: "neutral", action: "Clore" },
};

export const incidentSeverityMeta: Record<IncidentSeverity, { label: string; tone: StatusTone }> = {
  info: { label: "Information", tone: "info" },
  warning: { label: "Avertissement", tone: "orange" },
  critical: { label: "Critique", tone: "danger" },
};

export const incidentCategoryLabels: Record<IncidentCategory, string> = {
  theft: "Vol",
  accident: "Accident",
  breakdown: "Panne",
  speeding: "Excès de vitesse",
  unauthorized_use: "Utilisation non autorisée",
  geofence_breach: "Sortie de zone",
  device_issue: "Problème de boîtier",
  other: "Autre",
};

export interface Incident {
  id: string;
  organizationId: string;
  reference: string;
  vehicle: { id: string; registration: string } | null;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string | null;
  occurredAt: string;
  openedAt: string;
  openedBy: { id: string; fullName: string } | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  resolution: string | null;
}

export interface IncidentListParams {
  organizationId?: string;
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  category?: IncidentCategory;
  search?: string;
  page?: number;
  perPage?: number;
}

export interface IncidentList {
  data: Incident[];
  meta: { total: number; page: number; perPage: number; counts: Record<IncidentStatus, number> };
}

export interface CreateIncidentPayload {
  organizationId: string;
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  vehicleId?: string | null;
  description?: string | null;
  /** ISO 8601 ; absent : maintenant. */
  occurredAt?: string;
}

export interface ChangeIncidentStatusPayload {
  status: IncidentStatus;
  resolution?: string | null;
}
