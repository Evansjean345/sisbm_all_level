import { SpaceReports } from "../../_components/space-reports";

/** Rapports de l'organisation. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpaceReports organizationId={id} />;
}
