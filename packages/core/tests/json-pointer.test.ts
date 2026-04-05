import { expect, test } from "vite-plus/test";
import {
  JsonPointerError,
  decodeToken,
  encodeToken,
  getAtPath,
  hasAtPath,
  isValidArrayIndex,
  normalizeKey,
  parsePointer,
  removeAtPath,
  setAtPath,
  stringifyPointer,
} from "../src/json-pointer.ts";

const rfcExample = {
  foo: ["bar", "baz"],
  "": 0,
  "a/b": 1,
  "c%d": 2,
  "e^f": 3,
  "g|h": 4,
  "i\\j": 5,
  'k"l': 6,
  " ": 7,
  "m~n": 8,
};

test("parses and stringifies RFC 6901 pointers", () => {
  expect(parsePointer("")).toEqual([]);
  expect(parsePointer("/foo/0")).toEqual(["foo", "0"]);
  expect(parsePointer("/a~1b")).toEqual(["a/b"]);
  expect(parsePointer("/m~0n")).toEqual(["m~n"]);
  expect(stringifyPointer([])).toBe("");
  expect(stringifyPointer(["foo", "0"])).toBe("/foo/0");
  expect(stringifyPointer(["a/b", "m~n"])).toBe("/a~1b/m~0n");
  expect(stringifyPointer([""])).toBe("/");
  expect(normalizeKey("/foo/0")).toEqual(["foo", "0"]);
  expect(normalizeKey(["foo", "0"])).toEqual(["foo", "0"]);
});

test("round-trips pointers and paths", () => {
  const pointers = ["", "/foo", "/foo/0", "/", "/a~1b", "/m~0n", "/~01"];
  const paths = [[], [""], ["foo", "0"], ["a/b"], ["m~n"], ["~1"]];

  for (const pointer of pointers) {
    expect(stringifyPointer(parsePointer(pointer))).toBe(pointer);
  }

  for (const path of paths) {
    expect(parsePointer(stringifyPointer(path))).toEqual(path);
  }
});

test("encodes and decodes tokens using RFC escapes", () => {
  expect(encodeToken("a/b")).toBe("a~1b");
  expect(encodeToken("m~n")).toBe("m~0n");
  expect(decodeToken("a~1b")).toBe("a/b");
  expect(decodeToken("m~0n")).toBe("m~n");
  expect(decodeToken("~01")).toBe("~1");
});

test("resolves the RFC 6901 example pointers", () => {
  expect(getAtPath(rfcExample, parsePointer(""))).toEqual(rfcExample);
  expect(getAtPath(rfcExample, parsePointer("/foo"))).toEqual(["bar", "baz"]);
  expect(getAtPath(rfcExample, parsePointer("/foo/0"))).toBe("bar");
  expect(getAtPath(rfcExample, parsePointer("/"))).toBe(0);
  expect(getAtPath(rfcExample, parsePointer("/a~1b"))).toBe(1);
  expect(getAtPath(rfcExample, parsePointer("/c%d"))).toBe(2);
  expect(getAtPath(rfcExample, parsePointer("/e^f"))).toBe(3);
  expect(getAtPath(rfcExample, parsePointer("/g|h"))).toBe(4);
  expect(getAtPath(rfcExample, parsePointer("/i\\j"))).toBe(5);
  expect(getAtPath(rfcExample, parsePointer('/k"l'))).toBe(6);
  expect(getAtPath(rfcExample, parsePointer("/ "))).toBe(7);
  expect(getAtPath(rfcExample, parsePointer("/m~0n"))).toBe(8);
});

test("rejects invalid RFC pointer syntax and invalid escapes", () => {
  expect(() => parsePointer("foo")).toThrowError(JsonPointerError);
  expect(() => parsePointer("/~2")).toThrowError(JsonPointerError);
  expect(() => parsePointer("/~")).toThrowError(JsonPointerError);
});

test("enforces RFC array index rules during evaluation", () => {
  expect(isValidArrayIndex("0")).toBe(true);
  expect(isValidArrayIndex("10")).toBe(true);
  expect(isValidArrayIndex("01")).toBe(false);
  expect(isValidArrayIndex("-1")).toBe(false);

  expect(() => getAtPath(rfcExample, parsePointer("/foo/01"))).toThrowError(
    "Invalid array index: 01",
  );
  expect(() => getAtPath(rfcExample, parsePointer("/foo/-"))).toThrowError(
    'Array index "-" does not resolve to an existing value',
  );
});

test("reports unresolved references as missing", () => {
  expect(hasAtPath(rfcExample, parsePointer("/missing"))).toBe(false);
  expect(hasAtPath(rfcExample, parsePointer("/foo/2"))).toBe(false);
  expect(() => getAtPath(rfcExample, parsePointer("/missing"))).toThrowError(JsonPointerError);
});

test("keeps mutation helpers as application-specific extensions", () => {
  expect(setAtPath(undefined, ["todos", "0", "title"], "Draft")).toEqual({
    todos: [{ title: "Draft" }],
  });
  expect(setAtPath({ todos: ["draft"] }, ["todos", "-"], "ship")).toEqual({
    todos: ["draft", "ship"],
  });
  expect(removeAtPath({ todos: ["draft", "ship"] }, ["todos", "0"])).toEqual({
    todos: ["ship"],
  });
});
