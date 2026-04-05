import { expect, test, vi } from "vite-plus/test";
import { JsonPointerError } from "../src/json-pointer.ts";
import { createStore } from "../src/index.ts";

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
  const store = createStore({
    user: {
      name: "Ada",
    },
  });

  store.set("/user/name", "Grace");

  expect(store.get("/user")).toEqual({ name: "Grace" });
  expect(store.get("/user/name")).toBe("Grace");
});

test("updates nested array values by raw path segments", () => {
  const store = createStore({
    todos: [{ title: "Draft" }],
  });

  store.set(["todos", "0", "title"], "Ship");

  expect(store.get(["todos", "0", "title"])).toBe("Ship");
  expect(store.get("/todos")).toEqual([{ title: "Ship" }]);
});

test("removes nested object values by RFC pointer string", () => {
  const store = createStore({
    user: {
      name: "Ada",
      age: 36,
    },
  });

  store.remove("/user/age");

  expect(store.has("/user/age")).toBe(false);
  expect(store.get("/user")).toEqual({ name: "Ada" });
});

test("removes array items by raw path segments", () => {
  const store = createStore({
    todos: ["draft", "ship", "celebrate"],
  });

  store.remove(["todos", "1"]);

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

test("rejects invalid pointer strings", () => {
  const store = createStore({ user: { name: "Ada" } });

  expect(() => store.get("user")).toThrowError(JsonPointerError);
  expect(() => store.set("user", "Grace")).toThrowError(JsonPointerError);
});
