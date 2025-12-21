import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedSearch(
  searchFn: (term: string) => void,
  delay: number = 500
) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedTerm = useDebounce(searchTerm, delay);

  useEffect(() => {
    if (debouncedTerm) {
      searchFn(debouncedTerm);
    }
  }, [debouncedTerm, searchFn]);

  return { searchTerm, setSearchTerm };
}

