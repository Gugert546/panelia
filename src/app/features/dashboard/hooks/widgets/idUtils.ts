
// Hjelpefunksjoner for ID-generering og migrering av eldre widget-ID-er.
// Lager unik ID for lagrede dashboard-presets.

export function createDashboardPresetId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `preset:${crypto.randomUUID()}`;
  }

  return `preset:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Lager en unik instans-ID for notat-widgets slik at flere notater kan eksistere samtidig.

export function createNotesWidgetId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `notes:${crypto.randomUUID()}`;
  }

  return `notes:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Lager en unik ID for brukerdefinerte custom button-widgets.

export function createCustomButtonId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `customButton:${crypto.randomUUID()}`;
  }

  return `customButton:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Migrerer eldre custom button-ID-er til dagens navneromsformat.

export function migrateLegacyCustomButtonId(id: string) {
  if (!id.startsWith("customButton__")) return id;
  return `customButton:${id.slice("customButton__".length)}`;
}

// Bruker legacy ID-migrering på alle nøkler i et objekt.

export function migrateLegacyMap<T>(input: Record<string, T>) {
  return Object.fromEntries(
    Object.entries(input).map(([id, value]) => [migrateLegacyCustomButtonId(id), value])
  );
}
