export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (item !== null) {
      return JSON.parse(item) as T;
    }
  } catch (error) {
    console.error(error);
  }
  return defaultValue;
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(error);
  }
}
