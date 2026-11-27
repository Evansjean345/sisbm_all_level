import { SpeedControl } from "../../../speed/_components/speed-control";

/** Contrôle de vitesse de l'organisation. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpeedControl organizationId={id} />;
}
