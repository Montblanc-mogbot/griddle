export interface UiPrefsV1 {
  noteIndicatorColor: string; // hex, e.g. #4f46e5
  workingGroupHighlightColor: string; // hex, e.g. #22c55e
}

const KEY = 'griddle:uiPrefs:v1';

export const DEFAULT_UI_PREFS: UiPrefsV1 = {
  // Indigo-600 (Tailwind-ish) – visible on both light/dark themes.
  noteIndicatorColor: '#4f46e5',
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
    return {
      noteIndicatorColor: typeof p.noteIndicatorColor === 'string' ? p.noteIndicatorColor : DEFAULT_UI_PREFS.noteIndicatorColor,
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
