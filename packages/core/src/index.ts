import jsonPointer from "json-pointer";

export type Key = string | readonly string[];
export type Path = readonly string[];
export type Unsubscribe = () => void;
export type Invalidate = () => void;
export type Subscriber<T> = (value: T) => void;
export type Readable<T> = {
  subscribe(run: Subscriber<T>, invalidate?: Invalidate): Unsubscribe;
};

type Primitive = bigint | boolean | null | number | string | symbol | undefined;
type Builtin = Date | Function | Primitive | RegExp;
type ArrayIndexToken = `${number}`;

type StringKeyOf<T> = Extract<keyof T, string>;

type ReplaceAll<S extends string, From extends string, To extends string> = From extends ""
  ? S
  : S extends `${infer Start}${From}${infer End}`
    ? `${ReplaceAll<Start, From, To>}${To}${ReplaceAll<End, From, To>}`
    : S;

type EncodeToken<S extends string> = ReplaceAll<ReplaceAll<S, "~", "~0">, "/", "~1">;
type DecodeToken<S extends string> = ReplaceAll<ReplaceAll<S, "~1", "/">, "~0", "~">;

type JoinPointer<Tokens extends readonly string[]> = Tokens extends readonly [
  infer Head extends string,
  ...infer Tail extends string[],
]
  ? Tail["length"] extends 0
    ? EncodeToken<Head>
    : `${EncodeToken<Head>}/${JoinPointer<Tail>}`
  : never;

type SplitPointer<Pointer extends string> = Pointer extends `${infer Head}/${infer Tail}`
  ? [DecodeToken<Head>, ...SplitPointer<Tail>]
  : Pointer extends ""
    ? []
    : [DecodeToken<Pointer>];

type ParsePointer<Pointer extends string> = Pointer extends ""
  ? []
  : Pointer extends `/${infer Tail}`
    ? SplitPointer<Tail>
    : never;

type ChildTokens<T> = Exclude<PathTokens<T>, readonly []>;

export type PathTokens<T> = T extends Builtin
  ? readonly []
  : T extends readonly (infer Item)[]
    ? readonly [] | readonly [ArrayIndexToken] | readonly [ArrayIndexToken, ...ChildTokens<Item>]
    : T extends object
      ?
          | readonly []
          | {
              [K in StringKeyOf<T>]: readonly [K] | readonly [K, ...ChildTokens<T[K]>];
            }[StringKeyOf<T>]
      : readonly [];

export type PointerString<T> =
  PathTokens<T> extends infer Tokens
    ? Tokens extends readonly string[]
      ? Tokens extends readonly []
        ? ""
        : `/${JoinPointer<Tokens>}`
      : never
    : never;

type ValueAtPathTokens<T, Tokens extends readonly string[]> = Tokens extends readonly []
  ? T
  : Tokens extends readonly [infer Head extends string, ...infer Tail extends string[]]
    ? T extends readonly (infer Item)[]
      ? Head extends ArrayIndexToken
        ? ValueAtPathTokens<Item, Tail>
        : never
      : Head extends keyof T
        ? ValueAtPathTokens<T[Head], Tail>
        : never
    : never;

export type PointerKey<T> = PathTokens<T> | PointerString<T>;

export type PointerValue<T, K> = K extends string
  ? ValueAtPathTokens<T, ParsePointer<K>>
  : K extends readonly string[]
    ? ValueAtPathTokens<T, K>
    : never;

type TypedListener<T, K extends PointerKey<T>> = (
  key: K,
  value: PointerValue<T, K>,
  state: T | undefined,
) => void;

export type Listener<T = unknown> = (key: Key, value: unknown, state: T | undefined) => void;

export type Store<T = unknown> = {
  get<K extends PointerKey<T>>(key: K): PointerValue<T, K>;
  has<K extends PointerKey<T>>(key: K): boolean;
  set<K extends PointerKey<T>>(key: K, value: PointerValue<T, K>): void;
  update<K extends PointerKey<T>>(
    key: K,
    updater: (current: PointerValue<T, K>) => PointerValue<T, K>,
  ): void;
  remove<K extends PointerKey<T>>(key: K): void;
  subscribe<K extends PointerKey<T>>(key: K, listener: TypedListener<T, K>): Unsubscribe;
  select<K extends PointerKey<T>>(key: K): Readable<PointerValue<T, K>>;
};

type Subscription<T> = {
  key: Key;
  listener: Listener<T>;
};

function toPath(key: Key): string[] {
  return Array.isArray(key) ? [...key] : jsonPointer.parse(key as string);
}

function toLibKey(key: Key): string | string[] {
  return Array.isArray(key) ? [...key] : (key as string);
}

function getAncestorPaths(path: readonly string[]): readonly string[][] {
  return [[], ...path.map((_, index) => path.slice(0, index + 1))];
}

export function createStore<T = unknown>(initialState?: T): Store<T> {
  let state = initialState;
  const listeners = new Map<string, Set<Subscription<T>>>();

  function readForEmit(path: readonly string[]): unknown {
    return state !== undefined &&
      state !== null &&
      typeof state === "object" &&
      jsonPointer.has(state as object, [...path])
      ? jsonPointer.get(state as object, [...path])
      : undefined;
  }

  function emit(path: readonly string[]): void {
    const visited = new Set<Listener<T>>();

    for (const currentPath of getAncestorPaths(path)) {
      const subscriptions = listeners.get(jsonPointer.compile([...currentPath]));

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

  const runtimeStore = {
    get(key: Key) {
      return jsonPointer.get(state as object, toLibKey(key));
    },

    has(key: Key) {
      return jsonPointer.has(state as object, toLibKey(key));
    },

    set(key: Key, value: unknown) {
      const path = toPath(key);

      jsonPointer.set(state as object, toLibKey(key), value);
      emit(path);
    },

    update(key: Key, updater: (current: unknown) => unknown) {
      const currentValue = jsonPointer.get(state as object, toLibKey(key));
      const nextValue = updater(currentValue);
      const path = toPath(key);

      jsonPointer.set(state as object, toLibKey(key), nextValue);
      emit(path);
    },

    remove(key: Key) {
      const path = toPath(key);

      jsonPointer.remove(state as object, toLibKey(key));
      emit(path);
    },

    subscribe(key: Key, listener: Listener<T>) {
      const path = toPath(key);
      const pointer = jsonPointer.compile([...path]);
      const subscriptions = listeners.get(pointer) ?? new Set<Subscription<T>>();
      const subscription: Subscription<T> = {
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

    select(key: Key) {
      return {
        subscribe(run: Subscriber<unknown>, invalidate?: Invalidate) {
          run(jsonPointer.get(state as object, toLibKey(key)));

          return runtimeStore.subscribe(key, (_path, value) => {
            invalidate?.();
            run(value);
          });
        },
      };
    },
  };

  return runtimeStore as unknown as Store<T>;
}
