import { adminPath, api } from "@/lib/axios";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  CreateSubscriptionPayload,
  Subscription,
  SubscriptionListParams,
  SubscriptionStatus,
  UpdateSubscriptionPayload,
} from "@/types/subscription";

/** Souscriptions — routes `/admin/subscriptions/*` (plateforme). */
export const subscriptionService = {
  /** GET /admin/subscriptions?search=&organizationId=&offerId=&vehicleGroupId=&status= */
  async list(params: SubscriptionListParams = {}): Promise<Paginated<Subscription>> {
    const { data } = await api.get<Paginated<Subscription>>(adminPath("/subscriptions"), { params });
    return data;
  },

  /** GET /admin/subscriptions/:id */
  async get(id: string): Promise<Subscription> {
    const { data } = await api.get<ApiResponse<Subscription>>(adminPath(`/subscriptions/${id}`));
    return data.data;
  },

  /** POST /admin/subscriptions — l'offre doit être commercialisée, le groupe libre et au client. */
  async create(payload: CreateSubscriptionPayload): Promise<Subscription> {
    const { data } = await api.post<ApiResponse<Subscription>>(adminPath("/subscriptions"), payload);
    return data.data;
  },

  /** PATCH /admin/subscriptions/:id */
  async update(id: string, payload: UpdateSubscriptionPayload): Promise<Subscription> {
    const { data } = await api.patch<ApiResponse<Subscription>>(adminPath(`/subscriptions/${id}`), payload);
    return data.data;
  },

  /** POST /admin/subscriptions/:id/status — activer, suspendre, réactiver ou résilier. */
  async setStatus(id: string, status: SubscriptionStatus, reason?: string): Promise<Subscription> {
    const { data } = await api.post<ApiResponse<Subscription>>(adminPath(`/subscriptions/${id}/status`), {
      status,
      reason,
    });
    return data.data;
  },

  /** DELETE /admin/subscriptions/:id — 409 si active. */
  async remove(id: string): Promise<void> {
    await api.delete(adminPath(`/subscriptions/${id}`));
  },
};
