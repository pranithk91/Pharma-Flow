import { useState, useCallback } from 'react';
import { AxiosResponse } from 'axios';
import { handleApiError } from '../utils/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | null>;
  reset: () => void;
}

interface ApiResponseData<T> {
  data?: T;
  success?: boolean;
}

type ApiFunction<T> = (...args: unknown[]) => Promise<AxiosResponse<ApiResponseData<T> | T>>;

export function useApi<T = unknown>(
  apiFunc: ApiFunction<T>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: unknown[]) => {
      setState({ data: null, loading: true, error: null });
      try {
        const response = await apiFunc(...args);
        // Handle both wrapped and unwrapped responses
        const responseData = response.data as ApiResponseData<T> | T;
        const data = (responseData && typeof responseData === 'object' && 'data' in responseData) 
          ? (responseData as ApiResponseData<T>).data as T
          : responseData as T;
        setState({ data, loading: false, error: null });
        return data;
      } catch (error: unknown) {
        const errorMessage = handleApiError(error);
        setState({ data: null, loading: false, error: errorMessage });
        return null;
      }
    },
    [apiFunc]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

