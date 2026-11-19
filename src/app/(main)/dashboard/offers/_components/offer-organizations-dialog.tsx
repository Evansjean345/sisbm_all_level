"use client";

import { useEffect, useMemo, useState } from "react";

import { Search } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingRows } from "@/components/query-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useOrganizationsStats } from "@/hooks/api/use-admin";
import { useAttachOfferOrganizations, useDetachOfferOrganization, useOffer, useOffers } from "@/hooks/api/use-offers";
import { getErrorMessage } from "@/lib/axios";
import type { Offer } from "@/types/offer";

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/**
 * Organisations détentrices d'une offre — liste à cocher.
 *
 * Une organisation ne détient qu'UNE offre : en cocher une qui en détient
 * déjà une autre la DÉPLACE vers celle-ci (annoncé avant l'enregistrement).
 * L'enregistrement rattache les ajouts (`move: true` si besoin), puis
 * détache les retraits.
 */
export function OfferOrganizationsDialog({
  offer,
  open,
  onOpenChange,
}: {
  offer: Offer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useOffer(open ? offer.id : undefined);
  const organizations = useOrganizationsStats(open);
  const assigned = useOffers({ assigned: true, perPage: 100 }, { enabled: open });
  const attach = useAttachOfferOrganizations();
  const detach = useDetachOfferOrganization();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const current = useMemo(() => new Set(offer.organizations.map((o) => o.id)), [offer.organizations]);
  useEffect(() => {
    if (open) {
      setSelected(new Set(current));
      setSearch("");
    }
  }, [open, current]);

  /** Organisation → code de l'AUTRE offre qu'elle détient. */
  const elsewhere = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of assigned.data?.data ?? []) {
      if (o.id === offer.id) continue;
      for (const g of o.organizations) map.set(g.id, o.code);
    }
    return map;
  }, [assigned.data, offer.id]);

  const vehicles = useMemo(
    () => new Map((detail.data?.organizations ?? []).map((g) => [g.id, g.vehicles])),
    [detail.data],
  );

  const term = search.trim().toLowerCase();
  const rows = [...(organizations.data ?? [])]
    .filter((o) => !term || o.name.toLowerCase().includes(term) || o.code.toLowerCase().includes(term))
    .sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)) || a.name.localeCompare(b.name));

  const added = [...selected].filter((id) => !current.has(id));
  const removed = [...current].filter((id) => !selected.has(id));
  const moved = added.filter((id) => elsewhere.has(id));
  const unchanged = added.length === 0 && removed.length === 0;

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      if (added.length) {
        await attach.mutateAsync({ id: offer.id, organizationIds: added, move: moved.length > 0 });
      }
      for (const organizationId of removed) {
        await detach.mutateAsync({ id: offer.id, organizationId });
      }
      const parts = [
        added.length ? `${plural(added.length, "organisation")} rattachée${added.length > 1 ? "s" : ""}` : null,
        moved.length ? `dont ${moved.length} déplacée${moved.length > 1 ? "s" : ""}` : null,
        removed.length ? `${plural(removed.length, "organisation")} détachée${removed.length > 1 ? "s" : ""}` : null,
      ].filter(Boolean);
      toast.success(`Offre ${offer.code} mise à jour`, { description: parts.join(", ") });
      onOpenChange(false);
    } catch (error) {
      toast.error("Enregistrement impossible", { description: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  const max = offer.maxVehicles;

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Organisations — {offer.name}</DialogTitle>
          <DialogDescription>
            Cochez les organisations qui détiennent l'offre {offer.code}. Une organisation ne détient qu'une offre : en
            cocher une qui en a déjà une autre la déplace ici.
          </DialogDescription>
        </DialogHeader>

        <InputGroup>
          <InputGroupInput
            placeholder="Rechercher une organisation…"
            aria-label="Rechercher une organisation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>

        <div className="-mx-1 min-h-40 flex-1 overflow-y-auto px-1">
          {organizations.isPending || assigned.isPending ? (
            <LoadingRows rows={5} />
          ) : organizations.isError ? (
            <ErrorState error={organizations.error} onRetry={() => organizations.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title="Aucune organisation" description={term ? "Aucun résultat pour cette recherche." : ""} />
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((o) => {
                const checked = selected.has(o.id);
                const other = elsewhere.get(o.id);
                const count = vehicles.get(o.id);
                const over = checked && max !== null && count !== undefined && count > max;
                return (
                  <li key={o.id}>
                    <label
                      htmlFor={`offer-org-${o.id}`}
                      className="flex cursor-pointer items-center gap-3 rounded-md border p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                    >
                      <Checkbox
                        id={`offer-org-${o.id}`}
                        checked={checked}
                        onCheckedChange={(v) => toggle(o.id, v === true)}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium text-sm">{o.name}</span>
                        <span className="truncate text-muted-foreground text-xs">
                          {o.code}
                          {o.isActive ? "" : " · désactivée"}
                          {count !== undefined && checked
                            ? ` · ${plural(count, "véhicule")}${max !== null ? ` / ${max} max` : ""}`
                            : ""}
                        </span>
                      </span>
                      {over ? (
                        <StatusBadge tone="warning" dot={false}>
                          Au-delà de la limite
                        </StatusBadge>
                      ) : null}
                      {other && !current.has(o.id) ? (
                        <StatusBadge tone={checked ? "orange" : "neutral"} dot={false}>
                          {checked ? `Quitte ${other}` : `Offre ${other}`}
                        </StatusBadge>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-muted-foreground text-sm">
            {unchanged
              ? `${plural(selected.size, "organisation")} détentrice${selected.size > 1 ? "s" : ""}`
              : [
                  added.length ? `+${added.length}` : null,
                  removed.length ? `−${removed.length}` : null,
                  moved.length ? plural(moved.length, "déplacement") : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button disabled={saving || unchanged} onClick={save}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
