import { useCallback, useMemo, useRef, useState } from "react";

export type UndoRedoCommand<TState> = {
  label: string;
  /** Apply the command to a state and return the next state. */
  do: (state: TState) => TState;
  /** Revert the command from a state and return the previous state. */
  undo: (state: TState) => TState;
};

export type UndoRedoSnapshot<TState> = {
  past: UndoRedoCommand<TState>[];
  present: TState;
  future: UndoRedoCommand<TState>[];
};

export type UndoRedoOptions = {
  /** Maximum number of commands to keep in history. */
  capacity?: number;
};

export type UndoRedoApi<TState> = {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  /**
   * Apply a command and push it onto history.
   * Clears future.
   */
  apply: (cmd: UndoRedoCommand<TState>) => void;
  /**
   * Replace present state without affecting history.
   * Use for imports/resets.
   */
  setPresent: (next: TState) => void;
  /** Debug/inspection */
  history: { pastCount: number; futureCount: number; lastLabel?: string };
};

export function useUndoRedo<TState>(initial: TState, options?: UndoRedoOptions): UndoRedoApi<TState> {
  const capacity = options?.capacity ?? 100;

  const [present, setPresentState] = useState<TState>(initial);
  const pastRef = useRef<UndoRedoCommand<TState>[]>([]);
  const futureRef = useRef<UndoRedoCommand<TState>[]>([]);

  const apply = useCallback(
    (cmd: UndoRedoCommand<TState>) => {
      setPresentState((prev) => {
        const next = cmd.do(prev);
        pastRef.current = [...pastRef.current, cmd].slice(-capacity);
        futureRef.current = [];
        return next;
      });
    },
    [capacity]
  );

  const undo = useCallback(() => {
    const past = pastRef.current;
    if (past.length === 0) return;

    const cmd = past[past.length - 1];
    pastRef.current = past.slice(0, -1);

    setPresentState((prev) => {
      const next = cmd.undo(prev);
      futureRef.current = [cmd, ...futureRef.current];
      return next;
    });
  }, []);

  const redo = useCallback(() => {
    const future = futureRef.current;
    if (future.length === 0) return;

    const cmd = future[0];
    futureRef.current = future.slice(1);

    setPresentState((prev) => {
      const next = cmd.do(prev);
      pastRef.current = [...pastRef.current, cmd].slice(-capacity);
      return next;
    });
  }, [capacity]);

  const setPresent = useCallback((next: TState) => {
    setPresentState(next);
  }, []);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  const history = useMemo(() => {
    const past = pastRef.current;
    return {
      pastCount: past.length,
      futureCount: futureRef.current.length,
      lastLabel: past.length > 0 ? past[past.length - 1].label : undefined,
    };
  }, [present]);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    apply,
    setPresent,
    history,
  };
}
