import { expect, test, vi } from "vite-plus/test";
import { createStore } from "../src/index.ts";

type TestState = {
  user: {
    name: string;
    age: number;
  };
  todos: Array<{
    title: string;
    done: boolean;
  }>;
};

const initialState: TestState = {
  user: {
    name: "Ada",
    age: 36,
  },
  todos: [
    { title: "Draft", done: false },
    { title: "Ship", done: false },
    { title: "Celebrate", done: true },
  ],
};

function createInitialState(): TestState {
  return structuredClone(initialState);
}

test("reads nested values using RFC pointer strings", () => {
  const store = createStore(createInitialState());

  expect(store.has("/user")).toBe(true);
  expect(store.get("/user/name")).toBe("Ada");
});

test("updates nested object values by RFC pointer string", () => {
  const initial = createInitialState();
  const store = createStore(initial);

  store.set("/user/name", "Grace");

  expect(store.get("/user")).toBe(initial.user);
  expect(store.get("/user")).toEqual({ name: "Grace", age: 36 });
  expect(store.get("/user/name")).toBe("Grace");
});

test("updates nested array values by raw path segments", () => {
  const initial = createInitialState();
  const store = createStore(initial);

  store.set(["todos", "0", "title"], "Ship");

  expect(store.get(["todos", "0", "title"])).toBe("Ship");
  expect(store.get("/todos")).toBe(initial.todos);
  expect(store.get("/todos")).toEqual([
    { title: "Ship", done: false },
    { title: "Ship", done: false },
    { title: "Celebrate", done: true },
  ]);
});

test("updates values with updater callbacks", () => {
  const store = createStore(createInitialState());

  store.update("/user/name", (name) => `${name} Lovelace`);
  store.update(["todos", "0", "done"], (done) => !done);

  expect(store.get("/user/name")).toBe("Ada Lovelace");
  expect(store.get(["todos", "0", "done"])).toBe(true);
});

test("removes nested object values by RFC pointer string", () => {
  const initial = createInitialState();
  const store = createStore(initial);

  store.remove("/user/age");

  expect(store.get("/user")).toBe(initial.user);
  expect(store.has("/user/age")).toBe(false);
  expect(store.get("/user")).toEqual({ name: "Ada" });
});

test("removes array items by raw path segments", () => {
  const initial = createInitialState();
  const store = createStore(initial);

  store.remove(["todos", "1"]);

  expect(store.get("/todos")).toBe(initial.todos);
  expect(store.get("/todos")).toEqual([
    { title: "Draft", done: false },
    { title: "Celebrate", done: true },
  ]);
  expect(store.has("/todos/2")).toBe(false);
});

test("notifies exact, ancestor, and root subscribers with current values", () => {
  const store = createStore(createInitialState());
  const rootListener = vi.fn();
  const userListener = vi.fn();
  const nameListener = vi.fn();

  store.subscribe("", rootListener);
  store.subscribe("/user", userListener);
  store.subscribe(["user", "name"], nameListener);

  store.set("/user/name", "Grace");

  expect(rootListener).toHaveBeenCalledWith(
    "",
    {
      user: { name: "Grace", age: 36 },
      todos: [
        { title: "Draft", done: false },
        { title: "Ship", done: false },
        { title: "Celebrate", done: true },
      ],
    },
    {
      user: { name: "Grace", age: 36 },
      todos: [
        { title: "Draft", done: false },
        { title: "Ship", done: false },
        { title: "Celebrate", done: true },
      ],
    },
  );
  expect(userListener).toHaveBeenCalledWith(
    "/user",
    { name: "Grace", age: 36 },
    {
      user: { name: "Grace", age: 36 },
      todos: [
        { title: "Draft", done: false },
        { title: "Ship", done: false },
        { title: "Celebrate", done: true },
      ],
    },
  );
  expect(nameListener).toHaveBeenCalledWith(["user", "name"], "Grace", {
    user: { name: "Grace", age: 36 },
    todos: [
      { title: "Draft", done: false },
      { title: "Ship", done: false },
      { title: "Celebrate", done: true },
    ],
  });
});

test("stops notifying after unsubscribe", () => {
  const store = createStore(createInitialState());
  const listener = vi.fn();

  const unsubscribe = store.subscribe("/user/name", listener);

  unsubscribe();
  store.set("/user/name", "Grace");

  expect(listener).not.toHaveBeenCalled();
});

test("select returns readable-compatible keyed subscription", () => {
  const store = createStore(createInitialState());
  const run = vi.fn();
  const invalidate = vi.fn();

  const unsubscribe = store.select("/user/name").subscribe(run, invalidate);

  expect(run).toHaveBeenNthCalledWith(1, "Ada");

  store.set("/user/name", "Grace");

  expect(invalidate).toHaveBeenCalledTimes(1);
  expect(run).toHaveBeenNthCalledWith(2, "Grace");

  unsubscribe();
  store.set("/user/name", "Lin");

  expect(run).toHaveBeenCalledTimes(2);
});

test("throws library errors for invalid pointer strings", () => {
  const store = createStore(createInitialState()) as any;

  expect(() => store.get("user" as any)).toThrow("Invalid JSON pointer: user");
  expect(() => store.set("user" as any, "Grace")).toThrow("Invalid JSON pointer: user");
});

test("matches library root-operation errors", () => {
  const store = createStore(createInitialState());

  expect(() =>
    store.set("", {
      user: { name: "Grace", age: 36 },
      todos: [
        { title: "Draft", done: false },
        { title: "Ship", done: false },
        { title: "Celebrate", done: true },
      ],
    }),
  ).toThrow("Can not set the root object");
  expect(() => store.remove("")).toThrow('Invalid JSON pointer for remove: ""');
});

test("does not create a missing root container", () => {
  const store = createStore<any>();

  expect(() => store.set("/user/name", "Ada")).toThrow();
});
