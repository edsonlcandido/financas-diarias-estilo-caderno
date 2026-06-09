import { ref, watch } from 'vue';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const read = (): T => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  };

  const storedValue = ref<T>(read()) as { value: T };

  watch(
    () => storedValue.value,
    (val) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(val));
      } catch (error) {
        console.error(error);
      }
    },
    { deep: true },
  );

  return storedValue;
}
