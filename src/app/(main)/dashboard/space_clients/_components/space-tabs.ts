import {
  CalendarClock,
  Contact,
  FileText,
  Gauge,
  LayoutGrid,
  type LucideIcon,
  MapPinned,
  TriangleAlert,
  Workflow,
} from "lucide-react";

import type { ClientSpaceCounts } from "@/types/client-space";

/** Une rubrique de l'espace client = un segment d'URL sous /dashboard/space_clients/[id]. */
export interface SpaceTab {
  /** Segment d'URL ("" : tableau de bord). */
  segment: string;
  label: string;
  icon: LucideIcon;
  /** Compteur affiché en pastille (résumé de l'espace). */
  count?: (counts: ClientSpaceCounts) => number;
  /** Pastille d'alerte plutôt que neutre. */
  alert?: boolean;
}

export const SPACE_TABS: readonly SpaceTab[] = [
  { segment: "", label: "Tableau de bord", icon: LayoutGrid },
  { segment: "horaires", label: "Gestion des horaires", icon: CalendarClock },
  { segment: "zones", label: "Zones géographiques", icon: MapPinned },
  { segment: "vitesse", label: "Contrôle de vitesse", icon: Gauge },
  { segment: "regles", label: "Moteur de règles", icon: Workflow },
  { segment: "conducteurs", label: "Conducteurs", icon: Contact },
  { segment: "rapports", label: "Rapports", icon: FileText },
  { segment: "incidents", label: "Incidents", icon: TriangleAlert, count: (c) => c.openIncidents, alert: true },
];

export const spaceHref = (organizationId: string, segment = "") =>
  `/dashboard/space_clients/${organizationId}${segment ? `/${segment}` : ""}`;
