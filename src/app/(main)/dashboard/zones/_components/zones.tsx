"use client";

import { type FormEvent, useState } from "react";

import {
  Circle,
  Hexagon,
  MapPinned,
  Pencil,
  Plus,
  Search,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/query-state";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { OrganizationSelect } from "@/features/common/organization/organization-select";
import {
  useGeofences,
  useSaveGeofence,
  useToggleClientRule,
} from "@/hooks/api/use-client-rules";
import { useVehicleGroups } from "@/hooks/api/use-groups";
import { getErrorMessage } from "@/lib/axios";
import type {
  Geofence,
  GeofencePayload,
  GeofenceShape,
} from "@/types/client-rules";
import type { PlaceSearchResult } from "@/types/geocoding";

import { useZoneVehicles } from "./use-zone-vehicles";
import { ZonesMap } from "./zones-map";

/** Valeur du filtre Flotte : tous les véhicules du client. */
const ALL_VEHICLES = "__all_vehicles__";

const COLORS = [
  ["#2563eb", "Bleu"],
  ["#16a34a", "Vert"],
  ["#dc2626", "Rouge"],
  ["#d97706", "Orange"],
  ["#7c3aed", "Violet"],
];

function getGeofenceAlertSettings(kind: GeofencePayload["kind"]) {
  return {
    alertOnEntry: kind === "forbidden",
    alertOnExit: kind === "authorized",
  };
}

const emptyDraft = (organizationId: string): GeofencePayload => ({
  organizationId,
  name: "",
  description: null,
  shape: "circle",
  center: null,
  radiusM: 300,
  points: [],
  kind: "authorized",
  ...getGeofenceAlertSettings("authorized"),
  vehicleIds: [],
  color: "#2563eb",
  active: true,
});

function isPlaceSearchResult(value: unknown): value is PlaceSearchResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "displayName" in value &&
    typeof value.displayName === "string" &&
    "lat" in value &&
    typeof value.lat === "number" &&
    Number.isFinite(value.lat) &&
    "lng" in value &&
    typeof value.lng === "number" &&
    Number.isFinite(value.lng)
  );
}

function getSearchError(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return "La recherche n’a pas pu aboutir. Réessayez.";
}

/**
 * Zones géographiques (rubrique client). Même écran pour la plateforme Client et la fiche client
 * du SuperAdmin : `organizationId` fixe le client et masque le filtre.
 */
export function Zones({
  organizationId: scoped,
}: { organizationId?: string } = {}) {
  const [filterOrg, setFilterOrg] = useState<string | undefined>();
  const [filterFleet, setFilterFleet] = useState<string | undefined>();
  const organizationId = scoped ?? filterOrg;
  const zones = useGeofences(organizationId);
  // Tri par client puis par flotte, comme la supervision : la flotte choisit les véhicules affichés sur la carte.
  const fleets = useVehicleGroups(
    { organizationId, perPage: 100 },
    { enabled: Boolean(organizationId) },
  );
  const fleetRows = organizationId ? (fleets.data?.data ?? []) : [];
  const zoneVehicles = useZoneVehicles(organizationId, filterFleet);
  const placedVehicles = zoneVehicles.vehicles.filter((v) => v.lastPosition);
  const save = useSaveGeofence();
  const toggle = useToggleClientRule();
  const [draft, setDraft] = useState<{
    payload: GeofencePayload;
    id?: string;
  } | null>(null);
  const [radiusInput, setRadiusInput] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeSearchPending, setPlaceSearchPending] = useState(false);
  const [placeSearchResults, setPlaceSearchResults] = useState<
    PlaceSearchResult[]
  >([]);
  const [mapPlace, setMapPlace] = useState<PlaceSearchResult | null>(null);

  const rows = zones.data ?? [];
  const p = draft?.payload;
  async function searchPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = placeQuery.trim();
    if (!query || placeSearchPending) return;

    setPlaceSearchPending(true);
    setPlaceSearchResults([]);
    setMapPlace(null);
    setSelectedId(null);

    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(getSearchError(payload));
      if (!Array.isArray(payload)) {
        throw new Error("La réponse du service de recherche est invalide.");
      }
      const results = payload.filter(isPlaceSearchResult);
      if (results.length !== payload.length) {
        throw new Error("La réponse du service de recherche est invalide.");
      }
      if (results.length === 0) {
        toast.error("Aucun lieu trouvé", {
          description: "Essayez une recherche plus précise.",
        });
        return;
      }

      setPlaceSearchResults(results);
      setMapPlace(results[0]);
    } catch (error) {
      toast.error("Recherche de lieu impossible", {
        description:
          error instanceof Error
            ? error.message
            : "Vérifiez votre connexion puis réessayez.",
      });
    } finally {
      setPlaceSearchPending(false);
    }
  }

  const set = <K extends keyof GeofencePayload>(k: K, v: GeofencePayload[K]) =>
    setDraft((d) => (d ? { ...d, payload: { ...d.payload, [k]: v } } : d));

  function edit(z: Geofence) {
    const { id, organization: _o, updatedAt: _u, ...payload } = z;
    setDraft({ payload, id });
    setRadiusInput(String(payload.radiusM ?? ""));
    setSelectedId(id);
    setMapPlace(null);
  }

  function submit() {
    if (!draft) return;
    save.mutate(
      {
        payload: {
          ...draft.payload,
          ...getGeofenceAlertSettings(draft.payload.kind),
          vehicleIds: [],
        },
        id: draft.id,
      },
      {
        onSuccess: (z) => {
          toast.success(draft.id ? "Zone modifiée" : "Zone créée", {
            description: z.name,
          });
          setDraft(null);
          setSelectedId(z.id);
        },
        onError: (e) =>
          toast.error("Enregistrement impossible", {
            description: getErrorMessage(e),
          }),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {scoped ? null : (
        <PageHeader
          title="Zones géographiques"
          description="Zones autorisées ou interdites, en cercle ou en polygone, avec alerte à l'entrée et/ou à la sortie."
          actions={
            <>
              <Button
                onClick={() => {
                  const payload = emptyDraft(organizationId ?? "");
                  setRadiusInput(String(payload.radiusM ?? ""));
                  setDraft({ payload });
                }}
              >
                <Plus data-icon="inline-start" />
                Nouvelle zone
              </Button>
            </>
          }
        />
      )}
      {scoped ? (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              const payload = emptyDraft(scoped);
              setRadiusInput(String(payload.radiusM ?? ""));
              setDraft({ payload });
            }}
          >
            <Plus data-icon="inline-start" />
            Nouvelle zone
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-end gap-3">
        {scoped ? null : (
          <Field className="w-full gap-1.5 sm:w-56">
            <FieldLabel htmlFor="zones-organization-filter">Client</FieldLabel>
            <OrganizationSelect
              id="zones-organization-filter"
              allowAll
              value={filterOrg}
              onChange={(id) => {
                setFilterOrg(id);
                setFilterFleet(undefined);
              }}
              className="w-full"
              placeholder="Tous les clients"
            />
          </Field>
        )}
        <Field className="w-full gap-1.5 sm:w-56">
          <FieldLabel htmlFor="zones-fleet-filter">Flotte</FieldLabel>
          <Select
            value={organizationId ? (filterFleet ?? ALL_VEHICLES) : ""}
            onValueChange={(id) =>
              setFilterFleet(id === ALL_VEHICLES ? undefined : id)
            }
            disabled={
              !organizationId || fleets.isPending || fleetRows.length === 0
            }
          >
            <SelectTrigger id="zones-fleet-filter" className="w-full">
              <SelectValue
                placeholder={
                  !organizationId
                    ? "Choisissez d'abord un client"
                    : fleets.isPending
                      ? "Chargement des flottes…"
                      : "Toutes les flottes"
                }
              />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                <SelectItem value={ALL_VEHICLES}>
                  Tous les véhicules du client
                </SelectItem>
                {fleetRows.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} · {group.membersCount} véhicule(s)
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        {organizationId ? (
          <p className="text-muted-foreground text-sm" role="status">
            {zoneVehicles.loading
              ? "Chargement des véhicules…"
              : `${placedVehicles.length} véhicule(s) sur la carte`}
          </p>
        ) : null}
      </div>

      <Alert>
        <MapPinned />
        <AlertTitle>Zones enregistrées</AlertTitle>
        <AlertDescription>
          Les zones sont stockées par l'API ; la détection d'entrée / sortie sur
          les positions GPS sera branchée avec l'évaluation des règles.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="overflow-hidden p-0">
          <CardContent className="flex flex-col gap-2 p-3">
            <form className="flex items-start gap-2" onSubmit={searchPlace}>
              <FieldGroup className="min-w-0 flex-1 gap-0">
                <Field className="gap-1">
                  <FieldLabel htmlFor="zone-place-search" className="sr-only">
                    Rechercher un lieu sur la carte
                  </FieldLabel>
                  <Input
                    id="zone-place-search"
                    value={placeQuery}
                    onChange={(event) => setPlaceQuery(event.target.value)}
                    placeholder="Rechercher une adresse ou un lieu"
                    autoComplete="off"
                  />
                  <FieldDescription className="text-xs">
                    Recherche transmise à{" "}
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noreferrer"
                    >
                      OpenStreetMap
                    </a>
                    .
                  </FieldDescription>
                </Field>
              </FieldGroup>
              <Button
                type="submit"
                disabled={placeSearchPending || !placeQuery.trim()}
              >
                {placeSearchPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Search data-icon="inline-start" />
                )}
                {placeSearchPending ? "Recherche…" : "Rechercher"}
              </Button>
            </form>
            {placeSearchResults.length > 1 ? (
              <ul className="flex max-h-36 flex-col gap-1 overflow-y-auto">
                {placeSearchResults.map((result) => (
                  <li key={result.id}>
                    <Button
                      type="button"
                      variant={
                        mapPlace?.id === result.id ? "secondary" : "ghost"
                      }
                      className="h-auto w-full flex-col items-start gap-1 whitespace-normal px-2 py-2 text-left"
                      aria-pressed={mapPlace?.id === result.id}
                      onClick={() => setMapPlace(result)}
                    >
                      <span className="w-full truncate font-medium">
                        {result.name}
                      </span>
                      <span className="w-full truncate text-muted-foreground text-xs">
                        {result.displayName}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : placeSearchResults.length === 1 ? (
              <p className="text-muted-foreground text-xs" role="status">
                Carte centrée sur : {placeSearchResults[0].displayName}
              </p>
            ) : null}
          </CardContent>
          <div className="h-[480px] xl:h-[620px]">
            <ZonesMap
              zones={rows}
              vehicles={placedVehicles}
              searchLocation={mapPlace}
              draft={
                p
                  ? {
                      id: "draft",
                      name: p.name || "Nouvelle zone",
                      shape: p.shape,
                      center: p.center,
                      radiusM: p.radiusM,
                      points: p.points,
                      color: p.color,
                      active: true,
                    }
                  : null
              }
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setMapPlace(null);
              }}
              onPick={(pt) => {
                if (!draft) return;
                if (draft.payload.shape === "circle") set("center", pt);
                else set("points", [...draft.payload.points, pt]);
              }}
            />
          </div>
        </Card>

        {draft && p ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {draft.id ? "Modifier la zone" : "Nouvelle zone"}
              </CardTitle>
              <CardDescription>
                {p.shape === "circle"
                  ? "Cliquez sur la carte pour placer le centre."
                  : "Cliquez les sommets du polygone sur la carte."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup className="gap-4">
                {scoped ? null : (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="gf-org">Client</FieldLabel>
                    <OrganizationSelect
                      id="gf-org"
                      className="w-full"
                      value={p.organizationId || undefined}
                      onChange={(id) => set("organizationId", id ?? "")}
                    />
                  </Field>
                )}
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="gf-name">Nom</FieldLabel>
                  <Input
                    id="gf-name"
                    value={p.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel>Forme</FieldLabel>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={p.shape}
                    onValueChange={(v) =>
                      v &&
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              payload: {
                                ...d.payload,
                                shape: v as GeofenceShape,
                                center: null,
                                points: [],
                              },
                            }
                          : d,
                      )
                    }
                  >
                    <ToggleGroupItem value="circle">
                      <Circle /> Cercle
                    </ToggleGroupItem>
                    <ToggleGroupItem value="polygon">
                      <Hexagon /> Polygone
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>
                {p.shape === "circle" ? (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="gf-radius">Rayon (mètres)</FieldLabel>
                    <Input
                      id="gf-radius"
                      type="number"
                      min={50}
                      value={radiusInput}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        setRadiusInput(rawValue);
                        const numericValue =
                          rawValue === "" ? null : Number(rawValue);
                        if (
                          numericValue === null ||
                          Number.isFinite(numericValue)
                        )
                          set("radiusM", numericValue);
                      }}
                    />
                    <FieldDescription>
                      {p.center
                        ? `Centre : ${p.center.lat}, ${p.center.lng}`
                        : "Centre non placé."}
                    </FieldDescription>
                  </Field>
                ) : (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {p.points.length} sommet(s)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={p.points.length === 0}
                      onClick={() => set("points", p.points.slice(0, -1))}
                    >
                      <Undo2 data-icon="inline-start" />
                      Retirer le dernier
                    </Button>
                  </div>
                )}
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="gf-kind">Type de zone</FieldLabel>
                  <Select
                    value={p.kind}
                    onValueChange={(v) => {
                      const kind = v as GeofencePayload["kind"];
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              payload: {
                                ...d.payload,
                                kind,
                                ...getGeofenceAlertSettings(kind),
                                color:
                                  kind === "forbidden"
                                    ? "#dc2626"
                                    : d.payload.color,
                              },
                            }
                          : d,
                      );
                    }}
                  >
                    <SelectTrigger id="gf-kind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectGroup>
                        <SelectItem value="authorized">
                          Zone autorisée
                        </SelectItem>
                        <SelectItem value="forbidden">
                          Zone interdite
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Une zone interdite déclenche les règles à l'entrée; une zone
                    autorisée, à la sortie. Configurez les actions dans le
                    moteur de règles.
                  </FieldDescription>
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel>Véhicules surveillés</FieldLabel>
                  <FieldDescription>
                    Tous les véhicules du client. Pour cibler un véhicule ou une
                    flotte, configurez le moteur de règles.
                  </FieldDescription>
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel>Couleur</FieldLabel>
                  <div className="flex gap-2">
                    {COLORS.map(([c, l]) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={l}
                        aria-pressed={p.color === c}
                        onClick={() => set("color", c)}
                        className="size-7 rounded-full border-2 aria-pressed:ring-2 aria-pressed:ring-ring aria-pressed:ring-offset-2"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </Field>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDraft(null)}>
                    <X data-icon="inline-start" />
                    Annuler
                  </Button>
                  <Button disabled={save.isPending} onClick={submit}>
                    {save.isPending ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    Enregistrer
                  </Button>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Zones ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {zones.isPending ? (
                <LoadingRows rows={4} />
              ) : zones.isError ? (
                <div className="px-4">
                  <ErrorState
                    error={zones.error}
                    onRetry={() => zones.refetch()}
                  />
                </div>
              ) : rows.length === 0 ? (
                <div className="px-4">
                  <EmptyState
                    icon={<MapPinned />}
                    title="Aucune zone"
                    description="Créez une zone puis dessinez-la sur la carte."
                  />
                </div>
              ) : (
                <ul className="flex flex-col divide-y">
                  {rows.map((z) => (
                    <li
                      key={z.id}
                      className={`flex items-center gap-3 px-4 py-2.5 ${selectedId === z.id ? "bg-muted/50" : ""}`}
                    >
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: z.color }}
                      />
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setSelectedId(z.id)}
                      >
                        <p className="truncate font-medium text-sm">{z.name}</p>
                        <p className="truncate text-muted-foreground text-xs">
                          {z.kind === "forbidden" ? "Interdite" : "Autorisée"} ·{" "}
                          {z.shape === "circle"
                            ? `cercle ${z.radiusM} m`
                            : `polygone ${z.points.length} pts`}
                          {scoped ? "" : ` · ${z.organization.name}`}
                        </p>
                      </button>
                      {z.active ? null : (
                        <StatusBadge tone="neutral">Inactive</StatusBadge>
                      )}
                      <Switch
                        checked={z.active}
                        aria-label={
                          z.active ? "Désactiver la zone" : "Activer la zone"
                        }
                        onCheckedChange={(active) =>
                          toggle.mutate({ kind: "geofence", id: z.id, active })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Modifier ${z.name}`}
                        onClick={() => edit(z)}
                      >
                        <Pencil />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
