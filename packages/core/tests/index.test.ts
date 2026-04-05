import { expect, test, vi } from "vite-plus/test";
import { createStore } from "../src/index.ts";

test("stores and reads values", () => {
  const store = createStore<number>();

  store.set("count", 1);

  expect(store.has("count")).toBe(true);
  expect(store.get("count")).toBe(1);
});

test("removes values", () => {
  const store = createStore<number>();

  store.set("count", 1);
  store.remove("count");

  expect(store.has("count")).toBe(false);
  expect(store.get("count")).toBeUndefined();
});

test("notifies subscribers on set and remove", () => {
  const store = createStore<number>();
  const listener = vi.fn();

  store.subscribe("count", listener);
  store.set("count", 1);
  store.remove("count");

  expect(listener).toHaveBeenNthCalledWith(1, "count", 1);
  expect(listener).toHaveBeenNthCalledWith(2, "count", undefined);
});

test("stops notifying after unsubscribe", () => {
  const store = createStore<number>();
  const listener = vi.fn();

  const unsubscribe = store.subscribe("count", listener);

  unsubscribe();
  store.set("count", 1);

  expect(listener).not.toHaveBeenCalled();
});

test("treats array keys as stable composite keys", () => {
  const store = createStore<string>();
  const listener = vi.fn();
  const key = ["user", "name"];

  store.subscribe(key, listener);
  store.set(["user", "name"], "Ada");

  expect(store.get(key)).toBe("Ada");
  expect(store.has(["user", "name"])).toBe(true);
  expect(listener).toHaveBeenCalledWith(["user", "name"], "Ada");
});
