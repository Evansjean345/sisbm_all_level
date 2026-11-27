/**
 * Espace client (SuperAdmin) — tout ce qui concerne UNE organisation.
 *
 * GET /admin/organizations/:id/space : identité + compteurs des rubriques.
 */
export interface ClientSpaceCounts {
  /** Souscriptions au statut « active ». */
  activeSubscriptions: number;
  drivers: number;
  /** Calendriers actifs (appliqués par le moteur planifié). */
  activeSchedules: number;
  schedules: number;
  vehicles: number;
  zones: number;
  speedPolicies: number;
  rules: number;
  /** Incidents ouverts ou en cours. */
  openIncidents: number;
}

export interface ClientSpaceSummary {
  organization: { id: string; name: string; code: string; isActive: boolean };
  counts: ClientSpaceCounts;
}

/** GET /admin/reports/trips — une ligne par véhicule de l'organisation. */
export interface VehicleTripStats {
  vehicleId: string;
  registration: string;
  trips: number;
  distanceKm: number;
  /** Secondes. */
  drivingSeconds: number;
  idleSeconds: number;
  maxSpeedKph: number | null;
  avgSpeedKph: number | null;
  lastTripAt: string | null;
}

export interface TripReport {
  organizationId: string;
  from: string;
  to: string;
  totals: {
    trips: number;
    distanceKm: number;
    drivingSeconds: number;
    idleSeconds: number;
    maxSpeedKph: number | null;
    activeVehicles: number;
    vehicles: number;
  };
  vehicles: VehicleTripStats[];
}

export interface TripReportParams {
  organizationId: string;
  /** AAAA-MM-JJ inclus. 93 jours au plus. */
  from: string;
  to: string;
}
