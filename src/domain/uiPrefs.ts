export interface UiPrefsV1 {
  noteIndicatorColor: string; // hex, e.g. #4f46e5
  /** 0-100 (%). Higher = more opaque / vibrant. */
  noteIndicatorIntensity: number;
  workingGroupHighlightColor: string; // hex, e.g. #22c55e
}

const KEY = 'griddle:uiPrefs:v1';

export const DEFAULT_UI_PREFS: UiPrefsV1 = {
  // Indigo-600 (Tailwind-ish) – visible on both light/dark themes.
  noteIndicatorColor: '#4f46e5',
  // 0-100 (%). 60% matches the previous defaults roughly.
  noteIndicatorIntensity: 60,
  // Green-500 – matches existing working highlight.
  workingGroupHighlightColor: '#22c55e',
};

export function loadUiPrefs(): UiPrefsV1 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_UI_PREFS;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_UI_PREFS;

    const p = parsed as Partial<UiPrefsV1>;

    // Migration: older prefs may not include newer keys.
    const intensityRaw = p.noteIndicatorIntensity;
    const noteIndicatorIntensity =
      typeof intensityRaw === 'number' && Number.isFinite(intensityRaw)
        ? Math.min(100, Math.max(0, Math.round(intensityRaw)))
        : DEFAULT_UI_PREFS.noteIndicatorIntensity;

    return {
      noteIndicatorColor:
        typeof p.noteIndicatorColor === 'string' ? p.noteIndicatorColor : DEFAULT_UI_PREFS.noteIndicatorColor,
      noteIndicatorIntensity,
      workingGroupHighlightColor:
        typeof p.workingGroupHighlightColor === 'string'
          ? p.workingGroupHighlightColor
          : DEFAULT_UI_PREFS.workingGroupHighlightColor,
    };
  } catch {
    return DEFAULT_UI_PREFS;
  }
}

export function saveUiPrefs(prefs: UiPrefsV1) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}
