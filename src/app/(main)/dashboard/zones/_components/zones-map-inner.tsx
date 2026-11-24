"use client";

import { useEffect, useRef } from "react";

import type { LatLngBoundsExpression } from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { fleetState } from "@/features/fleet/fleet-state";
import { vehicleIcon } from "@/features/fleet/vehicle-marker";
import type { GeofenceShape, LatLng } from "@/types/client-rules";
import type { PlaceSearchResult } from "@/types/geocoding";
import type { VehicleDetail } from "@/types/vehicle";

export interface MapZone {
  id: string;
  name: string;
  shape: GeofenceShape;
  center: LatLng | null;
  radiusM: number | null;
  points: LatLng[];
  color: string;
  active: boolean;
}

export interface ZonesMapProps {
  zones: MapZone[];
  /** Zone en cours de dessin (affichée en pointillés). */
  draft?: MapZone | null;
  /** Clic sur la carte en mode dessin. */
  onPick?: (p: LatLng) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  searchLocation?: PlaceSearchResult | null;
  /** Véhicules du client / de la flotte filtrés, à leur dernière position. */
  vehicles?: VehicleDetail[];
}

const ABIDJAN: [number, number] = [5.3364, -4.0267];

function ClickCapture({ onPick }: { onPick?: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick?.({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
}

/** Recentre la carte sur les zones affichées (ou sur la zone sélectionnée). */
function FitBounds({
  zones,
  vehicles,
  selectedId,
  searchLocation,
}: {
  zones: MapZone[];
  vehicles: VehicleDetail[];
  selectedId?: string | null;
  searchLocation?: PlaceSearchResult | null;
}) {
  const map = useMap();
  // Recadrer quand la LISTE des véhicules change (filtre client / flotte), pas à chaque position reçue.
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;
  const vehicleKey = vehicles.map((v) => v.id).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: vehicleKey remplace vehicles (positions temps réel exclues)
  useEffect(() => {
    if (
      searchLocation ||
      !map.getContainer().isConnected ||
      !map.getPane("mapPane")
    )
      return;
    const target = selectedId
      ? zones.filter((z) => z.id === selectedId)
      : zones;
    const pts = target.flatMap((z) =>
      z.shape === "circle" && z.center ? [z.center] : z.points,
    );
    // Sans zone sélectionnée, les véhicules affichés comptent aussi dans le cadrage.
    if (!selectedId) {
      for (const v of vehiclesRef.current) {
        if (v.lastPosition)
          pts.push({
            lat: Number(v.lastPosition.latitude),
            lng: Number(v.lastPosition.longitude),
          });
      }
    }
    if (pts.length === 0) return;
    const bounds: LatLngBoundsExpression = pts.map(
      (p) => [p.lat, p.lng] as [number, number],
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, zones, vehicleKey, selectedId, searchLocation]);
  return null;
}

/**
 * Véhicule sur la carte : voiture à la couleur du véhicule + étiquette
 * (même marqueur que la supervision). Non cliquable : un clic sur la carte
 * reste disponible pour dessiner une zone.
 */
function VehicleMarker({ vehicle }: { vehicle: VehicleDetail }) {
  const p = vehicle.lastPosition;
  if (!p) return null;
  return (
    <Marker
      position={[Number(p.latitude), Number(p.longitude)]}
      icon={vehicleIcon(
        vehicle.registration,
        vehicle.vehicleType,
        fleetState(vehicle),
        false,
        null,
        vehicle.color,
      )}
      interactive={false}
      keyboard={false}
      title={vehicle.registration}
    />
  );
}

function FocusSearchLocation({
  location,
}: {
  location?: PlaceSearchResult | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!location || !map.getContainer().isConnected || !map.getPane("mapPane"))
      return;
    map.flyTo([location.lat, location.lng], 15, { duration: 0.8 });
  }, [map, location]);
  return null;
}

function Shape({
  zone,
  dashed,
  onSelect,
}: {
  zone: MapZone;
  dashed?: boolean;
  onSelect?: (id: string) => void;
}) {
  const options = {
    color: zone.color,
    weight: dashed ? 2 : 2,
    dashArray: dashed ? "6 6" : undefined,
    fillOpacity: zone.active ? 0.18 : 0.05,
    opacity: zone.active ? 1 : 0.5,
  };
  const handlers = onSelect ? { click: () => onSelect(zone.id) } : undefined;
  if (zone.shape === "circle" && zone.center) {
    return (
      <Circle
        center={[zone.center.lat, zone.center.lng]}
        radius={zone.radiusM ?? 100}
        pathOptions={options}
        eventHandlers={handlers}
      >
        <Tooltip>{zone.name}</Tooltip>
      </Circle>
    );
  }
  if (zone.points.length >= 2) {
    return (
      <Polygon
        positions={zone.points.map((p) => [p.lat, p.lng] as [number, number])}
        pathOptions={options}
        eventHandlers={handlers}
      >
        <Tooltip>{zone.name}</Tooltip>
      </Polygon>
    );
  }
  return null;
}

export default function ZonesMapInner({
  zones,
  draft,
  onPick,
  selectedId,
  onSelect,
  searchLocation,
  vehicles = [],
}: ZonesMapProps) {
  return (
    <MapContainer
      center={ABIDJAN}
      zoom={12}
      className="size-full"
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        className="dark:brightness-90 dark:contrast-90 dark:hue-rotate-180 dark:invert"
      />
      <ClickCapture onPick={onPick} />
      {draft ? null : (
        <FitBounds
          zones={zones}
          vehicles={vehicles}
          selectedId={selectedId}
          searchLocation={searchLocation}
        />
      )}
      <FocusSearchLocation location={searchLocation} />
      {zones.map((z) => (
        <Shape key={z.id} zone={z} onSelect={onSelect} />
      ))}
      {vehicles.map((v) => (
        <VehicleMarker key={v.id} vehicle={v} />
      ))}
      {searchLocation ? (
        <CircleMarker
          center={[searchLocation.lat, searchLocation.lng]}
          radius={8}
          pathOptions={{
            color: "#2563eb",
            fillColor: "#fff",
            fillOpacity: 1,
            weight: 3,
          }}
        >
          <Tooltip>{searchLocation.name}</Tooltip>
        </CircleMarker>
      ) : null}
      {draft ? (
        <>
          <Shape zone={draft} dashed />
          {draft.shape === "polygon"
            ? draft.points.map((p, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: sommets ordonnés du polygone en cours
                <CircleMarker
                  key={i}
                  center={[p.lat, p.lng]}
                  radius={4}
                  pathOptions={{ color: draft.color }}
                />
              ))
            : null}
          {draft.shape === "circle" && draft.center ? (
            <CircleMarker
              center={[draft.center.lat, draft.center.lng]}
              radius={4}
              pathOptions={{ color: draft.color }}
            />
          ) : null}
        </>
      ) : null}
    </MapContainer>
  );
}
