import { adminPath, api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { ClientSpaceSummary, TripReport, TripReportParams } from "@/types/client-space";

/**
 * Espace client du SuperAdmin : résumé d'une organisation et rapport de ses
 * trajets. Routes plateforme uniquement (`/admin/*`) : l'espace client
 * n'existe qu'au niveau 1.
 */
export const clientSpaceService = {
  /** GET /admin/organizations/:id/space */
  async summary(organizationId: string): Promise<ClientSpaceSummary> {
    const { data } = await api.get<ApiResponse<ClientSpaceSummary>>(
      adminPath(`/organizations/${organizationId}/space`),
    );
    return data.data;
  },

  /** GET /admin/reports/trips?organizationId=&from=&to= */
  async tripReport(params: TripReportParams): Promise<TripReport> {
    const { data } = await api.get<ApiResponse<TripReport>>(adminPath("/reports/trips"), { params });
    return data.data;
  },
};
