export type Key = string | string[];

export type Path = string[];

const ARRAY_INDEX_PATTERN = /^(0|[1-9]\d*)$/;

export class JsonPointerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JsonPointerError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cloneContainer(
  value: unknown,
  nextSegment: string | undefined,
): unknown[] | Record<string, unknown> {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (isRecord(value)) {
    return { ...value };
  }

  return isValidArrayIndex(nextSegment ?? "") ? [] : {};
}

export function encodeToken(token: string): string {
  return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

export function decodeToken(token: string): string {
  for (let index = 0; index < token.length; index += 1) {
    if (token[index] !== "~") {
      continue;
    }

    const next = token[index + 1];

    if (next !== "0" && next !== "1") {
      throw new JsonPointerError(`Invalid escape sequence in token: ${token}`);
    }

    index += 1;
  }

  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

export function parsePointer(pointer: string): Path {
  if (pointer === "") {
    return [];
  }

  if (!pointer.startsWith("/")) {
    throw new JsonPointerError(`Invalid JSON pointer: ${pointer}`);
  }

  return pointer.slice(1).split("/").map(decodeToken);
}

export function stringifyPointer(path: Path): string {
  if (path.length === 0) {
    return "";
  }

  return `/${path.map(encodeToken).join("/")}`;
}

export function normalizeKey(key: Key): Path {
  return Array.isArray(key) ? [...key] : parsePointer(key);
}

export function isValidArrayIndex(token: string): boolean {
  return ARRAY_INDEX_PATTERN.test(token);
}

export function getAtPath(value: unknown, path: Path): unknown {
  if (path.length === 0) {
    return value;
  }

  let current = value;

  for (const segment of path) {
    if (Array.isArray(current)) {
      if (segment === "-") {
        throw new JsonPointerError('Array index "-" does not resolve to an existing value');
      }

      if (!isValidArrayIndex(segment)) {
        throw new JsonPointerError(`Invalid array index: ${segment}`);
      }

      const index = Number(segment);

      if (index >= current.length) {
        throw new JsonPointerError(`Path does not exist: ${stringifyPointer(path)}`);
      }

      current = current[index];
      continue;
    }

    if (!isRecord(current) || !(segment in current)) {
      throw new JsonPointerError(`Path does not exist: ${stringifyPointer(path)}`);
    }

    current = current[segment];
  }

  return current;
}

export function hasAtPath(value: unknown, path: Path): boolean {
  try {
    getAtPath(value, path);
    return true;
  } catch (error) {
    if (error instanceof JsonPointerError) {
      return false;
    }

    throw error;
  }
}

export function setAtPath<T>(value: T | undefined, path: Path, nextValue: unknown): T {
  if (path.length === 0) {
    return nextValue as T;
  }

  const root = cloneContainer(value, path[0]);
  let current: unknown = root;

  for (const [index, segment] of path.entries()) {
    const isLast = index === path.length - 1;

    if (Array.isArray(current)) {
      const isAppend = segment === "-";
      const arrayIndex = isAppend ? current.length : Number(segment);

      if (!isAppend && !isValidArrayIndex(segment)) {
        throw new JsonPointerError(`Invalid array index: ${segment}`);
      }

      if (isLast) {
        if (isAppend) {
          current.push(nextValue);
        } else {
          current[arrayIndex] = nextValue;
        }

        break;
      }

      const child = cloneContainer(current[arrayIndex], path[index + 1]);

      if (isAppend) {
        current.push(child);
      } else {
        current[arrayIndex] = child;
      }

      current = child;
      continue;
    }

    const record = current as Record<string, unknown>;

    if (isLast) {
      record[segment] = nextValue;
      break;
    }

    const child = cloneContainer(record[segment], path[index + 1]);
    record[segment] = child;
    current = child;
  }

  return root as T;
}

export function removeAtPath<T>(value: T | undefined, path: Path): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (path.length === 0) {
    return undefined;
  }

  if (!hasAtPath(value, path)) {
    return value;
  }

  const root = cloneContainer(value, path[0]);
  let current: unknown = root;

  for (const [index, segment] of path.entries()) {
    const isLast = index === path.length - 1;

    if (Array.isArray(current)) {
      if (!isValidArrayIndex(segment)) {
        return value;
      }

      const arrayIndex = Number(segment);

      if (arrayIndex >= current.length) {
        return value;
      }

      if (isLast) {
        current.splice(arrayIndex, 1);
        break;
      }

      const child = cloneContainer(current[arrayIndex], path[index + 1]);
      current[arrayIndex] = child;
      current = child;
      continue;
    }

    const record = current as Record<string, unknown>;

    if (isLast) {
      delete record[segment];
      break;
    }

    const child = cloneContainer(record[segment], path[index + 1]);
    record[segment] = child;
    current = child;
  }

  return root as T;
}
