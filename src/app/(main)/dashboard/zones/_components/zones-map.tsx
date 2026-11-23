"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

import type { ZonesMapProps } from "./zones-map-inner";

/** Leaflet manipule `window` : la carte n'est rendue que dans le navigateur. */
export const ZonesMap = dynamic<ZonesMapProps>(() => import("./zones-map-inner"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});
