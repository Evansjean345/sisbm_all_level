import { adminPath, api } from "@/lib/axios";
import type { ApiResponse, Paginated } from "@/types/api";
import type { CreateOfferPayload, Feature, Offer, OfferListParams, UpdateOfferPayload } from "@/types/offer";

/**
 * Offres commerciales — routes `/admin/offers/*` uniquement (plateforme).
 * Les organisations y accèdent par les souscriptions (`subscription.service.ts`).
 */
export const offerService = {
  /** GET /admin/offers/features — catalogue : fonctionnalités → sous-fonctionnalités. */
  async features(): Promise<Feature[]> {
    const { data } = await api.get<ApiResponse<Feature[]>>(adminPath("/offers/features"));
    return data.data;
  },

  /** GET /admin/offers?search=&status=&periodicity=&organizationId= */
  async list(params: OfferListParams = {}): Promise<Paginated<Offer>> {
    const { data } = await api.get<Paginated<Offer>>(adminPath("/offers"), { params });
    return data;
  },

  /** GET /admin/offers/:id */
  async get(id: string): Promise<Offer> {
    const { data } = await api.get<ApiResponse<Offer>>(adminPath(`/offers/${id}`));
    return data.data;
  },

  /** POST /admin/offers — inactive par défaut. */
  async create(payload: CreateOfferPayload): Promise<Offer> {
    const { data } = await api.post<ApiResponse<Offer>>(adminPath("/offers"), payload);
    return data.data;
  },

  /** PATCH /admin/offers/:id — toute offre est modifiable. */
  async update(id: string, payload: UpdateOfferPayload): Promise<Offer> {
    const { data } = await api.patch<ApiResponse<Offer>>(adminPath(`/offers/${id}`), payload);
    return data.data;
  },

  /** DELETE /admin/offers/:id — 409 `E_OFFER_IN_USE` si des souscriptions l'utilisent. */
  async remove(id: string): Promise<void> {
    await api.delete(adminPath(`/offers/${id}`));
  },
};
