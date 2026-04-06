import { expect, test, vi } from "vite-plus/test";
import { createStore, type Store } from "../src/index.ts";

test("reads nested values using RFC pointer strings", () => {
  const store = createStore({
    user: {
      name: "Ada",
      age: 36,
    },
  });

  expect(store.has("/user")).toBe(true);
  expect(store.get("/user/name")).toBe("Ada");
});

test("updates nested object values by RFC pointer string", () => {
  const initial = {
    user: {
      name: "Ada",
    },
  };
  const store = createStore(initial);

  store.set("/user/name", "Grace");

  expect(store.get("/user")).toBe(initial.user);
  expect(store.get("/user")).toEqual({ name: "Grace" });
  expect(store.get("/user/name")).toBe("Grace");
});

test("updates nested array values by raw path segments", () => {
  const initial = {
    todos: [{ title: "Draft" }],
  };
  const store = createStore(initial);

  store.set(["todos", "0", "title"], "Ship");

  expect(store.get(["todos", "0", "title"])).toBe("Ship");
  expect(store.get("/todos")).toBe(initial.todos);
  expect(store.get("/todos")).toEqual([{ title: "Ship" }]);
});

test("removes nested object values by RFC pointer string", () => {
  const initial = {
    user: {
      name: "Ada",
      age: 36,
    },
  };
  const store = createStore(initial);

  store.remove("/user/age");

  expect(store.get("/user")).toBe(initial.user);
  expect(store.has("/user/age")).toBe(false);
  expect(store.get("/user")).toEqual({ name: "Ada" });
});

test("removes array items by raw path segments", () => {
  const initial = {
    todos: ["draft", "ship", "celebrate"],
  };
  const store = createStore(initial);

  store.remove(["todos", "1"]);

  expect(store.get("/todos")).toBe(initial.todos);
  expect(store.get("/todos")).toEqual(["draft", "celebrate"]);
  expect(store.has("/todos/2")).toBe(false);
});

test("notifies exact, ancestor, and root subscribers with current values", () => {
  const store = createStore({
    user: {
      name: "Ada",
      age: 36,
    },
  });
  const rootListener = vi.fn();
  const userListener = vi.fn();
  const nameListener = vi.fn();

  store.subscribe("", rootListener);
  store.subscribe("/user", userListener);
  store.subscribe(["user", "name"], nameListener);

  store.set("/user/name", "Grace");

  expect(rootListener).toHaveBeenCalledWith(
    "",
    { user: { name: "Grace", age: 36 } },
    {
      user: { name: "Grace", age: 36 },
    },
  );
  expect(userListener).toHaveBeenCalledWith(
    "/user",
    { name: "Grace", age: 36 },
    {
      user: { name: "Grace", age: 36 },
    },
  );
  expect(nameListener).toHaveBeenCalledWith(["user", "name"], "Grace", {
    user: { name: "Grace", age: 36 },
  });
});

test("stops notifying after unsubscribe", () => {
  const store = createStore({
    user: {
      name: "Ada",
    },
  });
  const listener = vi.fn();

  const unsubscribe = store.subscribe("/user/name", listener);

  unsubscribe();
  store.set("/user/name", "Grace");

  expect(listener).not.toHaveBeenCalled();
});

test("throws library errors for invalid pointer strings", () => {
  const store = createStore({ user: { name: "Ada" } }) as Store<any>;

  expect(() => store.get("user" as any)).toThrowError("Invalid JSON pointer: user");
  expect(() => store.set("user" as any, "Grace")).toThrowError("Invalid JSON pointer: user");
});

test("matches library root-operation errors", () => {
  const store = createStore({ user: { name: "Ada" } });

  expect(() => store.set("", { user: { name: "Grace" } })).toThrowError(
    "Can not set the root object",
  );
  expect(() => store.remove("")).toThrowError('Invalid JSON pointer for remove: ""');
});

test("does not create a missing root container", () => {
  const store = createStore<any>();

  expect(() => store.set("/user/name", "Ada")).toThrow();
});
