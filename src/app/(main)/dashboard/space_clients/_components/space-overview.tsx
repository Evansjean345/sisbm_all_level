"use client";

import Link from "next/link";

import { ArrowRight, CalendarClock, FileSignature, type LucideIcon, Truck, UsersRound } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientSpace } from "@/hooks/api/use-client-space";
import { formatNumber } from "@/lib/format";
import type { ClientSpaceCounts } from "@/types/client-space";

import { SPACE_TABS, spaceHref } from "./space-tabs";

/** Résumé d'une rubrique, dans la carte de bienvenue. */
const RESUMES: Record<string, (c: ClientSpaceCounts) => string> = {
  horaires: (c) => `${c.activeSchedules} actif(s) sur ${c.schedules}`,
  zones: (c) => `${c.zones} zone(s)`,
  vitesse: (c) => `${c.speedPolicies} politique(s)`,
  regles: (c) => `${c.rules} règle(s)`,
  conducteurs: (c) => `${c.drivers} conducteur(s)`,
  rapports: () => "Trajets par véhicule",
  incidents: (c) => (c.openIncidents > 0 ? `${c.openIncidents} à traiter` : "Aucun en cours"),
};

/** Tableau de bord de l'espace client : quatre compteurs, puis accès aux rubriques. */
export function SpaceOverview({ organizationId }: { organizationId: string }) {
  const space = useClientSpace(organizationId);
  const c = space.data?.counts;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          icon={FileSignature}
          label="Souscriptions actives"
          value={c?.activeSubscriptions}
          hint="Contrats actifs pour ce client."
        />
        <StatCard
          icon={UsersRound}
          label="Conducteurs"
          value={c?.drivers}
          hint="Conducteurs rattachés à ce client."
          href={spaceHref(organizationId, "conducteurs")}
        />
        <StatCard
          icon={CalendarClock}
          label="Calendriers"
          value={c?.activeSchedules}
          hint={
            c && c.schedules > c.activeSchedules
              ? `Plages horaires actives pour ce client (${c.schedules} calendriers enregistrés).`
              : "Plages horaires actives pour ce client."
          }
          href={spaceHref(organizationId, "horaires")}
        />
        <StatCard icon={Truck} label="Véhicules" value={c?.vehicles} hint="Véhicules rattachés à ce client." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bienvenue dans l'espace client</CardTitle>
          <CardDescription>
            Tout ce qui concerne {space.data?.organization.name ?? "ce client"}, au même endroit. Les réglages faits ici
            s'appliquent à ses véhicules et à ses flottes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {SPACE_TABS.filter((t) => t.segment).map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.segment}
                href={spaceHref(organizationId, tab.segment)}
                prefetch={false}
                className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-sidebar/40 hover:bg-sidebar/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar/10 text-sidebar dark:text-foreground">
                  <Icon className="size-4" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-sm">{tab.label}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {c ? (RESUMES[tab.segment]?.(c) ?? "") : "…"}
                  </span>
                </div>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  hint: string;
  href?: string;
}) {
  const contenu = (
    <Card className="h-full transition-colors">
      <CardHeader className="gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground">
          <Icon className="size-4" />
        </div>
        <CardDescription className="text-foreground">{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {value === undefined ? (
          <Skeleton className="h-9 w-14" />
        ) : (
          <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{formatNumber(value)}</div>
        )}
        <p className="text-muted-foreground text-sm">{hint}</p>
      </CardContent>
    </Card>
  );
  if (!href) return contenu;
  return (
    <Link
      href={href}
      prefetch={false}
      className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:[&>[data-slot=card]]:border-sidebar/40"
    >
      {contenu}
    </Link>
  );
}
