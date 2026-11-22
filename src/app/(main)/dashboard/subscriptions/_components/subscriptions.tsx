"use client";

import { useState } from "react";

import { useSearchParams } from "next/navigation";

import {
  Ban,
  CircleCheck,
  CirclePause,
  Download,
  FilePen,
  FileSignature,
  Plus,
  RefreshCw,
  Search,
  Truck,
  UserRound,
} from "lucide-react";

import { MetricCard, metricGridClass } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { PaginationBar } from "@/components/pagination-bar";
import { EmptyState, ErrorState, LoadingRows } from "@/components/query-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrganizationCell, OrganizationFilter } from "@/features/common/organization/organization-select";
import { useOffers } from "@/hooks/api/use-offers";
import { useSubscriptions } from "@/hooks/api/use-subscriptions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { downloadCsv, formatDate } from "@/lib/format";
import {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_TARGETS,
  type Subscription,
  type SubscriptionStatus,
  type SubscriptionTarget,
  subscriptionStatusMeta,
  subscriptionTargetMeta,
} from "@/types/subscription";

import { SubscriptionFormDialog } from "./subscription-form-dialog";
import { SubscriptionRowActions } from "./subscription-row-actions";
import { formatMoney, formatTotal } from "./subscription-utils";

const ALL = "all";

/**
 * Souscriptions : client × offre × UNE cible — un groupe de véhicules OU un
 * client final (opérateur). Tarif appliqué = prix de l'offre figé − remise,
 * par période (forfait) ; cycle brouillon → active ⇄ suspendue → résiliée.
 * Une souscription active ouvre les pages de son offre au tableau de bord
 * concerné.
 *
 * `fixedTarget = "operator"` : page « Attribution des offres », réservée aux
 * souscriptions des clients finaux.
 */
export function Subscriptions({ fixedTarget }: { fixedTarget?: SubscriptionTarget } = {}) {
  const forOperators = fixedTarget === "operator";
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus | typeof ALL>(ALL);
  const [targetFilter, setTargetFilter] = useState<SubscriptionTarget | typeof ALL>(ALL);
  const target = fixedTarget ?? (targetFilter === ALL ? undefined : targetFilter);
  const [offerId, setOfferId] = useState<string>(searchParams.get("offerId") ?? ALL);
  const [organizationId, setOrganizationId] = useState<string | undefined>(
    searchParams.get("organizationId") ?? undefined,
  );
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim());

  const offers = useOffers({ perPage: 100 });
  const subscriptions = useSubscriptions({
    page,
    perPage,
    search: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
    offerId: offerId === ALL ? undefined : offerId,
    organizationId,
    target,
  });
  // Compteurs globaux par statut (une ligne suffit : on lit `meta.total`).
  const counts = {
    active: useSubscriptions({ perPage: 1, status: "active", target: fixedTarget }),
    draft: useSubscriptions({ perPage: 1, status: "draft", target: fixedTarget }),
    suspended: useSubscriptions({ perPage: 1, status: "suspended", target: fixedTarget }),
    terminated: useSubscriptions({ perPage: 1, status: "terminated", target: fixedTarget }),
  };

  const rows = subscriptions.data?.data ?? [];
  const resetPage = () => setPage(1);
  const filtered =
    Boolean(debouncedSearch) || status !== ALL || offerId !== ALL || targetFilter !== ALL || Boolean(organizationId);

  function exportCsv() {
    downloadCsv(
      `${forOperators ? "attributions" : "souscriptions"}-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((s) => ({
        reference: s.reference,
        client: s.organization?.name ?? "",
        offre: s.offer?.name ?? "",
        cible: subscriptionTargetMeta[s.target]?.short ?? s.target,
        groupe_vehicules: s.vehicleGroup?.name ?? "",
        client_final: s.operator?.fullName ?? "",
        email_client_final: s.operator?.email ?? "",
        vehicules: s.vehiclesCount ?? "",
        prix_offre: s.offerPrice,
        remise: s.discount,
        tarif_applique: s.totalPrice,
        devise: s.currency,
        periodicite: s.periodicity ?? "",
        debut: s.startDate,
        fin: s.endDate ?? "",
        statut: subscriptionStatusMeta[s.status]?.label ?? s.status,
      })),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={forOperators ? "Attribution des offres" : "Souscriptions"}
        description={
          forOperators
            ? "Offres attribuées directement aux clients finaux (opérateurs), sans groupe de véhicules. Un opérateur qui a sa propre souscription ne voit que les pages de cette offre ; sans souscription propre, il garde l'offre de son distributeur."
            : "Offres souscrites par les clients, pour une flotte ou pour un client final (opérateur). Tarif appliqué = prix de l'offre − remise, indépendant du nombre de véhicules. Une souscription active ouvre les pages de son offre au tableau de bord concerné."
        }
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
              <Download data-icon="inline-start" />
              Exporter
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" />
              {forOperators ? "Attribuer une offre" : "Nouvelle souscription"}
            </Button>
          </>
        }
      />

      <div className={metricGridClass}>
        <MetricCard
          icon={CircleCheck}
          label="Actives"
          value={counts.active.data?.meta.total ?? "—"}
          hint="Ouvrent les pages de l'offre."
        />
        <MetricCard icon={FilePen} label="Brouillons" value={counts.draft.data?.meta.total ?? "—"} hint="À activer." />
        <MetricCard
          icon={CirclePause}
          label="Suspendues"
          value={counts.suspended.data?.meta.total ?? "—"}
          hint="Pages masquées au client."
        />
        <MetricCard icon={Ban} label="Résiliées" value={counts.terminated.data?.meta.total ?? "—"} hint="Historique." />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <InputGroup className="md:max-w-lg">
          <InputGroupInput
            placeholder={
              forOperators ? "Rechercher par référence, client ou opérateur…" : "Rechercher par référence ou client…"
            }
            aria-label="Rechercher une souscription"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
          <OrganizationFilter
            value={organizationId}
            onChange={(id) => {
              setOrganizationId(id);
              resetPage();
            }}
          />
          <Select
            value={offerId}
            onValueChange={(v) => {
              setOfferId(v);
              resetPage();
            }}
          >
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">Offre :</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                <SelectItem value={ALL}>Toutes</SelectItem>
                {(offers.data?.data ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fixedTarget ? null : (
            <Select
              value={targetFilter}
              onValueChange={(v) => {
                setTargetFilter(v as SubscriptionTarget | typeof ALL);
                resetPage();
              }}
            >
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Cible :</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                <SelectGroup>
                  <SelectItem value={ALL}>Toutes</SelectItem>
                  {SUBSCRIPTION_TARGETS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {subscriptionTargetMeta[t].short}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as SubscriptionStatus | typeof ALL);
              resetPage();
            }}
          >
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">Statut :</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                <SelectItem value={ALL}>Tous</SelectItem>
                {SUBSCRIPTION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {subscriptionStatusMeta[s].label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => subscriptions.refetch()}
            disabled={subscriptions.isFetching}
          >
            <RefreshCw data-icon="inline-start" className={subscriptions.isFetching ? "animate-spin" : undefined} />
            Actualiser
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="px-0">
          {subscriptions.isPending ? (
            <LoadingRows rows={6} />
          ) : subscriptions.isError ? (
            <div className="px-4">
              <ErrorState error={subscriptions.error} onRetry={() => subscriptions.refetch()} />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4">
              <EmptyState
                icon={<FileSignature />}
                title={forOperators ? "Aucune offre attribuée" : "Aucune souscription"}
                description={
                  filtered
                    ? "Aucune souscription ne correspond à ces filtres."
                    : forOperators
                      ? "Attribuez une offre à un client final."
                      : "Créez la première souscription."
                }
                action={
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus data-icon="inline-start" />
                    {forOperators ? "Attribuer une offre" : "Nouvelle souscription"}
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Offre</TableHead>
                      <TableHead className="hidden lg:table-cell">{forOperators ? "Client final" : "Cible"}</TableHead>
                      {forOperators ? null : (
                        <TableHead className="hidden text-right md:table-cell">Véhicules</TableHead>
                      )}
                      <TableHead className="hidden text-right xl:table-cell">Prix de l'offre</TableHead>
                      <TableHead className="hidden text-right lg:table-cell">Remise</TableHead>
                      <TableHead className="text-right">Tarif appliqué</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((s) => {
                      const meta = subscriptionStatusMeta[s.status] ?? { label: s.status, tone: "neutral" as const };
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium font-mono text-xs">{s.reference}</span>
                              <span className="text-muted-foreground text-xs">
                                {s.endDate
                                  ? `${formatDate(s.startDate)} → ${formatDate(s.endDate)}`
                                  : `depuis le ${formatDate(s.startDate)}`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-48">
                            <OrganizationCell organization={s.organization} />
                          </TableCell>
                          <TableCell>{s.offer?.name ?? "—"}</TableCell>
                          <TableCell className="hidden max-w-56 lg:table-cell">
                            <TargetCell subscription={s} />
                          </TableCell>
                          {forOperators ? null : (
                            <TableCell className="hidden text-right tabular-nums md:table-cell">
                              {s.vehiclesCount ?? "—"}
                            </TableCell>
                          )}
                          <TableCell className="hidden whitespace-nowrap text-right text-muted-foreground tabular-nums xl:table-cell">
                            {formatMoney(s.offerPrice, s.currency)}
                          </TableCell>
                          <TableCell className="hidden whitespace-nowrap text-right text-muted-foreground tabular-nums lg:table-cell">
                            {Number(s.discount) > 0 ? `− ${formatMoney(s.discount, s.currency)}` : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                            {formatTotal(s)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <SubscriptionRowActions subscription={s} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar
                meta={subscriptions.data?.meta}
                perPage={perPage}
                label="souscriptions"
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

      <SubscriptionFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultOrganizationId={organizationId}
        defaultOfferId={offerId === ALL ? undefined : offerId}
        defaultTarget={fixedTarget ?? (targetFilter === ALL ? undefined : targetFilter)}
        lockTarget={Boolean(fixedTarget)}
      />
    </div>
  );
}

/** Flotte (nom du groupe) ou client final (nom + e-mail). */
function TargetCell({ subscription: s }: { subscription: Subscription }) {
  if (s.target === "operator") {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <UserRound className="size-4 shrink-0 text-muted-foreground" aria-label="Client final" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate">{s.operator?.fullName ?? "—"}</span>
          <span className="truncate text-muted-foreground text-xs">{s.operator?.email}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Truck className="size-4 shrink-0 text-muted-foreground" aria-label="Flotte" />
      <span className="truncate">{s.vehicleGroup?.name ?? "—"}</span>
    </div>
  );
}
