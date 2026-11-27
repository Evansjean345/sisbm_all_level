"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { ArrowRight, Building2, Cpu, Search, Truck, Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/query-state";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizationsStats } from "@/hooks/api/use-admin";
import { formatNumber } from "@/lib/format";

import { spaceHref } from "./space-tabs";

type StatusFilter = "all" | "active" | "inactive";

/**
 * Espaces clients : une carte par organisation, avec ses effectifs. Ouvrir
 * une carte donne accès à tout ce qui concerne ce client (horaires, zones,
 * vitesse, règles, conducteurs, rapports, incidents).
 */
export function ClientSpaces() {
  const organizations = useOrganizationsStats();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (organizations.data ?? []).filter(
      (o) =>
        (status === "all" || o.isActive === (status === "active")) &&
        (!q || o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)),
    );
  }, [organizations.data, search, status]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Espaces clients"
        description="Choisissez un client pour gérer ses horaires, zones, vitesses, règles, conducteurs, rapports et incidents."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="sm:max-w-md">
          <InputGroupInput
            placeholder="Nom ou code du client…"
            aria-label="Rechercher un client"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger size="sm" className="sm:ml-auto">
            <span className="text-muted-foreground">Statut :</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            <SelectGroup>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Désactivés</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {organizations.isError ? (
        <ErrorState error={organizations.error} onRetry={() => organizations.refetch()} />
      ) : !organizations.data ? (
        <LoadingRows rows={4} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="Aucun client"
          description={search ? "Aucun client ne correspond à cette recherche." : "Aucune organisation enregistrée."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((o) => (
            <Link
              key={o.id}
              href={spaceHref(o.id)}
              prefetch={false}
              className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors group-hover:border-sidebar/40 group-hover:bg-sidebar/5">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground">
                      <Building2 className="size-4" />
                    </div>
                    {o.isActive ? (
                      <StatusBadge tone="success">Active</StatusBadge>
                    ) : (
                      <StatusBadge tone="orange">Désactivée</StatusBadge>
                    )}
                  </div>
                  <CardTitle className="truncate pt-2">{o.name}</CardTitle>
                  <CardDescription className="font-mono text-xs">{o.code}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-2 text-muted-foreground text-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1" title="Véhicules">
                      <Truck className="size-3.5" />
                      {formatNumber(o.vehicles)}
                    </span>
                    <span className="inline-flex items-center gap-1" title="Comptes">
                      <Users className="size-3.5" />
                      {formatNumber(o.users)}
                    </span>
                    <span className="inline-flex items-center gap-1" title="Trackers">
                      <Cpu className="size-3.5" />
                      {formatNumber(o.devices)}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-medium text-sidebar dark:text-foreground">
                    Ouvrir
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
