import { Zones } from "../../../zones/_components/zones";

/** Zones géographiques de l'organisation. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Zones organizationId={id} />;
}
