import {
  getAtPath,
  hasAtPath,
  normalizeKey,
  removeAtPath,
  setAtPath,
  stringifyPointer,
  type Key,
  type Path,
} from "./json-pointer.ts";

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
  return [[], ...path.map((_, index) => path.slice(0, index + 1))];
}

export function createStore<T = unknown>(initialState?: T): Store<T> {
  let state = initialState;
  const listeners = new Map<string, Set<Subscription<T>>>();

  function toPath(key: Key): Path {
    return normalizeKey(key);
  }

  function emit(path: Path): void {
    const visited = new Set<Listener<T>>();

    for (const currentPath of getAncestorPaths(path)) {
      const subscriptions = listeners.get(stringifyPointer(currentPath));

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
      return getAtPath(state, toPath(key));
    },

    has(key) {
      return hasAtPath(state, toPath(key));
    },

    set(key, value) {
      const path = toPath(key);

      state = setAtPath(state, path, value);
      emit(path);
    },

    remove(key) {
      const path = toPath(key);

      if (!hasAtPath(state, path)) {
        return;
      }

      state = removeAtPath(state, path);
      emit(path);
    },

    subscribe(key, listener) {
      const path = toPath(key);
      const pointer = stringifyPointer(path);
      const subscriptions = listeners.get(pointer) ?? new Set<Subscription<T>>();
      const subscription = {
        key: Array.isArray(key) ? [...key] : key,
        listener,
      };

      subscriptions.add(subscription);
      listeners.set(pointer, subscriptions);

      return () => {
        subscriptions.delete(subscription);

        if (subscriptions.size === 0) {
          listeners.delete(pointer);
        }
      };
    },
  };
}
