import { Suspense } from "react";

import { LoadingRows } from "@/components/query-state";
import { Schedules } from "@/features/clock/schedules";

/** Gestion des horaires de l'organisation. `Suspense` : la vue interne vit dans l'URL. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingRows rows={8} />}>
      <Schedules organizationId={id} />
    </Suspense>
  );
}
