import { Suspense } from "react";

import { Subscriptions } from "./_components/subscriptions";

export default function Page() {
  // `useSearchParams` (filtre ?offerId= depuis le catalogue) exige une frontière Suspense.
  return (
    <Suspense fallback={null}>
      <Subscriptions />
    </Suspense>
  );
}
