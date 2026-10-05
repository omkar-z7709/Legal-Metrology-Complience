"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

type StoreState = { isOpen: boolean };
type Listener = (state: StoreState) => void;

let state: StoreState = { isOpen: false };
const listeners = new Set<Listener>();

function get() {
  return state;
}

function set(newStateOrUpdater: StoreState | ((prev: StoreState) => StoreState)) {
  const nextState =
    typeof newStateOrUpdater === "function"
      ? newStateOrUpdater(state)
      : newStateOrUpdater;

  if (nextState.isOpen === state.isOpen) {
    return;
  }

  state = nextState;
  listeners.forEach((listener) => listener(state));
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSidebarStore() {
  const [localState, setLocalState] = useState(get());

  useEffect(() => {
    return subscribe(setLocalState);
  }, []);

  const setIsOpen = useCallback((isOpen: boolean) => set({ isOpen }), []);
  const toggle = useCallback(() => set((prev) => ({ isOpen: !prev.isOpen })), []);

  return useMemo(
    () => ({ isOpen: localState.isOpen, setIsOpen, toggle }),
    [localState.isOpen, setIsOpen, toggle]
  );
}
