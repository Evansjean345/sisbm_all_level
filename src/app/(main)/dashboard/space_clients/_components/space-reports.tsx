"use client";

import { useState } from "react";

import Link from "next/link";

import { Download, Gauge, RefreshCw, Route, Timer, Truck } from "lucide-react";

import { MetricCard, metricGridClass } from "@/components/metric-card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActivityChart } from "@/features/home-platform/activity-chart";
import { useAdminActivity } from "@/hooks/api/use-admin";
import { useTripReport } from "@/hooks/api/use-client-space";
import { downloadCsv, formatDateTime, formatNumber } from "@/lib/format";

/** Périodes proposées : la courbe d'activité de l'API va jusqu'à 90 jours. */
const PERIODES = [
  { days: 7, label: "7 derniers jours" },
  { days: 30, label: "30 derniers jours" },
  { days: 90, label: "90 derniers jours" },
] as const;

/** AAAA-MM-JJ en UTC (heure légale d'Abidjan). */
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** 3 h 05 · 12 min · 0 min */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Rapports de l'organisation : activité quotidienne de la flotte (courbe) et
 * bilan des trajets par véhicule sur la même période. Les démarrages sans
 * déplacement (trajets « orphelins ») ne comptent pas.
 */
export function SpaceReports({ organizationId }: { organizationId: string }) {
  const [days, setDays] = useState<number>(30);
  const today = new Date();
  const from = isoDay(new Date(today.getTime() - (days - 1) * 86_400_000));
  const to = isoDay(today);

  const report = useTripReport({ organizationId, from, to });
  const activity = useAdminActivity({ organizationId, days });
  const t = report.data?.totals;
  const vehicles = report.data?.vehicles ?? [];

  function exportCsv() {
    downloadCsv(
      `rapport-trajets-${from}-${to}.csv`,
      vehicles.map((v) => ({
        vehicule: v.registration,
        trajets: v.trips,
        distance_km: v.distanceKm,
        conduite_min: Math.round(v.drivingSeconds / 60),
        ralenti_min: Math.round(v.idleSeconds / 60),
        vitesse_moyenne_kmh: v.avgSpeedKph ?? "",
        vitesse_max_kmh: v.maxSpeedKph ?? "",
        dernier_trajet: v.lastTripAt ?? "",
      })),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger size="sm" aria-label="Période du rapport">
            <span className="text-muted-foreground">Période :</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            <SelectGroup>
              {PERIODES.map((p) => (
                <SelectItem key={p.days} value={String(p.days)}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void report.refetch();
            void activity.refetch();
          }}
          disabled={report.isFetching}
        >
          <RefreshCw data-icon="inline-start" className={report.isFetching ? "animate-spin" : undefined} />
          Actualiser
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={vehicles.length === 0}>
          <Download data-icon="inline-start" />
          Exporter
        </Button>
      </div>

      <div className={metricGridClass}>
        <MetricCard icon={Route} label="Trajets" value={t ? formatNumber(t.trips) : "—"} hint="Sur la période." />
        <MetricCard
          icon={Gauge}
          label="Distance parcourue"
          value={t ? `${formatNumber(t.distanceKm, 1)} km` : "—"}
          hint={t?.maxSpeedKph ? `Vitesse maximale : ${formatNumber(t.maxSpeedKph)} km/h.` : "Aucune vitesse relevée."}
        />
        <MetricCard
          icon={Timer}
          label="Temps de conduite"
          value={t ? formatDuration(t.drivingSeconds) : "—"}
          hint={t ? `Dont ${formatDuration(t.idleSeconds)} au ralenti.` : undefined}
        />
        <MetricCard
          icon={Truck}
          label="Véhicules actifs"
          value={t ? `${t.activeVehicles} / ${t.vehicles}` : "—"}
          hint="Ayant fait au moins un trajet."
        />
      </div>

      <ActivityChart days={activity.data?.days} loading={activity.isPending} />

      <Card>
        <CardHeader>
          <CardTitle>Trajets par véhicule</CardTitle>
          <CardDescription>
            Du {from.split("-").reverse().join("/")} au {to.split("-").reverse().join("/")} — tous les véhicules du
            client, même immobiles.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {report.isPending ? (
            <LoadingRows rows={5} />
          ) : report.isError ? (
            <div className="px-4">
              <ErrorState error={report.error} onRetry={() => report.refetch()} />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="px-4">
              <EmptyState icon={<Truck />} title="Aucun véhicule" description="Ce client n'a encore aucun véhicule." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
                    <TableHead className="text-right">Trajets</TableHead>
                    <TableHead className="text-right">Distance</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Conduite</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Ralenti</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Vit. moy.</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Vit. max</TableHead>
                    <TableHead className="hidden xl:table-cell">Dernier trajet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v) => (
                    <TableRow key={v.vehicleId} className={v.trips === 0 ? "text-muted-foreground" : undefined}>
                      <TableCell>
                        <Link
                          href={`/dashboard/vehicles/${v.vehicleId}`}
                          prefetch={false}
                          className="font-medium hover:underline"
                        >
                          {v.registration}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(v.trips)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(v.distanceKm, 1)} km</TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {formatDuration(v.drivingSeconds)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {formatDuration(v.idleSeconds)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums lg:table-cell">
                        {v.avgSpeedKph === null ? "—" : `${formatNumber(v.avgSpeedKph)} km/h`}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums lg:table-cell">
                        {v.maxSpeedKph === null ? "—" : `${formatNumber(v.maxSpeedKph)} km/h`}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">{formatDateTime(v.lastTripAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
