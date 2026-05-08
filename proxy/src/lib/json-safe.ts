export function toJsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_, item) => {
    if (typeof item === 'bigint') {
      return item.toString();
    }
    return item;
  })) as T;
}
