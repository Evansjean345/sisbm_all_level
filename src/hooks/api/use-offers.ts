"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/hooks/api/query-keys";
import { offerService } from "@/services/offer.service";
import type { CreateOfferPayload, OfferListParams, UpdateOfferPayload } from "@/types/offer";

/** Offres commerciales (plateforme). Toute écriture relit listes et détails. */
function useInvalidateOffers() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.offers.all });
}

/** Catalogue des fonctionnalités : stable, chargé une fois par session. */
export function useOfferFeatures() {
  return useQuery({
    queryKey: queryKeys.offers.features,
    queryFn: () => offerService.features(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useOffers(params: OfferListParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.offers.list(params),
    queryFn: () => offerService.list(params),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useOffer(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.offers.detail(id ?? ""),
    queryFn: () => offerService.get(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: (payload: CreateOfferPayload) => offerService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOfferPayload }) => offerService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({ mutationFn: (id: string) => offerService.remove(id), onSuccess: invalidate });
}

export function useAttachOfferOrganizations() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: ({ id, organizationIds, move }: { id: string; organizationIds: string[]; move?: boolean }) =>
      offerService.attachOrganizations(id, organizationIds, move),
    onSuccess: invalidate,
  });
}

export function useDetachOfferOrganization() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: ({ id, organizationId }: { id: string; organizationId: string }) =>
      offerService.detachOrganization(id, organizationId),
    onSuccess: invalidate,
  });
}
