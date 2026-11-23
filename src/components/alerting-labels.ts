import type { StatusTone } from "@/components/status-badge";
import type { EventType, NotificationChannel, Severity } from "@/types/alerting";

type Meta = { label: string; tone: StatusTone };

export const eventTypeLabels: Record<EventType, string> = {
  overspeed: "Excès de vitesse",
  geofence_exit: "Sortie de zone",
  geofence_entry: "Entrée en zone",
  schedule_violation: "Circulation hors horaires",
  power_cut: "Coupure d'alimentation",
  disconnection: "Perte de connexion",
  sos: "Bouton SOS",
  jamming: "Brouillage GPS/GSM",
  towing: "Remorquage",
  tamper: "Ouverture / sabotage du boîtier",
  harsh_driving: "Conduite brusque",
  engine_start: "Démarrage moteur",
  engine_stop: "Arrêt moteur",
};

export const severityMeta: Record<Severity, Meta> = {
  critical: { label: "Critique", tone: "danger" },
  high: { label: "Haute", tone: "orange" },
  medium: { label: "Moyenne", tone: "warning" },
  low: { label: "Basse", tone: "info" },
};

export const channelLabels: Record<NotificationChannel, string> = {
  sms: "SMS",
  email: "E-mail",
  push: "Notification application",
};
