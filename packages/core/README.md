# core

Core store library with JSON Pointer paths and typed key inference.

## What it is

`core` provides `createStore<T>()`, a small mutable store API backed by `json-pointer`.

- Keys support both JSON Pointer strings (for example `"/user/name"`) and token arrays (for example `["user", "name"]`).
- The TypeScript API infers valid keys and value types from `T`.
- Subscriptions are path-based and include ancestor notifications.

## API

```ts
type Store<T> = {
  get<K extends PointerKey<T>>(key: K): PointerValue<T, K>;
  has<K extends PointerKey<T>>(key: K): boolean;
  set<K extends PointerKey<T>>(key: K, value: PointerValue<T, K>): void;
  update<K extends PointerKey<T>>(
    key: K,
    updater: (current: PointerValue<T, K>) => PointerValue<T, K>,
  ): void;
  remove<K extends PointerKey<T>>(key: K): void;
  subscribe<K extends PointerKey<T>>(
    key: K,
    listener: (key: K, value: PointerValue<T, K>, state: T | undefined) => void,
  ): () => void;
  select<K extends PointerKey<T>>(
    key: K,
  ): {
    subscribe(run: (value: PointerValue<T, K>) => void, invalidate?: () => void): () => void;
  };
};

declare function createStore<T>(initialState?: T): Store<T>;
```

## Key formats

- `string`: JSON Pointer path (`"/user/name"`, `"/todos/0/title"`, `""`)
- `string[]`: token path (`["user", "name"]`, `["todos", "0", "title"]`, `[]`)

## Behavior

- **Mutable updates**: `set` and `remove` mutate the internal state in place through `json-pointer`.
- **Updater support**: `update(key, updater)` reads the current value at `key` and writes back the updater result.
- **Pointer semantics**: invalid pointers throw the underlying `json-pointer` errors.
- **Root operations**: behavior matches `json-pointer` (for example `set("")` and `remove("")` throw).
- **Subscription model**: subscribing to a key listens to that key path; updates emit to exact and ancestor path subscribers.
- **Svelte readable compatibility**: `select(key)` returns a readable-like object with `subscribe(run, invalidate?)`.
- **Array index paths are positional**: subscribing to `"/todos/0"` watches index `0`, not a stable item identity.

## Example

```ts
import { createStore } from "core";

type State = {
  user: { name: string; age: number };
  todos: Array<{ id: string; title: string; done: boolean }>;
};

const store = createStore<State>({
  user: { name: "Ada", age: 36 },
  todos: [{ id: "t1", title: "Draft", done: false }],
});

store.set("/user/name", "Grace");
store.set(["todos", "0", "done"], true);
store.update("/user/name", (name) => name.toUpperCase());

const userName = store.get("/user/name");
const firstDone = store.get(["todos", "0", "done"]);

const selectedName = store.select("/user/name");
const unsubscribeReadable = selectedName.subscribe((value) => {
  console.log("name", value);
});

const unsubscribe = store.subscribe("/user", (key, value, state) => {
  console.log(key, value, state);
});

store.remove("/todos/0");
unsubscribe();
unsubscribeReadable();
```

## Gotchas

- Use stable IDs for item identity (`todo.id`), not index paths, when lists can reorder.
- Index subscriptions (`"/todos/0"`) follow the index after removals/reordering.

## Development

- Install dependencies:

```bash
vp install
```

- Run unit tests:

```bash
vp test
```

- Build the library:

```bash
vp pack
```
