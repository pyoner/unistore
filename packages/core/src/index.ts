export type Key = string | string[];

export type Unsubscribe = () => void;

export type Listener<T = unknown> = (key: Key, value: T | undefined) => void;

export type Store<T = unknown> = {
  get(key: Key): T | undefined;
  has(key: Key): boolean;
  set(key: Key, value: T): void;
  remove(key: Key): void;
  subscribe(key: Key, listener: Listener<T>): Unsubscribe;
};

const KEY_SEPARATOR = "\u0000";

function serializeKey(key: Key): string {
  return Array.isArray(key) ? key.join(KEY_SEPARATOR) : key;
}

export function createStore<T = unknown>(): Store<T> {
  const values = new Map<string, T>();
  const listeners = new Map<string, Set<Listener<T>>>();

  function emit(key: Key, value: T | undefined): void {
    const keyListeners = listeners.get(serializeKey(key));

    if (!keyListeners) {
      return;
    }

    for (const listener of keyListeners) {
      listener(key, value);
    }
  }

  return {
    get(key) {
      return values.get(serializeKey(key));
    },

    has(key) {
      return values.has(serializeKey(key));
    },

    set(key, value) {
      values.set(serializeKey(key), value);
      emit(key, value);
    },

    remove(key) {
      const serializedKey = serializeKey(key);

      if (!values.delete(serializedKey)) {
        return;
      }

      emit(key, undefined);
    },

    subscribe(key, listener) {
      const serializedKey = serializeKey(key);
      const keyListeners = listeners.get(serializedKey) ?? new Set<Listener<T>>();

      keyListeners.add(listener);
      listeners.set(serializedKey, keyListeners);

      return () => {
        keyListeners.delete(listener);

        if (keyListeners.size === 0) {
          listeners.delete(serializedKey);
        }
      };
    },
  };
}
