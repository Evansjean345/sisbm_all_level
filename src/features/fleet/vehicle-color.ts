/**
 * Couleur d'affichage d'un véhicule sur la carte.
 *
 * Le champ « Couleur » d'un véhicule est un texte libre (« Blanc », « Bleu
 * nuit », « #1d4ed8 »…). On accepte un code hexadécimal tel quel, sinon on
 * reconnaît le nom de couleur courant (français ou anglais) ; à défaut, gris.
 */
const NAMED: [RegExp, string][] = [
  [/bleu\s*(nuit|marine|fonc)|navy/, "#1e3a8a"],
  [/bleu\s*(ciel|clair)|sky/, "#38bdf8"],
  [/bleu|blue/, "#2563eb"],
  [/blanc|white|ivoire/, "#f8fafc"],
  [/noir|black/, "#111827"],
  [/argent|silver|alu/, "#cbd5e1"],
  [/gris|grey|gray|anthracite/, "#6b7280"],
  [/bordeaux|grenat|maroon/, "#7f1d1d"],
  [/rouge|red/, "#dc2626"],
  [/rose|pink/, "#ec4899"],
  [/orange/, "#ea580c"],
  [/jaune|yellow|or\b|dor/, "#facc15"],
  [/vert|green|kaki/, "#16a34a"],
  [/violet|mauve|purple/, "#7c3aed"],
  [/marron|brun|brown|chocolat/, "#78350f"],
  [/beige|sable|cr[eè]me|champagne/, "#d6c7a1"],
];

export const DEFAULT_VEHICLE_COLOR = "#64748b";

export function vehicleColorHex(color: string | null | undefined): string {
  const value = (color ?? "").trim().toLowerCase();
  if (!value) return DEFAULT_VEHICLE_COLOR;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(value)) return value;
  const found = NAMED.find(([pattern]) => pattern.test(value));
  return found ? found[1] : DEFAULT_VEHICLE_COLOR;
}
