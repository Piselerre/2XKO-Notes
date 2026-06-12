import { useRef, useCallback, useState } from 'react';

const MAX_HISTORY = 80;

export function useEditorHistory(initial: string) {
  const undoStack = useRef<string[]>([initial]);
  const redoStack = useRef<string[]>([]);
  const skipPush = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(undoStack.current.length > 1);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const reset = useCallback((value: string) => {
    undoStack.current = [value];
    redoStack.current = [];
    syncFlags();
  }, [syncFlags]);

  const pushImmediate = useCallback((value: string) => {
    if (skipPush.current) return;
    const stack = undoStack.current;
    if (stack[stack.length - 1] === value) return;
    stack.push(value);
    if (stack.length > MAX_HISTORY) stack.shift();
    redoStack.current = [];
    syncFlags();
  }, [syncFlags]);

  const pushDebounced = useCallback((value: string) => {
    if (skipPush.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => pushImmediate(value), 450);
  }, [pushImmediate]);

  const undo = useCallback((): string | null => {
    const stack = undoStack.current;
    if (stack.length <= 1) return null;
    const current = stack.pop()!;
    redoStack.current.push(current);
    syncFlags();
    return stack[stack.length - 1];
  }, [syncFlags]);

  const redo = useCallback((): string | null => {
    const redo = redoStack.current;
    if (redo.length === 0) return null;
    const next = redo.pop()!;
    undoStack.current.push(next);
    syncFlags();
    return next;
  }, [syncFlags]);

  const withoutRecording = useCallback((fn: () => void) => {
    skipPush.current = true;
    fn();
    skipPush.current = false;
  }, []);

  return { reset, pushImmediate, pushDebounced, undo, redo, withoutRecording, canUndo, canRedo };
}
