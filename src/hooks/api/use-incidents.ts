"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/hooks/api/query-keys";
import { incidentService } from "@/services/incident.service";
import type { ChangeIncidentStatusPayload, CreateIncidentPayload, IncidentListParams } from "@/types/incident";

/** Une écriture relit les listes ET le résumé de l'espace (compteur d'incidents ouverts). */
function useInvalidateIncidents() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.clientSpace.all });
  };
}

export function useIncidents(params: IncidentListParams = {}) {
  return useQuery({
    queryKey: queryKeys.incidents.list(params),
    queryFn: () => incidentService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateIncident() {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: (payload: CreateIncidentPayload) => incidentService.create(payload),
    onSuccess: invalidate,
  });
}

export function useChangeIncidentStatus() {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ChangeIncidentStatusPayload }) =>
      incidentService.changeStatus(id, payload),
    onSuccess: invalidate,
  });
}
