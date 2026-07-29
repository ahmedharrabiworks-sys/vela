import { useSyncExternalStore } from "react";

// Module-level singleton — no React context, no provider needed.
// Any component can call setBottomSheetOpen(true/false) to signal
// that a mobile bottom-sheet is open. VelaAssistant hides its bubble
// while this is true so it doesn't overlap panel content.

let _open = false;
const _listeners = new Set<() => void>();

function _subscribe(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _getSnapshot(): boolean { return _open; }
function _getServerSnapshot(): boolean { return false; }

export function setBottomSheetOpen(open: boolean): void {
  if (_open !== open) {
    _open = open;
    _listeners.forEach((fn) => fn());
  }
}

export function useBottomSheetOpen(): boolean {
  return useSyncExternalStore(_subscribe, _getSnapshot, _getServerSnapshot);
}
