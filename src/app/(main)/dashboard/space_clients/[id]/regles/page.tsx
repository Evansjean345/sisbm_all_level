import { RulesEngine } from "../../../rules/_components/rules-engine";

/** Moteur de règles de l'organisation. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RulesEngine organizationId={id} />;
}
