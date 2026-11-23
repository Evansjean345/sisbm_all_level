import { adminPath, api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type {
  Geofence,
  GeofencePayload,
  Rule,
  RulePayload,
  SpeedPolicy,
  SpeedPolicyPayload,
} from "@/types/client-rules";

/**
 * Zones, politiques de vitesse et règles — routes `/admin/geofences`,
 * `/admin/speed-policies`, `/admin/rules` (plateforme, migration 032).
 *
 * L'API applique les règles de la maquette : cercle ≥ 50 m, polygone ≥ 3
 * sommets, références actives et du même client, au moins une action…
 * Aucune suppression : on active / désactive (`/:id/toggle`).
 */
const PATHS = { geofence: "/geofences", speed: "/speed-policies", rule: "/rules" } as const;

async function list<T>(path: string, organizationId?: string): Promise<T[]> {
  const { data } = await api.get<ApiResponse<T[]>>(adminPath(path), {
    params: organizationId ? { organizationId } : undefined,
  });
  return data.data;
}

async function save<T>(path: string, payload: object, id?: string): Promise<T> {
  const { data } = id
    ? await api.patch<ApiResponse<T>>(adminPath(`${path}/${id}`), payload)
    : await api.post<ApiResponse<T>>(adminPath(path), payload);
  return data.data;
}

export const clientRulesService = {
  // ── Zones ──────────────────────────────────────────────────────────────────
  listGeofences: (organizationId?: string) => list<Geofence>(PATHS.geofence, organizationId),
  saveGeofence: (payload: GeofencePayload, id?: string) => save<Geofence>(PATHS.geofence, payload, id),

  // ── Vitesse ────────────────────────────────────────────────────────────────
  listSpeedPolicies: (organizationId?: string) => list<SpeedPolicy>(PATHS.speed, organizationId),
  saveSpeedPolicy: (payload: SpeedPolicyPayload, id?: string) => save<SpeedPolicy>(PATHS.speed, payload, id),

  // ── Règles ─────────────────────────────────────────────────────────────────
  listRules: (organizationId?: string) => list<Rule>(PATHS.rule, organizationId),
  saveRule: (payload: RulePayload, id?: string) => save<Rule>(PATHS.rule, payload, id),

  /** Active / désactive une zone, une politique ou une règle (jamais de suppression). */
  async toggle(kind: keyof typeof PATHS, id: string, active: boolean): Promise<void> {
    await api.post(adminPath(`${PATHS[kind]}/${id}/toggle`), { active });
  },
};
