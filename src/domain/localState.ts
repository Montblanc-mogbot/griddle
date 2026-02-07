import type { GriddleFileV1 } from './griddleFile';
import { parseGriddleJson, serializeGriddleFile } from './griddleIo';

const KEY = 'griddle:lastFile:v1';

export function saveLastFile(file: GriddleFileV1) {
  try {
    localStorage.setItem(KEY, serializeGriddleFile(file));
  } catch {
    // ignore quota / private mode errors
  }
}

export function loadLastFile(): GriddleFileV1 | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return parseGriddleJson(raw);
  } catch {
    return null;
  }
}

export function clearLastFile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
