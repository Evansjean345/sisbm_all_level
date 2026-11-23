"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/hooks/api/query-keys";
import { subscriptionService } from "@/services/subscription.service";
import type {
  CreateSubscriptionPayload,
  SubscriptionListParams,
  SubscriptionStatus,
  UpdateSubscriptionPayload,
} from "@/types/subscription";

/** Une écriture relit souscriptions ET offres (leurs compteurs en dépendent). */
function useInvalidateSubscriptions() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.offers.all });
  };
}

export function useSubscriptions(params: SubscriptionListParams = {}) {
  return useQuery({
    queryKey: queryKeys.subscriptions.list(params),
    queryFn: () => subscriptionService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateSubscription() {
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: (payload: CreateSubscriptionPayload) => subscriptionService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateSubscription() {
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSubscriptionPayload }) =>
      subscriptionService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useSetSubscriptionStatus() {
  const invalidate = useInvalidateSubscriptions();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: SubscriptionStatus; reason?: string }) =>
      subscriptionService.setStatus(id, status, reason),
    onSuccess: invalidate,
  });
}

export function useDeleteSubscription() {
  const invalidate = useInvalidateSubscriptions();
  return useMutation({ mutationFn: (id: string) => subscriptionService.remove(id), onSuccess: invalidate });
}
