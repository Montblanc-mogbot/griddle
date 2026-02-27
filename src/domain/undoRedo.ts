import { useCallback, useMemo, useReducer } from 'react';

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

type Action<TState> =
  | { type: 'apply'; cmd: UndoRedoCommand<TState>; capacity: number }
  | { type: 'undo' }
  | { type: 'redo'; capacity: number }
  | { type: 'setPresent'; next: TState };

function reducer<TState>(state: UndoRedoSnapshot<TState>, action: Action<TState>): UndoRedoSnapshot<TState> {
  switch (action.type) {
    case 'apply': {
      const next = action.cmd.do(state.present);
      const past = [...state.past, action.cmd].slice(-action.capacity);
      return { past, present: next, future: [] };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const cmd = state.past[state.past.length - 1]!;
      const past = state.past.slice(0, -1);
      const present = cmd.undo(state.present);
      const future = [cmd, ...state.future];
      return { past, present, future };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const cmd = state.future[0]!;
      const future = state.future.slice(1);
      const present = cmd.do(state.present);
      const past = [...state.past, cmd].slice(-action.capacity);
      return { past, present, future };
    }
    case 'setPresent': {
      return { ...state, present: action.next };
    }
  }
}

export function useUndoRedo<TState>(initial: TState, options?: UndoRedoOptions): UndoRedoApi<TState> {
  const capacity = options?.capacity ?? 100;

  const [snapshot, dispatch] = useReducer(reducer<TState>, {
    past: [],
    present: initial,
    future: [],
  });

  const apply = useCallback(
    (cmd: UndoRedoCommand<TState>) => {
      dispatch({ type: 'apply', cmd, capacity });
    },
    [capacity],
  );

  const undo = useCallback(() => {
    dispatch({ type: 'undo' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'redo', capacity });
  }, [capacity]);

  const setPresent = useCallback((next: TState) => {
    dispatch({ type: 'setPresent', next });
  }, []);

  const canUndo = snapshot.past.length > 0;
  const canRedo = snapshot.future.length > 0;

  const history = useMemo(
    () => ({
      pastCount: snapshot.past.length,
      futureCount: snapshot.future.length,
      lastLabel: snapshot.past.length > 0 ? snapshot.past[snapshot.past.length - 1]?.label : undefined,
    }),
    [snapshot.past, snapshot.future],
  );

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
