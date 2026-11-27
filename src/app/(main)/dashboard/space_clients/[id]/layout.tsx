import type { ReactNode } from "react";

import { SpaceShell } from "../_components/space-shell";

/** En-tête et rubriques de l'espace client, communs à toutes ses pages. */
export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SpaceShell organizationId={id}>{children}</SpaceShell>;
}
