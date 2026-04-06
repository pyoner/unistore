import { createStore, type PointerString, type PointerValue } from "./index.ts";

type Assert<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

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

export type _PointerStrings = Assert<
  Equal<Extract<PointerString<State>, "/user/name">, "/user/name">
>;

export type _ArrayPointerStrings = Assert<
  Equal<Extract<PointerString<State>, `/todos/${number}/title`>, `/todos/${number}/title`>
>;

export type _PointerValueFromString = Assert<
  Equal<PointerValue<State, "/user/profile/age">, number>
>;

export type _ArrayPointerValueFromString = Assert<
  Equal<PointerValue<State, `/todos/${number}/title`>, string>
>;

export type _PointerValueFromTokens = Assert<
  Equal<PointerValue<State, readonly ["todos", `${number}`, "title"]>, string>
>;

declare function expectType<T>(value: T): void;

const store = createStore<State>();

const userName = store.get("/user/name");
const todoTitle = store.get(["todos", "0", "title"] as const);

store.set("/user/name", "Ada");
store.set(["user", "profile", "age"] as const, 36);
store.set(["todos", "0", "done"] as const, true);

store.subscribe("/user/name", (key, value) => {
  expectType<"/user/name">(key);
  expectType<string>(value);
});

store.subscribe(["todos", "0", "title"] as const, (key, value) => {
  expectType<readonly ["todos", "0", "title"]>(key);
  expectType<string>(value);
});

expectType<string>(userName);
expectType<string>(todoTitle);

// @ts-expect-error invalid token path for State
store.get(["/t"] as const);

// @ts-expect-error invalid pointer string for State
store.get("/missing");
