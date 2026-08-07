import { useSyncExternalStore } from "react";

// Module-level singleton — same pub/sub pattern as useBottomSheetState.ts

let _open = false;
const _listeners = new Set<() => void>();

function _subscribe(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _getSnapshot(): boolean { return _open; }
function _getServerSnapshot(): boolean { return false; }

export function openTrialModal(): void {
  if (!_open) { _open = true; _listeners.forEach((fn) => fn()); }
}

export function closeTrialModal(): void {
  if (_open) { _open = false; _listeners.forEach((fn) => fn()); }
}

export function useTrialModal(): { isOpen: boolean; open: () => void; close: () => void } {
  const isOpen = useSyncExternalStore(_subscribe, _getSnapshot, _getServerSnapshot);
  return { isOpen, open: openTrialModal, close: closeTrialModal };
}
