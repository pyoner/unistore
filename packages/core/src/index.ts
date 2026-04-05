import { compile, get, has, parse, remove, set } from "json-pointer";

export type Key = string | string[];
export type Path = string[];
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

function toPath(key: Key): Path {
  return Array.isArray(key) ? [...key] : parse(key);
}

function toPointer(path: Path): string {
  return compile(path);
}

function getAncestorPaths(path: Path): Path[] {
  return [[], ...path.map((_, index) => path.slice(0, index + 1))];
}

export function createStore<T = unknown>(initialState?: T): Store<T> {
  let state = initialState;
  const listeners = new Map<string, Set<Subscription<T>>>();

  function readForEmit(path: Path): unknown {
    return state !== undefined &&
      state !== null &&
      typeof state === "object" &&
      has(state as object, path)
      ? get(state as object, path)
      : undefined;
  }

  function emit(path: Path): void {
    const visited = new Set<Listener<T>>();

    for (const currentPath of getAncestorPaths(path)) {
      const subscriptions = listeners.get(toPointer(currentPath));

      if (!subscriptions) {
        continue;
      }

      const currentValue = readForEmit(currentPath);

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
      return get(state as object, key);
    },

    has(key) {
      return has(state as object, key);
    },

    set(key, value) {
      const path = toPath(key);

      set(state as object, key, value);
      emit(path);
    },

    remove(key) {
      const path = toPath(key);

      remove(state as object, key);
      emit(path);
    },

    subscribe(key, listener) {
      const path = toPath(key);
      const pointer = toPointer(path);
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
