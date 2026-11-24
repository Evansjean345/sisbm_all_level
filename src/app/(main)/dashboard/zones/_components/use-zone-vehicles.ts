"use client";

import { useMemo } from "react";

import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/hooks/api/query-keys";
import { useGroupMembers } from "@/hooks/api/use-groups";
import { useLiveVehicles } from "@/hooks/use-live-vehicles";
import { vehicleService } from "@/services/vehicle.service";
import type { VehicleDetail } from "@/types/vehicle";

/** Véhicules affichés au plus sur la carte des zones (une requête détail par véhicule). */
const MAX_VEHICLES = 100;

/**
 * Véhicules d'un client — et, si une flotte est choisie, de cette flotte —
 * avec leur dernière position, superposée du temps réel (SSE).
 * Rien n'est chargé tant qu'aucun client n'est choisi.
 */
export function useZoneVehicles(
  organizationId: string | undefined,
  vehicleGroupId: string | undefined,
) {
  const params = {
    organizationId,
    status: "active" as const,
    perPage: MAX_VEHICLES,
  };
  const list = useQuery({
    queryKey: queryKeys.vehicles.list(params),
    queryFn: () => vehicleService.list(params),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });
  const members = useGroupMembers("vehicle_group", vehicleGroupId);

  const details = useQueries({
    queries: (organizationId ? (list.data?.data ?? []) : []).map((v) => ({
      queryKey: queryKeys.vehicles.detail(v.id),
      queryFn: () => vehicleService.get(v.id),
      refetchInterval: 60_000,
      placeholderData: keepPreviousData,
    })),
    combine: (results) => ({
      vehicles: results
        .map((r) => r.data)
        .filter((d): d is VehicleDetail => Boolean(d)),
      pending: results.some((r) => r.isPending),
    }),
  });

  const memberIds = useMemo(
    () =>
      vehicleGroupId ? new Set((members.data ?? []).map((m) => m.id)) : null,
    [vehicleGroupId, members.data],
  );
  const scoped = useMemo(
    () =>
      details.vehicles.filter(
        (v) =>
          v.organizationId === organizationId &&
          (memberIds === null || memberIds.has(v.id)),
      ),
    [details.vehicles, organizationId, memberIds],
  );
  const vehicles = useLiveVehicles(scoped);

  return {
    vehicles,
    loading:
      Boolean(organizationId) &&
      (list.isPending ||
        details.pending ||
        (Boolean(vehicleGroupId) && members.isPending)),
    error: list.error ?? members.error ?? null,
  };
}
