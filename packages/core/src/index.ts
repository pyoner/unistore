import { compile, get, has, parse, remove, set } from "json-pointer";

export type Key = string | readonly string[];
export type Path = readonly string[];
export type Unsubscribe = () => void;

type Primitive = bigint | boolean | null | number | string | symbol | undefined;
type Builtin = Date | Function | Primitive | RegExp;
type PrevDepth = [never, 0, 1, 2, 3, 4, 5, 6];
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
    : [Pointer];

type ChildTokens<T, Depth extends number> = Exclude<PathTokens<T, Depth>, readonly []>;

export type PathTokens<T, Depth extends number = 5> = Depth extends 0
  ? readonly []
  : T extends Builtin
    ? readonly []
    : T extends readonly (infer Item)[]
      ?
          | readonly []
          | readonly [ArrayIndexToken]
          | readonly [ArrayIndexToken, ...ChildTokens<Item, PrevDepth[Depth]>]
      : T extends object
        ?
            | readonly []
            | {
                [K in StringKeyOf<T>]:
                  | readonly [K]
                  | readonly [K, ...ChildTokens<T[K], PrevDepth[Depth]>];
              }[StringKeyOf<T>]
        : readonly [];

export type PointerString<T, Depth extends number = 5> =
  PathTokens<T, Depth> extends infer Tokens
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

export type PointerKey<T, Depth extends number = 5> =
  | PathTokens<T, Depth>
  | PointerString<T, Depth>;

export type PointerValue<T, K> = K extends string
  ? ValueAtPathTokens<T, ParsePointer<K>>
  : K extends readonly string[]
    ? ValueAtPathTokens<T, K>
    : never;

export type Listener<T = unknown, K extends Key = Key> = (
  key: K,
  value: PointerValue<T, K>,
  state: T | undefined,
) => void;

type AnyListener<T> = (key: Key, value: unknown, state: T | undefined) => void;

export type Store<T = unknown> = {
  get<K extends PointerKey<T>>(key: K): PointerValue<T, K>;
  get(key: Key): unknown;
  has<K extends PointerKey<T>>(key: K): boolean;
  has(key: Key): boolean;
  set<K extends PointerKey<T>>(key: K, value: PointerValue<T, K>): void;
  set(key: Key, value: unknown): void;
  remove<K extends PointerKey<T>>(key: K): void;
  remove(key: Key): void;
  subscribe<K extends PointerKey<T>>(key: K, listener: Listener<T, K>): Unsubscribe;
  subscribe(key: Key, listener: AnyListener<T>): Unsubscribe;
};

type Subscription<T> = {
  key: Key;
  listener: AnyListener<T>;
};

function toPath(key: Key): string[] {
  return Array.isArray(key) ? [...key] : parse(key as string);
}

function toLibKey(key: Key): string | string[] {
  return Array.isArray(key) ? [...key] : (key as string);
}

function toPointer(path: readonly string[]): string {
  return compile([...path]);
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
      has(state as object, [...path])
      ? get(state as object, [...path])
      : undefined;
  }

  function emit(path: readonly string[]): void {
    const visited = new Set<AnyListener<T>>();

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

  function subscribe(key: Key, listener: AnyListener<T>): Unsubscribe {
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
  }

  return {
    get(key: Key) {
      return get(state as object, toLibKey(key));
    },

    has(key: Key) {
      return has(state as object, toLibKey(key));
    },

    set(key: Key, value: unknown) {
      const path = toPath(key);

      set(state as object, toLibKey(key), value);
      emit(path);
    },

    remove(key: Key) {
      const path = toPath(key);

      remove(state as object, toLibKey(key));
      emit(path);
    },

    subscribe: subscribe as Store<T>["subscribe"],
  };
}
