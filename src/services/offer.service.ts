import { adminPath, api } from "@/lib/axios";
import type { ApiResponse, Paginated } from "@/types/api";
import type {
  CreateOfferPayload,
  Offer,
  OfferAttachResult,
  OfferDetail,
  OfferFeature,
  OfferListParams,
  UpdateOfferPayload,
} from "@/types/offer";

/**
 * Offres commerciales — routes `/admin/offers/*` uniquement (plateforme) :
 * ni un administrateur ni un opérateur d'organisation ne voient le catalogue.
 */
export const offerService = {
  /** GET /admin/offers/features — catalogue (modules → fonctionnalités), lignes de la matrice. */
  async features(): Promise<OfferFeature[]> {
    const { data } = await api.get<ApiResponse<OfferFeature[]>>(adminPath("/offers/features"));
    return data.data;
  },

  /** GET /admin/offers?search=&status=&periodicity=&organizationId=&assigned= */
  async list(params: OfferListParams = {}): Promise<Paginated<Offer>> {
    const { data } = await api.get<Paginated<Offer>>(adminPath("/offers"), { params });
    return data;
  },

  /** GET /admin/offers/:id — avec le nombre de véhicules de l'organisation (quota). */
  async get(id: string): Promise<OfferDetail> {
    const { data } = await api.get<ApiResponse<OfferDetail>>(adminPath(`/offers/${id}`));
    return data.data;
  },

  /** POST /admin/offers — inactive par défaut ; `organizationIds` facultatif. */
  async create(payload: CreateOfferPayload): Promise<OfferDetail> {
    const { data } = await api.post<ApiResponse<OfferDetail>>(adminPath("/offers"), payload);
    return data.data;
  },

  /** PATCH /admin/offers/:id */
  async update(id: string, payload: UpdateOfferPayload): Promise<OfferDetail> {
    const { data } = await api.patch<ApiResponse<OfferDetail>>(adminPath(`/offers/${id}`), payload);
    return data.data;
  },

  /** DELETE /admin/offers/:id — suppression logique ; ses organisations n'ont plus d'offre. */
  async remove(id: string): Promise<void> {
    await api.delete(adminPath(`/offers/${id}`));
  },

  /**
   * POST /admin/offers/:id/organizations — idempotent. Sans `move`, une
   * organisation qui détient une autre offre répond 409 `E_ORGANIZATION_HAS_OFFER` ;
   * avec `move: true`, elle est déplacée vers cette offre.
   */
  async attachOrganizations(id: string, organizationIds: string[], move = false): Promise<OfferAttachResult> {
    const { data } = await api.post<ApiResponse<OfferAttachResult>>(adminPath(`/offers/${id}/organizations`), {
      organizationIds,
      move,
    });
    return data.data;
  },

  /** DELETE /admin/offers/:id/organizations/:organizationId — l'organisation n'a plus d'offre. */
  async detachOrganization(id: string, organizationId: string): Promise<OfferDetail> {
    const { data } = await api.delete<ApiResponse<OfferDetail>>(
      adminPath(`/offers/${id}/organizations/${organizationId}`),
    );
    return data.data;
  },
};
