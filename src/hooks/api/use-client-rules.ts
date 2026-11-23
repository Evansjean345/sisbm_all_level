"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientRulesService } from "@/services/client-rules.service";
import type { GeofencePayload, RulePayload, SpeedPolicyPayload } from "@/types/client-rules";

const KEYS = {
  all: ["client-rules"] as const,
  geofences: (org?: string) => ["client-rules", "geofences", org ?? "all"] as const,
  speed: (org?: string) => ["client-rules", "speed", org ?? "all"] as const,
  rules: (org?: string) => ["client-rules", "rules", org ?? "all"] as const,
};

export const useGeofences = (organizationId?: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: KEYS.geofences(organizationId),
    queryFn: () => clientRulesService.listGeofences(organizationId),
    enabled: options.enabled ?? true,
  });
export const useSpeedPolicies = (organizationId?: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: KEYS.speed(organizationId),
    queryFn: () => clientRulesService.listSpeedPolicies(organizationId),
    enabled: options.enabled ?? true,
  });
export const useRules = (organizationId?: string) =>
  useQuery({ queryKey: KEYS.rules(organizationId), queryFn: () => clientRulesService.listRules(organizationId) });

function useRulesMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.all }) });
}

export const useSaveGeofence = () =>
  useRulesMutation(({ payload, id }: { payload: GeofencePayload; id?: string }) =>
    clientRulesService.saveGeofence(payload, id),
  );
export const useSaveSpeedPolicy = () =>
  useRulesMutation(({ payload, id }: { payload: SpeedPolicyPayload; id?: string }) =>
    clientRulesService.saveSpeedPolicy(payload, id),
  );
export const useSaveRule = () =>
  useRulesMutation(({ payload, id }: { payload: RulePayload; id?: string }) =>
    clientRulesService.saveRule(payload, id),
  );
export const useToggleClientRule = () =>
  useRulesMutation(({ kind, id, active }: { kind: "geofence" | "speed" | "rule"; id: string; active: boolean }) =>
    clientRulesService.toggle(kind, id, active),
  );
