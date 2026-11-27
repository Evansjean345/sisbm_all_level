"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/hooks/api/query-keys";
import { clientSpaceService } from "@/services/client-space.service";
import type { TripReportParams } from "@/types/client-space";

/** Résumé d'une organisation : identité et compteurs des rubriques de son espace. */
export function useClientSpace(organizationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clientSpace.summary(organizationId ?? ""),
    queryFn: () => clientSpaceService.summary(organizationId as string),
    enabled: Boolean(organizationId),
    retry: false,
  });
}

/** Rapport des trajets par véhicule sur une période (93 jours au plus). */
export function useTripReport(params: TripReportParams) {
  return useQuery({
    queryKey: queryKeys.clientSpace.tripReport(params),
    queryFn: () => clientSpaceService.tripReport(params),
    placeholderData: keepPreviousData,
  });
}
