export type Key = string | string[];

export type Path = string[];

const KEY_SEPARATOR = "\u0000";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isArrayIndex(segment: string): boolean {
  return /^\d+$/.test(segment);
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

  return isArrayIndex(nextSegment ?? "") ? [] : {};
}

export function normalizeKey(key: Key): Path {
  return Array.isArray(key) ? [...key] : [key];
}

export function serializePath(path: Path): string {
  return path.join(KEY_SEPARATOR);
}

export function pathToKey(path: Path): Key {
  return path.length === 1 ? path[0] : [...path];
}

export function getAtPath(value: unknown, path: Path): unknown {
  let current = value;

  for (const segment of path) {
    if (!isRecord(current) && !Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function hasAtPath(value: unknown, path: Path): boolean {
  if (path.length === 0) {
    return value !== undefined;
  }

  let current = value;

  for (const segment of path) {
    if (Array.isArray(current)) {
      const index = Number(segment);

      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return false;
      }

      current = current[index];
      continue;
    }

    if (!isRecord(current) || !(segment in current)) {
      return false;
    }

    current = current[segment];
  }

  return true;
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
      const arrayIndex = Number(segment);

      if (!Number.isInteger(arrayIndex) || arrayIndex < 0) {
        throw new TypeError(`Invalid array index: ${segment}`);
      }

      if (isLast) {
        current[arrayIndex] = nextValue;
        break;
      }

      const child = cloneContainer(current[arrayIndex], path[index + 1]);
      current[arrayIndex] = child;
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
      const arrayIndex = Number(segment);

      if (!Number.isInteger(arrayIndex) || arrayIndex < 0 || arrayIndex >= current.length) {
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
