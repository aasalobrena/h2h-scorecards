export const chunk = <T>(arr: T[], size: number): T[][] =>
  arr.length <= size
    ? [arr]
    : [arr.slice(0, size), ...chunk(arr.slice(size), size)];

export const times = <T>(n: number, fn: (index: number) => T) =>
  Array.from({ length: n }, (_, index) => fn(index));

export const inRange = <T>(x: T, a: T, b: T) => a <= x && x <= b;
