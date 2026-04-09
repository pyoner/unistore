import { assertType, expectTypeOf } from "vite-plus/test";
import { createStore, type PointerString, type PointerValue, type Writable } from "./index.ts";

type State = {
  user: {
    name: string;
    profile: {
      age: number;
    };
  };
  todos: Array<{
    title: string;
    done: boolean;
  }>;
};

expectTypeOf<Extract<PointerString<State>, "/user/name">>().toEqualTypeOf<"/user/name">();

expectTypeOf<
  Extract<PointerString<State>, `/todos/${number}/title`>
>().toEqualTypeOf<`/todos/${number}/title`>();

expectTypeOf<PointerValue<State, "/user/profile/age">>().toEqualTypeOf<number>();

expectTypeOf<PointerValue<State, `/todos/${number}/title`>>().toEqualTypeOf<string>();

expectTypeOf<
  PointerValue<State, readonly ["todos", `${number}`, "title"]>
>().toEqualTypeOf<string>();

const store = createStore<State>();

const userName = store.get("/user/name");
const todoTitle = store.get(["todos", "0", "title"] as const);
const selectedName = store.select("/user/name");
const boundName = store.bind("/user/name");
const boundDone = store.bind(["todos", "0", "done"] as const);

store.set("/user/name", "Ada");
store.set(["user", "profile", "age"] as const, 36);
store.set(["todos", "0", "done"] as const, true);
store.update("/user/name", (name) => name.toUpperCase());
store.update(["todos", "0", "done"] as const, (done) => !done);
boundName.set("Grace");
boundName.update((name) => name.toUpperCase());
boundDone.set(true);
boundDone.update((done) => !done);

assertType<string>(userName);
assertType<string>(todoTitle);
expectTypeOf(boundName).toEqualTypeOf<Writable<string>>();
expectTypeOf(boundDone).toEqualTypeOf<Writable<boolean>>();
selectedName.subscribe((value) => {
  assertType<string>(value);
});
boundName.subscribe((value) => {
  assertType<string>(value);
});

// @ts-expect-error invalid token path for State
store.get(["/t"] as const);

// @ts-expect-error invalid pointer string for State
store.get("/missing");

// @ts-expect-error invalid pointer string for State
store.bind("/missing");

// @ts-expect-error updater must return matching path value type
store.update("/user/name", () => 42);

// @ts-expect-error set value must match the bound path value type
store.bind("/user/profile/age").set("36");

// @ts-expect-error updater must return the bound path value type
store.bind("/user/profile/age").update(() => "36");

// @ts-expect-error subscribe is internal-only
store.subscribe("/user/name", () => {});
