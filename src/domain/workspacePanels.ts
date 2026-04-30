import { CompactSelection, type GridSelection } from '@glideapps/glide-data-grid';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SelectedCell } from './types';

export type PanelMode = 'none' | 'entry' | 'bulk' | 'fullRecords';
type PendingPanelMode = 'entry' | 'bulk' | null;
type PointerOrigin = 'grid' | 'ui' | null;

export function createEmptyGridSelection(): GridSelection {
  return {
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  };
}

export function useWorkspacePanels() {
  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('entry');
  const [fullRecordsRecordIds, setFullRecordsRecordIds] = useState<string[] | null>(null);
  const [gridSelection, setGridSelection] = useState<GridSelection>(() => createEmptyGridSelection());
  const [pointerDown, setPointerDown] = useState(false);
  const [pendingPanelMode, setPendingPanelMode] = useState<PendingPanelMode>(null);

  const gridAreaRef = useRef<HTMLDivElement | null>(null);
  const pointerDownRef = useRef(false);
  const pointerOriginRef = useRef<PointerOrigin>(null);

  const clearGridSelection = useCallback(() => {
    setGridSelection(createEmptyGridSelection());
  }, []);

  const clearWorkspaceSelection = useCallback(() => {
    setSelected(null);
    setFullRecordsRecordIds(null);
    clearGridSelection();
  }, [clearGridSelection]);

  const transitionToNoPanel = useCallback((options?: { clearWorkspace?: boolean; clearFullRecordsRecordIds?: boolean }) => {
    if (options?.clearWorkspace) {
      clearWorkspaceSelection();
      return;
    }

    if (options?.clearFullRecordsRecordIds) {
      setFullRecordsRecordIds(null);
    }

    setPanelMode('none');
  }, [clearWorkspaceSelection]);

  const transitionToEntry = useCallback((selection: SelectedCell, options?: { deferWhileDragging?: boolean; preserveFullRecordsRecordIds?: boolean }) => {
    setSelected(selection);

    if (!options?.preserveFullRecordsRecordIds) {
      setFullRecordsRecordIds(null);
    }

    if (options?.deferWhileDragging && pointerDownRef.current && pointerOriginRef.current === 'grid') {
      setPanelMode('none');
      setPendingPanelMode('entry');
      return;
    }

    setPendingPanelMode(null);
    setPanelMode('entry');
  }, []);

  const transitionToBulk = useCallback((options?: { deferUntilPointerUp?: boolean }) => {
    setFullRecordsRecordIds(null);

    if (options?.deferUntilPointerUp) {
      setPanelMode('none');
      setPendingPanelMode('bulk');
      return;
    }

    setPendingPanelMode(null);
    setPanelMode('bulk');
  }, []);

  const transitionToFullRecords = useCallback((options?: { recordIds?: string[] | null; preserveBulkSelection?: boolean }) => {
    if (options?.recordIds) {
      setFullRecordsRecordIds(options.recordIds);
    } else if (!options?.preserveBulkSelection) {
      setFullRecordsRecordIds(null);
    }

    setPendingPanelMode(null);
    setPanelMode('fullRecords');
  }, []);

  const openEntryFromSelection = useCallback((selection: SelectedCell) => {
    transitionToEntry(selection, { deferWhileDragging: true });
  }, [transitionToEntry]);

  const openFullRecordsFromBulk = useCallback((recordIds: string[]) => {
    transitionToFullRecords({ recordIds, preserveBulkSelection: true });
  }, [transitionToFullRecords]);

  useEffect(() => {
    const opts = { capture: true } as const;

    const down = (e: Event) => {
      pointerDownRef.current = true;
      setPointerDown(true);

      const t = e.target;
      if (t instanceof Node && gridAreaRef.current?.contains(t)) pointerOriginRef.current = 'grid';
      else pointerOriginRef.current = 'ui';
    };

    const up = () => {
      pointerDownRef.current = false;
      setPointerDown(false);
      pointerOriginRef.current = null;
    };

    window.addEventListener('pointerdown', down, opts);
    window.addEventListener('pointerup', up, opts);
    window.addEventListener('pointercancel', up, opts);
    window.addEventListener('mousedown', down, opts);
    window.addEventListener('mouseup', up, opts);

    return () => {
      window.removeEventListener('pointerdown', down, opts);
      window.removeEventListener('pointerup', up, opts);
      window.removeEventListener('pointercancel', up, opts);
      window.removeEventListener('mousedown', down, opts);
      window.removeEventListener('mouseup', up, opts);
    };
  }, []);

  return {
    selected,
    setSelected,
    panelMode,
    setPanelMode,
    fullRecordsRecordIds,
    gridSelection,
    setGridSelection,
    pointerDown,
    pendingPanelMode,
    setPendingPanelMode,
    gridAreaRef,
    pointerOriginRef,
    clearGridSelection,
    clearWorkspaceSelection,
    transitionToNoPanel,
    transitionToEntry,
    transitionToBulk,
    transitionToFullRecords,
    openEntryFromSelection,
    openFullRecordsFromBulk,
  };
}
