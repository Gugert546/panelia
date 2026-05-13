export type LayoutRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

// Normaliserer liste over aktive widgeter med fallback til standardverdier.
// Returnerer tom liste hvis dokument finnes, ellers alle offentlige widget-IDer.
export function normalizeActiveWidgetsWithDefaults(
  value: unknown,
  docExists: boolean,
  publicWidgetIds: readonly string[]
) {
  if (!Array.isArray(value)) return docExists ? [] : [...publicWidgetIds];
  return value.filter((item): item is string => typeof item === "string");
}

// Typekontroll for LayoutRect-objekt. Validerer at alle posisjon- og størrelsesfelt er gyldige tall.
export function isLayoutRect(value: unknown): value is LayoutRect {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return ["x", "y", "w", "h"].every(
    (key) => typeof item[key] === "number" && Number.isFinite(item[key])
  );
}

// Normaliserer layout-data ved å validere og ekstrahere gyldige LayoutRect-objekter.
export function normalizeLayouts(value: unknown) {
  const result: Record<string, LayoutRect> = {};
  if (!value || typeof value !== "object") return result;

  for (const [id, layout] of Object.entries(value as Record<string, unknown>)) {
    if (!isLayoutRect(layout)) continue;

    result[id] = {
      x: layout.x,
      y: layout.y,
      w: layout.w,
      h: layout.h,
    };
  }

  return result;
}

// Normaliserer layouts med fallback til offentlige standardlayouter hvis dokument ikke finnes.
export function normalizeLayoutsWithDefaults(
  value: unknown,
  docExists: boolean,
  publicLayouts: Record<string, LayoutRect>
) {
  const base: Record<string, LayoutRect> = docExists ? {} : { ...publicLayouts };
  if (!value || typeof value !== "object") return base;

  for (const [id, layout] of Object.entries(value as Record<string, unknown>)) {
    if (!isLayoutRect(layout)) continue;

    base[id] = {
      x: layout.x,
      y: layout.y,
      w: layout.w,
      h: layout.h,
    };
  }

  return base;
}

// Ekstraherer og validerer boolean-verdier fra objekt. Fjerner ikke-boolean-verdier.
export function normalizeBooleanMap(value: unknown) {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean"
    )
  );
}

// Ekstraherer og validerer nestede objekter fra data. Fjerner primitiver og arrays.
export function normalizeObjectMap(value: unknown) {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, Record<string, unknown>] =>
        Boolean(entry[1]) && typeof entry[1] === "object" && !Array.isArray(entry[1])
    )
  );
}

// Sjekker om to layoutrektangler overlapper hverandre. Brukes for kollisjonsdeteksjon.
export function rectsOverlap(a: LayoutRect, b: LayoutRect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
