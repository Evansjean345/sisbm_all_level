import { adminPath, api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type {
  ChangeIncidentStatusPayload,
  CreateIncidentPayload,
  Incident,
  IncidentList,
  IncidentListParams,
} from "@/types/incident";

/** Incidents — routes plateforme `/admin/incidents`. */
export const incidentService = {
  /** GET /admin/incidents?organizationId=&status=&severity=&category=&search=&page=&perPage= */
  async list(params: IncidentListParams = {}): Promise<IncidentList> {
    const { data } = await api.get<IncidentList>(adminPath("/incidents"), { params });
    return data;
  },

  /** POST /admin/incidents — la référence INC-AAAA-000123 est attribuée par l'API. */
  async create(payload: CreateIncidentPayload): Promise<Incident> {
    const { data } = await api.post<ApiResponse<Incident>>(adminPath("/incidents"), payload);
    return data.data;
  },

  /** PATCH /admin/incidents/:id/status */
  async changeStatus(id: string, payload: ChangeIncidentStatusPayload): Promise<Incident> {
    const { data } = await api.patch<ApiResponse<Incident>>(adminPath(`/incidents/${id}/status`), payload);
    return data.data;
  },
};
