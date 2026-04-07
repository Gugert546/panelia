
// Verktøy for plassering av widgets, inkludert sentrert spawning og kollisjonssjekk.

import { DEFAULT_LAYOUTS, GRID_COLUMNS, GRID_ROWS } from "./constants";
import type { LayoutItem } from "./types";


// Returnerer true hvis to widget-rektangler overlapper.

function rectsOverlap(a: LayoutItem, b: LayoutItem) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function createCenteredLayout(
  widgetType: string,
  existingLayouts: Record<string, LayoutItem>
): LayoutItem {

  // Starter med standardstørrelse for widgettypen.

  const baseLayout = DEFAULT_LAYOUTS[widgetType] ?? DEFAULT_LAYOUTS.notes;
  const centeredX = Math.max(0, Math.floor((GRID_COLUMNS - baseLayout.w) / 2));
  const centeredY = Math.max(0, Math.floor((GRID_ROWS - baseLayout.h) / 2));

  const candidate: LayoutItem = {
    x: centeredX,
    y: centeredY,
    w: baseLayout.w,
    h: baseLayout.h,
  };

  const occupiedLayouts = Object.values(existingLayouts);

  // Bruk sentrum hvis plassen er ledig.

  if (!occupiedLayouts.some((layout) => rectsOverlap(candidate, layout))) {
    return candidate;
  }

  // Hvis sentrum er opptatt, flytt gradvis nedover til første ledige plass.

  for (let offset = 1; offset < GRID_ROWS; offset += 1) {
    const staggeredCandidate: LayoutItem = {
      ...candidate,
      y: Math.min(GRID_ROWS - baseLayout.h, centeredY + offset),
    };

    if (!occupiedLayouts.some((layout) => rectsOverlap(staggeredCandidate, layout))) {
      return staggeredCandidate;
    }
  }

  return candidate;
}
