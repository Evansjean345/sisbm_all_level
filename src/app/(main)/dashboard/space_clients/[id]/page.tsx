import { SpaceOverview } from "../_components/space-overview";

/** Tableau de bord de l'espace client. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpaceOverview organizationId={id} />;
}
