import type { PlaceSearchResult } from "@/types/geocoding";

const DEFAULT_NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const MIN_REQUEST_INTERVAL_MS = 1_100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const MAX_CACHE_ENTRIES = 256;
const AUTH_TOKEN_COOKIE = "sisbm_token";

const resultCache = new Map<string, { expiresAt: number; results: PlaceSearchResult[] }>();
let nextRequestAt = 0;
let requestQueue: Promise<void> = Promise.resolve();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function getCachedResults(key: string) {
  const cached = resultCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    resultCache.delete(key);
    return null;
  }
  return cached.results;
}

function cacheResults(key: string, results: PlaceSearchResult[]) {
  if (resultCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = resultCache.keys().next();
    if (!oldestKey.done) resultCache.delete(oldestKey.value);
  }
  resultCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, results });
}

async function waitForRequestSlot() {
  const previous = requestQueue;
  let release: () => void = () => {};
  requestQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;

  try {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay > 0) await new Promise<void>((resolve) => setTimeout(resolve, delay));
    nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
  } finally {
    release();
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return jsonResponse({ error: "Origine de requête non autorisée." }, 403);
      }
    } catch {
      return jsonResponse({ error: "Origine de requête invalide." }, 403);
    }
  }

  const hasSessionCookie =
    request.headers
      .get("cookie")
      ?.split(";")
      .some((cookie) => {
        const [name, ...value] = cookie.trim().split("=");
        return name === AUTH_TOKEN_COOKIE && value.join("=").length > 0;
      }) ?? false;
  if (!hasSessionCookie) return jsonResponse({ error: "Connectez-vous pour rechercher un lieu." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Requête de recherche invalide." }, 400);
  }

  if (!isRecord(body) || typeof body.query !== "string") {
    return jsonResponse({ error: "Saisissez un lieu à rechercher." }, 400);
  }

  const query = body.query.trim();
  if (query.length < 2 || query.length > 160) {
    return jsonResponse({ error: "Le lieu doit contenir entre 2 et 160 caractères." }, 400);
  }

  const baseUrl = process.env.NOMINATIM_BASE_URL || DEFAULT_NOMINATIM_BASE_URL;
  let searchUrl: URL;
  try {
    searchUrl = new URL("search", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  } catch {
    return jsonResponse({ error: "L’adresse du service de recherche est invalide." }, 500);
  }

  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("format", "jsonv2");
  searchUrl.searchParams.set("limit", "5");
  searchUrl.searchParams.set("accept-language", "fr");

  const cacheKey = `${searchUrl.origin}${searchUrl.pathname}:${query.toLocaleLowerCase("fr")}`;
  const cached = getCachedResults(cacheKey);
  if (cached) return jsonResponse(cached);

  await waitForRequestSlot();
  const cachedAfterWait = getCachedResults(cacheKey);
  if (cachedAfterWait) return jsonResponse(cachedAfterWait);

  const referer = origin ?? new URL(request.url).origin;
  let upstream: Response;
  try {
    upstream = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "fr",
        Referer: `${referer}/`,
        "User-Agent": "SISBM Admin/2.2.0",
      },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Nominatim search request failed.", error);
    return jsonResponse({ error: "Le service de recherche de lieux est indisponible." }, 502);
  }

  if (!upstream.ok) {
    console.error(`Nominatim returned HTTP ${upstream.status}.`);
    return jsonResponse({ error: "Le service de recherche de lieux a refusé la requête." }, 502);
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch (error) {
    console.error("Nominatim returned invalid JSON.", error);
    return jsonResponse({ error: "La réponse du service de recherche est invalide." }, 502);
  }

  if (!Array.isArray(payload)) {
    return jsonResponse({ error: "La réponse du service de recherche est invalide." }, 502);
  }

  const results = payload.flatMap((place: unknown): PlaceSearchResult[] => {
    if (
      !isRecord(place) ||
      typeof place.display_name !== "string" ||
      typeof place.lat !== "string" ||
      typeof place.lon !== "string"
    ) {
      return [];
    }

    const lat = Number(place.lat);
    const lng = Number(place.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

    const displayName = place.display_name;
    return [
      {
        id:
          typeof place.place_id === "number" || typeof place.place_id === "string"
            ? String(place.place_id)
            : `${lat},${lng}`,
        name: typeof place.name === "string" && place.name ? place.name : displayName.split(",")[0],
        displayName,
        lat,
        lng,
      },
    ];
  });

  cacheResults(cacheKey, results);
  return jsonResponse(results);
}
