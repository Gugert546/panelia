/**
 * Grid configuration for dashboard layout.
 * 
 * These values have distinct purposes:
 * - GRID_COLUMNS: Used for scaling widget positions across responsive breakpoints
 * - GRID_BASE_ROWS: Used to calculate pixel height per row (container height / GRID_BASE_ROWS)
 * - MAX_WIDGET_PLACEMENT_ROWS: Maximum row where new widgets can be placed
 */

export const GRID_COLUMNS = 40;
export const GRID_BASE_ROWS = 40; // Base rows for calculating row height
export const MAX_WIDGET_PLACEMENT_ROWS = 20; // Max rows for widget placement

export const GRID_MAX_ROW_HEIGHT = 30;
export const GRID_MIN_ROW_HEIGHT = 12;
export const GRID_MIN_WIDTH = 320;
export const GRID_MIN_HEIGHT = 360;

/**
 * Responsive grid column breakpoints.
 * Adapts columns based on available width.
 */
export function resolveGridColumns(width: number): number {
  if (width >= 1500) return 40;
  if (width >= 1200) return 32;
  if (width >= 900) return 24;
  if (width >= 700) return 18;
  return 12;
}

/**
 * Calculate pixel height per grid row based on container height.
 * Uses GRID_BASE_ROWS (40) as divisor to maintain proportional row sizing.
 */
export function resolveGridRowHeight(height: number): number {
  const available = Math.max(GRID_MIN_HEIGHT, height);
  return clampGridValue(
    Math.floor(available / GRID_BASE_ROWS),
    GRID_MIN_ROW_HEIGHT,
    GRID_MAX_ROW_HEIGHT
  );
}

/**
 * Clamp a value between min and max bounds.
 */
function clampGridValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Scale a widget span from base grid (40 cols) to current responsive grid columns.
 * Used when layout changes due to window resize.
 */
export function scaleSpanToCurrent(span: number, currentCols: number): number {
  return clampGridValue(
    Math.round((span / GRID_COLUMNS) * currentCols),
    1,
    currentCols
  );
}

/**
 * Scale a widget X position from base grid to current responsive grid columns.
 */
export function scaleXToCurrent(x: number, w: number, currentCols: number): number {
  const scaledW = scaleSpanToCurrent(w, currentCols);
  const scaledX = Math.round((x / GRID_COLUMNS) * currentCols);
  return clampGridValue(scaledX, 0, Math.max(0, currentCols - scaledW));
}

/**
 * Scale a widget span from current responsive grid columns back to base grid (40 cols).
 * Used when storing layout to ensure consistent baseline.
 */
export function scaleSpanToBase(span: number, currentCols: number): number {
  return clampGridValue(
    Math.round((span / currentCols) * GRID_COLUMNS),
    1,
    GRID_COLUMNS
  );
}

/**
 * Scale a widget X position from current responsive grid columns back to base grid.
 */
export function scaleXToBase(x: number, w: number, currentCols: number): number {
  const scaledW = scaleSpanToBase(w, currentCols);
  const scaledX = Math.round((x / currentCols) * GRID_COLUMNS);
  return clampGridValue(scaledX, 0, Math.max(0, GRID_COLUMNS - scaledW));
}
