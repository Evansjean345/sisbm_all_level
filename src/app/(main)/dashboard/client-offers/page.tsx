import { Suspense } from "react";

import { Subscriptions } from "../subscriptions/_components/subscriptions";

/** Attribution des offres : souscriptions des clients finaux (opérateurs). */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Subscriptions />
    </Suspense>
  );
}
