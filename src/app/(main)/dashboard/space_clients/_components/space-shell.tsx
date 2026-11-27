"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";
import { ArrowLeft } from "lucide-react";

import { ErrorState } from "@/components/query-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientSpace } from "@/hooks/api/use-client-space";

import { SPACE_TABS, spaceHref } from "./space-tabs";

/**
 * Espace d'une organisation cliente : en-tête (nom, statut, code), retour à la
 * fiche d'administration, et barre des rubriques. Chaque rubrique est une
 * route enfant : son état (onglet interne, filtres en URL) lui appartient.
 */
export function SpaceShell({ organizationId, children }: { organizationId: string; children: ReactNode }) {
  const space = useClientSpace(organizationId);
  const pathname = usePathname();
  const base = spaceHref(organizationId);
  const fiche = `/dashboard/entreprises/${organizationId}`;

  if (space.isError) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink href="/dashboard/space_clients" label="Espaces clients" />
        <ErrorState error={space.error} onRetry={() => space.refetch()} title="Espace client indisponible" />
      </div>
    );
  }

  const org = space.data?.organization;
  return (
    <div className="flex flex-col gap-4">
      <BackLink href={fiche} label="Fiche d'administration" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          {org ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-medium text-2xl leading-none tracking-tight sm:text-3xl">{org.name}</h1>
                {org.isActive ? (
                  <StatusBadge tone="success">Active</StatusBadge>
                ) : (
                  <StatusBadge tone="orange">Désactivée</StatusBadge>
                )}
              </div>
              <span className="font-mono text-muted-foreground text-xs">{org.code}</span>
            </>
          ) : (
            <>
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-28" />
            </>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={fiche} prefetch={false}>
            Retour à la fiche client
          </Link>
        </Button>
      </div>

      <nav aria-label="Rubriques de l'espace client" className="flex flex-wrap gap-1 rounded-xl bg-sidebar p-1.5">
        {SPACE_TABS.map((tab) => {
          const href = spaceHref(organizationId, tab.segment);
          const active = tab.segment === "" ? pathname === base : pathname.startsWith(href);
          const count = tab.count && space.data ? tab.count(space.data.counts) : 0;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.segment || "overview"}
              href={href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground",
                active
                  ? "bg-background text-sidebar shadow-xs dark:text-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-foreground/15",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {tab.label}
              {count > 0 ? (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums leading-5",
                    tab.alert ? "bg-destructive text-white" : "bg-sidebar-foreground/20",
                  )}
                >
                  {count}
                  <span className="sr-only"> en cours</span>
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={href} prefetch={false}>
          <ArrowLeft data-icon="inline-start" />
          {label}
        </Link>
      </Button>
    </div>
  );
}
