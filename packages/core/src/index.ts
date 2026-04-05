import {
  getAtPath,
  hasAtPath,
  normalizeKey,
  pathToKey,
  removeAtPath,
  serializePath,
  setAtPath,
  type Key,
  type Path,
} from "./json-pointer.ts";

export type { Key, Path } from "./json-pointer.ts";

export type Unsubscribe = () => void;

export type Listener<T = unknown> = (key: Key, value: unknown, state: T | undefined) => void;

export type Store<T = unknown> = {
  get(key: Key): unknown;
  has(key: Key): boolean;
  set(key: Key, value: unknown): void;
  remove(key: Key): void;
  subscribe(key: Key, listener: Listener<T>): Unsubscribe;
};

type Subscription<T> = {
  key: Key;
  listener: Listener<T>;
};

function getAncestorPaths(path: Path): Path[] {
  return path.map((_, index) => path.slice(0, index + 1));
}

export function createStore<T = unknown>(initialState?: T): Store<T> {
  let state = initialState;
  const listeners = new Map<string, Set<Subscription<T>>>();

  function emit(path: Path): void {
    const visited = new Set<Listener<T>>();

    for (const currentPath of getAncestorPaths(path)) {
      const subscriptions = listeners.get(serializePath(currentPath));

      if (!subscriptions) {
        continue;
      }

      const currentValue = getAtPath(state, currentPath);

      for (const subscription of subscriptions) {
        if (visited.has(subscription.listener)) {
          continue;
        }

        visited.add(subscription.listener);
        subscription.listener(subscription.key, currentValue, state);
      }
    }
  }

  return {
    get(key) {
      return getAtPath(state, normalizeKey(key));
    },

    has(key) {
      return hasAtPath(state, normalizeKey(key));
    },

    set(key, value) {
      const path = normalizeKey(key);

      state = setAtPath(state, path, value);
      emit(path);
    },

    remove(key) {
      const path = normalizeKey(key);

      if (!hasAtPath(state, path)) {
        return;
      }

      state = removeAtPath(state, path);
      emit(path);
    },

    subscribe(key, listener) {
      const path = normalizeKey(key);
      const serializedPath = serializePath(path);
      const subscriptions = listeners.get(serializedPath) ?? new Set<Subscription<T>>();
      const subscription = {
        key: pathToKey(path),
        listener,
      };

      subscriptions.add(subscription);
      listeners.set(serializedPath, subscriptions);

      return () => {
        subscriptions.delete(subscription);

        if (subscriptions.size === 0) {
          listeners.delete(serializedPath);
        }
      };
    },
  };
}
