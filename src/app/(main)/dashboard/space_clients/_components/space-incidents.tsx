"use client";

import { useState } from "react";

import Link from "next/link";

import { cn } from "cn";
import { MoreHorizontal, Plus, RefreshCw, Search, TriangleAlert } from "lucide-react";

import { PaginationBar } from "@/components/pagination-bar";
import { EmptyState, ErrorState, LoadingRows } from "@/components/query-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIncidents } from "@/hooks/api/use-incidents";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime } from "@/lib/format";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_TRANSITIONS,
  type Incident,
  type IncidentCategory,
  type IncidentSeverity,
  type IncidentStatus,
  incidentCategoryLabels,
  incidentSeverityMeta,
  incidentStatusMeta,
} from "@/types/incident";

import { IncidentFormDialog } from "./incident-form-dialog";
import { IncidentStatusDialog } from "./incident-status-dialog";

const ALL = "all";

/** Incidents de l'organisation : suivi des dossiers, de l'ouverture à la clôture. */
export function SpaceIncidents({ organizationId }: { organizationId: string }) {
  const [status, setStatus] = useState<IncidentStatus | typeof ALL>(ALL);
  const [severity, setSeverity] = useState<IncidentSeverity | typeof ALL>(ALL);
  const [category, setCategory] = useState<IncidentCategory | typeof ALL>(ALL);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [createOpen, setCreateOpen] = useState(false);
  const [action, setAction] = useState<{ incident: Incident; target: IncidentStatus } | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  const incidents = useIncidents({
    organizationId,
    status: status === ALL ? undefined : status,
    severity: severity === ALL ? undefined : severity,
    category: category === ALL ? undefined : category,
    search: debouncedSearch || undefined,
    page,
    perPage,
  });
  const rows = incidents.data?.data ?? [];
  const meta = incidents.data?.meta;
  const counts = meta?.counts;
  const tous = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;

  const filtres: Array<{ value: IncidentStatus | typeof ALL; label: string; n: number | undefined }> = [
    { value: ALL, label: "Tous", n: tous },
    ...INCIDENT_STATUSES.map((s) => ({ value: s, label: incidentStatusMeta[s].label, n: counts?.[s] })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Statut des incidents"
          className="flex flex-wrap gap-1 rounded-lg bg-muted-foreground/10 p-1"
        >
          {filtres.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={status === f.value}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-sm transition-colors",
                status === f.value
                  ? "bg-background text-foreground shadow-xs"
                  : "text-foreground/80 hover:bg-background/60",
              )}
            >
              {f.label}
              <span className="text-muted-foreground tabular-nums">{f.n ?? "…"}</span>
            </button>
          ))}
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus data-icon="inline-start" />
          Nouvel incident
        </Button>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <InputGroup className="md:max-w-lg">
          <InputGroupInput
            placeholder="Titre, référence ou immatriculation…"
            aria-label="Rechercher un incident"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
          <Select
            value={severity}
            onValueChange={(v) => {
              setSeverity(v as IncidentSeverity | typeof ALL);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">Gravité :</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                <SelectItem value={ALL}>Toutes</SelectItem>
                {INCIDENT_SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {incidentSeverityMeta[s].label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v as IncidentCategory | typeof ALL);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">Catégorie :</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                <SelectItem value={ALL}>Toutes</SelectItem>
                {INCIDENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {incidentCategoryLabels[c]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => incidents.refetch()} disabled={incidents.isFetching}>
            <RefreshCw data-icon="inline-start" className={incidents.isFetching ? "animate-spin" : undefined} />
            Actualiser
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="px-0">
          {incidents.isPending ? (
            <LoadingRows rows={6} />
          ) : incidents.isError ? (
            <div className="px-4">
              <ErrorState error={incidents.error} onRetry={() => incidents.refetch()} />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4">
              <EmptyState
                icon={<TriangleAlert />}
                title="Aucun incident"
                description={
                  status !== ALL || severity !== ALL || category !== ALL || debouncedSearch
                    ? "Aucun dossier ne correspond aux filtres."
                    : "Aucun incident n'a été déclaré pour ce client."
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Incident</TableHead>
                      <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                      <TableHead>Gravité</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="hidden lg:table-cell">Ouvert</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((i) => {
                      const suivants = INCIDENT_TRANSITIONS[i.status];
                      return (
                        <TableRow key={i.id}>
                          <TableCell className="min-w-56 max-w-md whitespace-normal">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{i.title}</span>
                              <span className="text-muted-foreground text-xs">
                                <span className="font-mono">{i.reference}</span>
                                {i.vehicle ? (
                                  <>
                                    {" · "}
                                    <Link
                                      href={`/dashboard/vehicles/${i.vehicle.id}`}
                                      prefetch={false}
                                      className="hover:underline"
                                    >
                                      {i.vehicle.registration}
                                    </Link>
                                  </>
                                ) : null}
                                {" · survenu le "}
                                {formatDateTime(i.occurredAt)}
                              </span>
                              {i.resolution ? (
                                <span className="line-clamp-1 text-muted-foreground text-xs" title={i.resolution}>
                                  Résolution : {i.resolution}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{incidentCategoryLabels[i.category]}</TableCell>
                          <TableCell>
                            <StatusBadge tone={incidentSeverityMeta[i.severity].tone} dot={false}>
                              {incidentSeverityMeta[i.severity].label}
                            </StatusBadge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge tone={incidentStatusMeta[i.status].tone}>
                              {incidentStatusMeta[i.status].label}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground lg:table-cell">
                            <div className="flex flex-col text-xs">
                              <span>{formatDateTime(i.openedAt)}</span>
                              {i.openedBy ? <span>par {i.openedBy.fullName}</span> : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={suivants.length === 0}
                                    aria-label={`Actions pour ${i.reference}`}
                                  >
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>{i.reference}</DropdownMenuLabel>
                                  {suivants.map((target) => (
                                    <DropdownMenuItem
                                      key={target}
                                      variant={target === "closed" ? "destructive" : "default"}
                                      onSelect={() => setAction({ incident: i, target })}
                                    >
                                      {i.status === "resolved" && target === "in_progress"
                                        ? "Rouvrir"
                                        : incidentStatusMeta[target].action}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar
                meta={
                  meta
                    ? {
                        total: meta.total,
                        perPage: meta.perPage,
                        currentPage: meta.page,
                        lastPage: Math.max(1, Math.ceil(meta.total / meta.perPage)),
                      }
                    : undefined
                }
                perPage={perPage}
                label="incidents"
                onPageChange={setPage}
                onPerPageChange={(n) => {
                  setPerPage(n);
                  setPage(1);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <IncidentFormDialog organizationId={organizationId} open={createOpen} onOpenChange={setCreateOpen} />
      <IncidentStatusDialog
        incident={action?.incident ?? null}
        target={action?.target ?? null}
        onClose={() => setAction(null)}
      />
    </div>
  );
}
